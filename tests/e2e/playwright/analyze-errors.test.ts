import { test, expect } from '@playwright/test';
import { TEST_SERVER_URL } from '../../fixtures/server.js';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || 'test-api-key';
const TEST_PAGE_URL = `${TEST_SERVER_URL}/fixtures/basic.html`;

test.describe('Error Handling', () => {
  test('should reject invalid URL', async ({ request }) => {
    const analyzeResponse = await request.post(`${API_URL}/analyze`, {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
      data: {
        site_name: 'test-invalid-url',
        url: 'not-a-valid-url',
      },
    });

    expect(analyzeResponse.status()).toBe(400);
    const errorData = await analyzeResponse.json();
    expect(errorData).toHaveProperty('error');
  });

  test('should reject missing API key', async ({ request }) => {
    const analyzeResponse = await request.post(`${API_URL}/analyze`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        site_name: 'test-no-key',
        url: TEST_PAGE_URL,
      },
    });

    expect(analyzeResponse.status()).toBe(401);
  });

  test('should reject invalid API key', async ({ request }) => {
    const analyzeResponse = await request.post(`${API_URL}/analyze`, {
      headers: {
        'X-API-Key': 'invalid-key',
        'Content-Type': 'application/json',
      },
      data: {
        site_name: 'test-invalid-key',
        url: TEST_PAGE_URL,
      },
    });

    expect(analyzeResponse.status()).toBe(401);
  });

  test('should reject missing site_name', async ({ request }) => {
    const analyzeResponse = await request.post(`${API_URL}/analyze`, {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
      data: {
        url: TEST_PAGE_URL,
      },
    });

    expect(analyzeResponse.status()).toBe(400);
  });

  test('should reject missing url', async ({ request }) => {
    const analyzeResponse = await request.post(`${API_URL}/analyze`, {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
      data: {
        site_name: 'test-no-url',
      },
    });

    expect(analyzeResponse.status()).toBe(400);
  });

  test('should handle inaccessible website gracefully', async ({ request }) => {
    const siteName = `test-inaccessible-${Date.now()}`;

    const analyzeResponse = await request.post(`${API_URL}/analyze`, {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
      data: {
        site_name: siteName,
        url: 'http://this-domain-does-not-exist-12345.com',
      },
    });

    expect(analyzeResponse.status()).toBe(202);
    const analyzeData = await analyzeResponse.json();
    const jobId = analyzeData.job_id;

    // Poll for job failure
    let status = 'pending';
    let attempts = 0;
    const maxAttempts = 60;

    while (status !== 'completed' && status !== 'failed' && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const statusResponse = await request.get(`${API_URL}/status/${jobId}`, {
        headers: {
          'X-API-Key': API_KEY,
        },
      });

      if (statusResponse.status() === 404) {
        // Job completed (either success or failure, but was deleted)
        break;
      }

      const statusData = await statusResponse.json();
      status = statusData.status;
      
      if (status === 'failed') {
        expect(statusData).toHaveProperty('error_message');
        break;
      }
      
      attempts++;
    }

    // Job should eventually fail or complete
    expect(['failed', 'completed']).toContain(status);
  });
});

