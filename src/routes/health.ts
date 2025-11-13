import { Router, Response } from 'express';
import { Queue } from 'bullmq';
import { redisConnection } from '../../config/queue.js';
import logger from '../utils/logger.js';

const router = Router();

let startTime: number;
let analysisQueue: Queue | null = null;

// Initialize start time
if (typeof process.uptime === 'function') {
  startTime = Date.now() - process.uptime() * 1000;
} else {
  startTime = Date.now();
}

// Initialize queue for health checks
try {
  analysisQueue = new Queue('website-analysis', { connection: redisConnection });
} catch (error) {
  // Queue initialization may fail if Redis is not available
  // Health check will report unhealthy in that case
}

router.get('/', async (_req, res: Response) => {
  try {
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

    let queueDepth = 0;
    let activeJobs = 0;

    if (analysisQueue) {
      try {
        const [waiting, active] = await Promise.all([
          analysisQueue.getWaitingCount(),
          analysisQueue.getActiveCount(),
        ]);
        queueDepth = waiting;
        activeJobs = active;
      } catch (error) {
        // Redis connection error - report unhealthy
        logger.error({ error }, 'Redis connection failed in health check');
        return res.status(503).json({
          status: 'unhealthy',
          service: 'design-system-analyzer',
          version: '1.0.0',
          error: 'Redis connection failed',
        });
      }
    }

    const maxConcurrentJobs = parseInt(process.env.MAX_CONCURRENT_ANALYSES || '5', 10);

    const healthStatus = {
      status: 'healthy' as const,
      service: 'design-system-analyzer',
      version: '1.0.0',
      uptime_seconds: uptimeSeconds,
      queue_depth: queueDepth,
      active_jobs: activeJobs,
      max_concurrent_jobs: maxConcurrentJobs,
    };

    return res.status(200).json(healthStatus);
  } catch (error) {
    return res.status(503).json({
      status: 'unhealthy',
      service: 'design-system-analyzer',
      version: '1.0.0',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

