import { test, expect } from '@playwright/test';
import { TEST_SERVER_URL_FOR_API } from '../../fixtures/server.js';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || 'test-api-key';
// Use URL that API container can access (test-server hostname in Docker)
const TEST_PAGE_URL = `${TEST_SERVER_URL_FOR_API}/fixtures/basic.html`;
const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT_ANALYSES || '5', 10);

test.describe('Concurrent Job Limit Enforcement', () => {
  test('should queue jobs when concurrent limit is reached', async ({ request }) => {
    // Submit multiple jobs simultaneously
    const jobPromises = Array.from({ length: MAX_CONCURRENT + 2 }, (_, i) => {
      return request.post(`${API_URL}/analyze`, {
        headers: {
          'X-API-Key': API_KEY,
          'Content-Type': 'application/json',
        },
        data: {
          site_name: `test-concurrent-${Date.now()}-${i}`,
          url: TEST_PAGE_URL,
        },
      });
    });

    const responses = await Promise.all(jobPromises);

    // All should be accepted (202)
    responses.forEach((response) => {
      expect(response.status()).toBe(202);
    });

    const jobIds = await Promise.all(
      responses.map(async (response) => {
        const data = await response.json();
        return data.job_id;
      })
    );

    // Check status of all jobs
    const statusPromises = jobIds.map((jobId) => {
      return request.get(`${API_URL}/status/${jobId}`, {
        headers: {
          'X-API-Key': API_KEY,
        },
      });
    });

    const statusResponses = await Promise.all(statusPromises);
    const statuses = await Promise.all(
      statusResponses.map(async (response) => {
        if (response.status() === 404) {
          return 'deleted';
        }
        const data = await response.json();
        return data.status;
      })
    );

    // Some jobs should be queued (not all can be in-progress at once)
    const queuedCount = statuses.filter((s) => s === 'queued').length;
    const inProgressCount = statuses.filter((s) => s === 'in-progress').length;
    const completedCount = statuses.filter((s) => s === 'completed' || s === 'deleted').length;

    // At most MAX_CONCURRENT jobs should be in-progress
    expect(inProgressCount).toBeLessThanOrEqual(MAX_CONCURRENT);

    // If limit is reached, some should be queued
    if (inProgressCount >= MAX_CONCURRENT) {
      expect(queuedCount + completedCount).toBeGreaterThan(0);
    }
  });
});

