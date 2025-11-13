import express, { Express } from 'express';
import logger from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { corsMiddleware } from './middleware/cors.js';
import { requestLoggerMiddleware } from './middleware/request-logger.js';
import healthRouter from './routes/health.js';
import analyzeRouter from './routes/analyze.js';
import statusRouter from './routes/status.js';
import { maxConcurrentJobs } from '../config/queue.js';
import './worker.js'; // Start the BullMQ worker

const app: Express = express();
const port = parseInt(process.env.PORT || '3000', 10);

// Validate MAX_CONCURRENT_ANALYSES on startup
if (maxConcurrentJobs <= 0 || isNaN(maxConcurrentJobs)) {
  logger.error(
    { maxConcurrentJobs: process.env.MAX_CONCURRENT_ANALYSES },
    'MAX_CONCURRENT_ANALYSES must be a positive integer'
  );
  process.exit(1);
}

// Middleware
app.use(express.json());
app.use(corsMiddleware);
app.use(requestLoggerMiddleware);

// Routes
app.use('/health', healthRouter);
app.use('/analyze', analyzeRouter);
app.use('/status', statusRouter);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(port, () => {
  logger.info(
    {
      port,
      maxConcurrentJobs,
      nodeEnv: process.env.NODE_ENV,
    },
    'Server started'
  );
});

export default app;

