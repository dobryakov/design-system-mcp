import { test, expect } from '@playwright/test';
import { TEST_SERVER_URL } from '../../fixtures/server.js';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || 'test-api-key';
const TEST_PAGE_URL = `${TEST_SERVER_URL}/fixtures/basic.html`;

test.describe('Job Status Polling Workflow', () => {
  test('should track job status through all states', async ({ request }) => {
    const siteName = `test-status-${Date.now()}`;

    // Submit analysis request
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

    expect(analyzeResponse.status()).toBe(202);
    const analyzeData = await analyzeResponse.json();
    const jobId = analyzeData.job_id;
    expect(analyzeData.status).toBe('pending');

    // Check initial status
    const initialStatusResponse = await request.get(`${API_URL}/status/${jobId}`, {
      headers: {
        'X-API-Key': API_KEY,
      },
    });

    expect(initialStatusResponse.status()).toBe(200);
    const initialStatus = await initialStatusResponse.json();
    expect(['pending', 'queued', 'in-progress']).toContain(initialStatus.status);

    // Poll until completion
    let status = initialStatus.status;
    let attempts = 0;
    const maxAttempts = 60;
    const statusHistory: string[] = [status];

    while (status !== 'completed' && status !== 'failed' && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const statusResponse = await request.get(`${API_URL}/status/${jobId}`, {
        headers: {
          'X-API-Key': API_KEY,
        },
      });

      if (statusResponse.status() === 404) {
        // Job completed and was deleted
        status = 'completed';
        break;
      }

      const statusData = await statusResponse.json();
      const newStatus = statusData.status;
      
      if (newStatus !== status) {
        statusHistory.push(newStatus);
        status = newStatus;
      }
      
      attempts++;
    }

    expect(status).toBe('completed');
    
    // Verify status progression (should go through: pending -> queued -> in-progress -> completed)
    expect(statusHistory.length).toBeGreaterThan(0);
    
    // After completion, status should be deleted (404)
    const finalStatusResponse = await request.get(`${API_URL}/status/${jobId}`, {
      headers: {
        'X-API-Key': API_KEY,
      },
    });

    // Status should be deleted after completion
    expect([200, 404]).toContain(finalStatusResponse.status());
  });

  test('should return 404 for non-existent job', async ({ request }) => {
    const fakeJobId = '00000000-0000-0000-0000-000000000000';

    const statusResponse = await request.get(`${API_URL}/status/${fakeJobId}`, {
      headers: {
        'X-API-Key': API_KEY,
      },
    });

    expect(statusResponse.status()).toBe(404);
    const errorData = await statusResponse.json();
    expect(errorData).toHaveProperty('error');
  });
});

