import { Worker } from 'bullmq';
import { queueConfig, maxConcurrentJobs } from '../config/queue.js';
import { processWebsiteAnalysis } from './jobs/website-analysis.job.js';
import logger from './utils/logger.js';

const worker = new Worker(
  'website-analysis',
  async (job) => {
    logger.info({ jobId: job.id, data: job.data }, 'Processing analysis job');
    await processWebsiteAnalysis(job);
  },
  {
    ...queueConfig,
    concurrency: maxConcurrentJobs,
  }
);

worker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Analysis job completed');
});

worker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err }, 'Analysis job failed');
});

worker.on('error', (err) => {
  logger.error({ error: err }, 'Worker error');
});

logger.info({ maxConcurrentJobs }, 'BullMQ worker started');

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing worker');
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing worker');
  await worker.close();
  process.exit(0);
});

export default worker;

