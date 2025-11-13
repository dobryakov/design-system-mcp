import { Job } from 'bullmq';
import { chromium, Browser, Page } from 'playwright';
import { promises as fs } from 'fs';
import path from 'path';
import logger from '../utils/logger.js';
import { DesignSystemExtractor } from '../services/design-system-extractor.js';
import { DesignTokenAnalyzer } from '../services/design-token-analyzer.js';
import { redisClient } from '../../config/queue.js';
import { AnalysisJob, JobStatus } from '../types/analysis-job.js';

const JOB_STATUS_PREFIX = 'job:status:';
const DESIGNS_DIR = process.env.DESIGNS_DIR || './designs';
const ANALYSIS_TIMEOUT = parseInt(process.env.ANALYSIS_TIMEOUT || '60000', 10); // 60 seconds default
const MAX_ELEMENTS = parseInt(process.env.MAX_ELEMENTS || '10000', 10);

interface JobData {
  id: string;
  site_name: string;
  url: string;
  correlation_id: string;
}

async function updateJobStatus(jobId: string, status: JobStatus, updates: Partial<AnalysisJob>): Promise<void> {
  const statusKey = `${JOB_STATUS_PREFIX}${jobId}`;
  const existingStatus = await redisClient.get(statusKey);
  let jobStatus: AnalysisJob;

  if (existingStatus) {
    jobStatus = JSON.parse(existingStatus);
  } else {
    // This shouldn't happen, but create a basic status if missing
    jobStatus = {
      id: jobId,
      status: 'pending',
      site_name: '',
      url: '',
      submitted_at: new Date().toISOString(),
      correlation_id: '',
    };
  }

  jobStatus.status = status;
  Object.assign(jobStatus, updates);

  await redisClient.set(statusKey, JSON.stringify(jobStatus));
}

async function deleteJobStatus(jobId: string): Promise<void> {
  const statusKey = `${JOB_STATUS_PREFIX}${jobId}`;
  await redisClient.del(statusKey);
}

export async function processWebsiteAnalysis(job: Job<JobData>): Promise<void> {
  const { id: jobId, site_name, url, correlation_id } = job.data;
  let browser: Browser | null = null;
  let page: Page | null = null;

  const logContext = { jobId, site_name, url, correlation_id };

  try {
    logger.info(logContext, 'Starting website analysis');

    // Update status to in-progress
    await updateJobStatus(jobId, 'in-progress', {
      started_at: new Date().toISOString(),
    });

    // Launch browser
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    page = await context.newPage();

    // Set timeout for page load
    page.setDefaultTimeout(ANALYSIS_TIMEOUT);

    // Navigate to URL
    logger.debug(logContext, 'Navigating to URL');
    try {
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: ANALYSIS_TIMEOUT,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new Error(`Website load timeout: Page took longer than ${ANALYSIS_TIMEOUT}ms to load`);
      }
      if (error instanceof Error && error.message.includes('net::ERR')) {
        throw new Error(`Website inaccessible: ${error.message}`);
      }
      throw error;
    }

    // Check for bot protection
    const pageContent = await page.content();
    const botIndicators = [
      'cloudflare',
      'captcha',
      'access denied',
      'bot detection',
      'please verify you are human',
    ];
    const lowerContent = pageContent.toLowerCase();
    if (botIndicators.some((indicator) => lowerContent.includes(indicator))) {
      logger.warn(logContext, 'Bot protection detected');
      // Continue anyway - might still be able to extract some tokens
    }

    // Extract design system
    logger.debug(logContext, 'Extracting design system');
    const extractor = new DesignSystemExtractor(page, MAX_ELEMENTS);
    const extractedData = await extractor.extract();

    // Analyze and consolidate tokens
    logger.debug(logContext, 'Analyzing design tokens');
    const analyzer = new DesignTokenAnalyzer();
    const designSystem = analyzer.analyze(extractedData, site_name);

    // Save design system to file
    const designsPath = path.join(DESIGNS_DIR, site_name);
    await fs.mkdir(designsPath, { recursive: true });
    const designSystemPath = path.join(designsPath, 'design-system.json');
    await fs.writeFile(designSystemPath, JSON.stringify(designSystem, null, 2), 'utf-8');

    logger.info({ ...logContext, designSystemPath }, 'Design system saved');

    // Update status to completed
    await updateJobStatus(jobId, 'completed', {
      completed_at: new Date().toISOString(),
      result_location: designSystemPath,
    });

    // Delete job status after a short delay (to allow status endpoint to retrieve it)
    setTimeout(async () => {
      await deleteJobStatus(jobId);
      logger.debug(logContext, 'Job status deleted after completion');
    }, 5000);

    logger.info(logContext, 'Website analysis completed successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ ...logContext, error }, 'Website analysis failed');

    // Update status to failed
    await updateJobStatus(jobId, 'failed', {
      completed_at: new Date().toISOString(),
      error_message: errorMessage,
    });

    // Delete job status after a short delay
    setTimeout(async () => {
      await deleteJobStatus(jobId);
      logger.debug(logContext, 'Job status deleted after failure');
    }, 5000);

    throw error;
  } finally {
    // Cleanup
    if (page) {
      await page.close().catch((err) => logger.error({ err }, 'Error closing page'));
    }
    if (browser) {
      await browser.close().catch((err) => logger.error({ err }, 'Error closing browser'));
    }
  }
}

