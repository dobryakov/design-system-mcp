import { test, expect } from '@playwright/test';
import { TEST_SERVER_URL_FOR_API } from '../../fixtures/server.js';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || 'test-api-key';
// Use URL that API container can access (test-server hostname in Docker)
const TEST_PAGE_URL = `${TEST_SERVER_URL_FOR_API}/fixtures/basic.html`;

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

  test('should reject empty site_name', async ({ request }) => {
    const analyzeResponse = await request.post(`${API_URL}/analyze`, {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
      data: {
        site_name: '',
        url: TEST_PAGE_URL,
      },
    });

    expect(analyzeResponse.status()).toBe(400);
    const errorData = await analyzeResponse.json();
    expect(errorData).toHaveProperty('error');
    expect(errorData.message || errorData.error).toContain('site_name');
  });

  test('should reject site_name with special characters', async ({ request }) => {
    const specialChars = ['test@site', 'test.site', 'test site', 'test#site', 'test$site', 'test%site'];
    
    for (const siteName of specialChars) {
      const analyzeResponse = await request.post(`${API_URL}/analyze`, {
        headers: {
          'X-API-Key': API_KEY,
          'Content-Type': 'application/json',
        },
        data: {
          site_name: siteName,
          url: TEST_PAGE_URL,
        },
      });

      expect(analyzeResponse.status()).toBe(400);
      const errorData = await analyzeResponse.json();
      expect(errorData).toHaveProperty('error');
      expect(errorData.message || errorData.error).toContain('site_name');
      expect(errorData.message || errorData.error).toContain('alphanumeric');
    }
  });

  test('should reject site_name that is too long', async ({ request }) => {
    // Create a site_name longer than 255 characters
    const longSiteName = 'a'.repeat(256);
    
    const analyzeResponse = await request.post(`${API_URL}/analyze`, {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
      data: {
        site_name: longSiteName,
        url: TEST_PAGE_URL,
      },
    });

    expect(analyzeResponse.status()).toBe(400);
    const errorData = await analyzeResponse.json();
    expect(errorData).toHaveProperty('error');
    expect(errorData.message || errorData.error).toContain('site_name');
    expect(errorData.message || errorData.error).toContain('255');
  });

  test('should accept valid site_name at maximum length', async ({ request }) => {
    // Create a site_name exactly 255 characters (should be valid)
    const maxLengthSiteName = 'a'.repeat(255);
    
    const analyzeResponse = await request.post(`${API_URL}/analyze`, {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
      data: {
        site_name: maxLengthSiteName,
        url: TEST_PAGE_URL,
      },
    });

    // Should accept (202) or fail later in processing, but not reject due to validation
    expect([202, 400]).toContain(analyzeResponse.status());
    // If it's 400, it should not be due to length validation
    if (analyzeResponse.status() === 400) {
      const errorData = await analyzeResponse.json();
      expect(errorData.message || errorData.error).not.toContain('255');
    }
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

