import { Router, Request, Response, NextFunction } from 'express';
import { apiKeyAuthenticator } from '../services/api-key-authenticator.js';
import { redisClient } from '../../config/queue.js';
import logger from '../utils/logger.js';
import { JobStatusResponse } from '../types/analysis-job.js';
import { AppError } from '../middleware/error-handler.js';

const router = Router();
const JOB_STATUS_PREFIX = 'job:status:';

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

router.get('/:job_id', authenticateApiKey, async (req: Request, res: Response) => {
  const { job_id } = req.params;
  const correlationId = (req as Request & { correlationId?: string }).correlationId;

  logger.debug({ job_id, correlationId }, 'Job status requested');

  try {
    // Retrieve job status from Redis
    const statusKey = `${JOB_STATUS_PREFIX}${job_id}`;
    const jobStatusJson = await redisClient.get(statusKey);

    if (!jobStatusJson) {
      const error: AppError = new Error('Job not found');
      error.statusCode = 404;
      error.code = 'job_not_found';
      throw error;
    }

    const jobStatus = JSON.parse(jobStatusJson) as JobStatusResponse;

    res.status(200).json(jobStatus);
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    logger.error({ error, job_id, correlationId }, 'Failed to retrieve job status');
    const appError = new Error('Failed to retrieve job status') as AppError;
    appError.statusCode = 500;
    appError.code = 'status_retrieval_failed';
    throw appError;
  }
});

export default router;

