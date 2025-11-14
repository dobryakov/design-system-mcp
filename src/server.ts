import express, { Express } from 'express';
import logger from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { corsMiddleware } from './middleware/cors.js';
import { requestLoggerMiddleware } from './middleware/request-logger.js';
import healthRouter from './routes/health.js';
import analyzeRouter from './routes/analyze.js';
import statusRouter from './routes/status.js';
import { maxConcurrentJobs } from '../config/queue.js';
import { getMcpConfig } from '../config/mcp.js';
import { createHttpTransport } from './mcp/transport/http-transport.js';
import './worker.js'; // Start the BullMQ worker

const app: Express = express();
const port = parseInt(process.env.PORT || '3000', 10);
const mcpConfig = getMcpConfig();

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

// MCP Server routes
const mcpRouter = createHttpTransport();
app.use('/mcp', mcpRouter);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start HTTP API server
app.listen(port, () => {
  logger.info(
    {
      port,
      maxConcurrentJobs,
      nodeEnv: process.env.NODE_ENV,
      mcpProtocol: mcpConfig.protocol,
      mcpPort: mcpConfig.port,
    },
    'Server started'
  );
});

// Start MCP server on separate port if different from API port
if (mcpConfig.port !== port) {
  const mcpApp = express();
  mcpApp.use(express.json());
  mcpApp.use(corsMiddleware);
  mcpApp.use(requestLoggerMiddleware);
  mcpApp.use('/', createHttpTransport());
  mcpApp.use(notFoundHandler);
  mcpApp.use(errorHandler);

  mcpApp.listen(mcpConfig.port, mcpConfig.host || '0.0.0.0', () => {
    logger.info(
      {
        protocol: mcpConfig.protocol,
        port: mcpConfig.port,
        host: mcpConfig.host || '0.0.0.0',
      },
      'MCP server started'
    );
  });
}

export default app;

