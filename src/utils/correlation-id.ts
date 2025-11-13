import { randomUUID } from 'crypto';

/**
 * Generate a new correlation ID (UUID v4)
 */
export function generateCorrelationId(): string {
  return randomUUID();
}

/**
 * Extract correlation ID from request headers or generate a new one
 */
export function getCorrelationId(headers: Record<string, string | string[] | undefined>): string {
  const headerValue = headers['x-request-id'] || headers['x-correlation-id'];
  if (typeof headerValue === 'string') {
    return headerValue;
  }
  if (Array.isArray(headerValue) && headerValue.length > 0) {
    return headerValue[0];
  }
  return generateCorrelationId();
}

