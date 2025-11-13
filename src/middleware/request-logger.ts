import { Request, Response, NextFunction } from 'express';
import pinoHttp from 'pino-http';
import logger from '../utils/logger.js';
import { getCorrelationId } from '../utils/correlation-id.js';

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const correlationId = getCorrelationId(req.headers);
  (req as Request & { correlationId: string }).correlationId = correlationId;
  res.setHeader('X-Request-ID', correlationId);

  const httpLogger = pinoHttp({
    logger,
    genReqId: () => correlationId,
    customLogLevel: (_req, res, err) => {
      if (res.statusCode >= 400 && res.statusCode < 500) {
        return 'warn';
      } else if (res.statusCode >= 500 || err) {
        return 'error';
      }
      return 'info';
    },
    customSuccessMessage: (req, res) => {
      return `${req.method} ${req.url} - ${res.statusCode}`;
    },
    customErrorMessage: (req, res, err) => {
      return `${req.method} ${req.url} - ${res.statusCode} - ${err?.message}`;
    },
  });

  httpLogger(req, res);
  next();
}

