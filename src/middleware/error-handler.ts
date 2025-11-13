import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const correlationId = (req as Request & { correlationId?: string }).correlationId;

  logger.error(
    {
      err,
      correlationId,
      path: req.path,
      method: req.method,
    },
    'Request error'
  );

  res.status(statusCode).json({
    error: err.code || 'internal_error',
    message: err.message || 'Internal server error',
    details: err.details,
    correlation_id: correlationId,
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  const correlationId = (req as Request & { correlationId?: string }).correlationId;
  res.status(404).json({
    error: 'not_found',
    message: `Route ${req.method} ${req.path} not found`,
    correlation_id: correlationId,
  });
}

