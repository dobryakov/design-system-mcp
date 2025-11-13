import Redis from 'ioredis';
import { ConnectionOptions } from 'bullmq';

const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';

// Parse Redis URL to connection options for BullMQ
function parseRedisUrl(url: string): ConnectionOptions {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port || '6379', 10),
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    };
  } catch {
    // Fallback to default
    return {
      host: 'redis',
      port: 6379,
      maxRetriesPerRequest: 3,
    };
  }
}

export const redisConnection: ConnectionOptions = parseRedisUrl(redisUrl);

// Create a Redis client instance for direct use if needed
// Use parsed connection options to ensure correct host/port
const connectionOptions = redisConnection as { host?: string; port?: number; maxRetriesPerRequest?: number; retryStrategy?: (times: number) => number | null };
export const redisClient = new Redis({
  host: connectionOptions.host || 'redis',
  port: connectionOptions.port || 6379,
  maxRetriesPerRequest: connectionOptions.maxRetriesPerRequest || 3,
  retryStrategy: connectionOptions.retryStrategy,
});

export const queueConfig = {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
      count: 1000, // Keep max 1000 completed jobs
    },
    removeOnFail: {
      age: 86400, // Keep failed jobs for 24 hours
    },
  },
};

export const maxConcurrentJobs = parseInt(process.env.MAX_CONCURRENT_ANALYSES || '5', 10);
