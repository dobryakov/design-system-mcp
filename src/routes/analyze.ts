import { Router, Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { Queue } from 'bullmq';
import { queueConfig } from '../../config/queue.js';
import { apiKeyAuthenticator } from '../services/api-key-authenticator.js';
import { generateCorrelationId, getCorrelationId } from '../utils/correlation-id.js';
import logger from '../utils/logger.js';
import { AnalysisRequest, AnalysisResponse } from '../types/analysis-job.js';
import { AppError } from '../middleware/error-handler.js';

const router = Router();
const analysisQueue = new Queue('website-analysis', queueConfig);

// API key authentication middleware
function authenticateApiKey(req: Request, _res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] as string | undefined;
  if (!apiKeyAuthenticator.validate(apiKey)) {
    const error: AppError = new Error('Unauthorized: Invalid or missing API key');
    error.statusCode = 401;
    error.code = 'unauthorized';
    throw error;
  }
  next();
}

// Request validation middleware
function validateAnalysisRequest(req: Request, _res: Response, next: NextFunction): void {
  const { site_name, url } = req.body as AnalysisRequest;

  if (!site_name || typeof site_name !== 'string') {
    const error: AppError = new Error('Invalid request: site_name is required and must be a string');
    error.statusCode = 400;
    error.code = 'invalid_request';
    error.details = { field: 'site_name' };
    throw error;
  }

  // Validate site_name format (filesystem-safe)
  if (!/^[a-zA-Z0-9_-]+$/.test(site_name)) {
    const error: AppError = new Error(
      'Invalid request: site_name must contain only alphanumeric characters, hyphens, and underscores'
    );
    error.statusCode = 400;
    error.code = 'invalid_request';
    error.details = { field: 'site_name' };
    throw error;
  }

  if (site_name.length > 255) {
    const error: AppError = new Error('Invalid request: site_name must be 255 characters or less');
    error.statusCode = 400;
    error.code = 'invalid_request';
    error.details = { field: 'site_name' };
    throw error;
  }

  if (!url || typeof url !== 'string') {
    const error: AppError = new Error('Invalid request: url is required and must be a string');
    error.statusCode = 400;
    error.code = 'invalid_request';
    error.details = { field: 'url' };
    throw error;
  }

  // Validate URL format
  try {
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      const error: AppError = new Error('Invalid request: url must be HTTP or HTTPS');
      error.statusCode = 400;
      error.code = 'invalid_request';
      error.details = { field: 'url' };
      throw error;
    }
  } catch (e) {
    const error: AppError = new Error('Invalid request: url must be a valid URL');
    error.statusCode = 400;
    error.code = 'invalid_request';
    error.details = { field: 'url' };
    throw error;
  }

  next();
}

router.post('/', authenticateApiKey, validateAnalysisRequest, async (req: Request, res: Response) => {
  const correlationId = getCorrelationId(req.headers) || generateCorrelationId();
  const { site_name, url } = req.body as AnalysisRequest;

  // Generate job ID
  const jobId = randomUUID();

  logger.info(
    {
      jobId,
      site_name,
      url,
      correlationId,
    },
    'Analysis job submitted'
  );

  // Create job data
  const jobData = {
    id: jobId,
    site_name,
    url,
    correlation_id: correlationId,
  };

  // Submit job to queue
  try {
    await analysisQueue.add('analyze-website', jobData, {
      jobId,
      priority: 1,
    });

    const response: AnalysisResponse = {
      job_id: jobId,
      status: 'pending',
      message: 'Analysis job submitted successfully',
      correlation_id: correlationId,
    };

    res.status(202).json(response);
  } catch (error) {
    logger.error({ error, jobId, correlationId }, 'Failed to submit analysis job');
    const appError: AppError = new Error('Failed to submit analysis job');
    appError.statusCode = 500;
    appError.code = 'job_submission_failed';
    throw appError;
  }
});

export default router;

