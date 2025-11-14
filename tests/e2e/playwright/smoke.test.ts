import { test, expect } from '@playwright/test';
import { TEST_SERVER_URL_FOR_API } from '../../fixtures/server.js';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || 'test-api-key';
// Use URL that API container can access (test-server hostname in Docker)
const TEST_PAGE_URL = `${TEST_SERVER_URL_FOR_API}/fixtures/basic.html`;

test.describe('Smoke Test', () => {
  test('should respond to health check', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`);
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('status');
  });

  test('should reject request without API key', async ({ request }) => {
    const response = await request.post(`${API_URL}/analyze`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        site_name: 'test',
        url: TEST_PAGE_URL,
      },
    });
    expect(response.status()).toBe(401);
  });

  test('should reject invalid URL format', async ({ request }) => {
    const response = await request.post(`${API_URL}/analyze`, {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
      data: {
        site_name: 'test',
        url: 'not-a-valid-url',
      },
    });
    expect(response.status()).toBe(400);
  });
});

