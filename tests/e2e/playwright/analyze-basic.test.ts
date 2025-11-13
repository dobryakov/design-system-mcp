import { test, expect } from '@playwright/test';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { TEST_SERVER_URL } from '../../fixtures/server.js';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || 'test-api-key';
const TEST_PAGE_URL = `${TEST_SERVER_URL}/fixtures/basic.html`;

test.describe('Basic Page Analysis', () => {
  test('should analyze a basic HTML page and generate design system', async ({ request }) => {
    const siteName = `test-basic-${Date.now()}`;

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
    expect(analyzeData).toHaveProperty('job_id');
    expect(analyzeData.status).toBe('pending');

    const jobId = analyzeData.job_id;

    // Poll for job completion
    let status = 'pending';
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds timeout

    while (status !== 'completed' && status !== 'failed' && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second

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
      status = statusData.status;
      attempts++;
    }

    expect(status).toBe('completed');

    // Verify design system file was created
    const designSystemPath = join(process.cwd(), 'designs', siteName, 'design-system.json');
    const designSystemContent = await readFile(designSystemPath, 'utf-8');
    const designSystem = JSON.parse(designSystemContent);

    // Verify structure
    expect(designSystem).toHaveProperty('$schema');
    expect(designSystem).toHaveProperty('metadata');
    expect(designSystem.metadata.name).toBe(siteName);
    expect(designSystem).toHaveProperty('global');

    // Verify tokens were extracted
    expect(designSystem.global).toHaveProperty('color');
    expect(designSystem.global).toHaveProperty('font');
    expect(designSystem.global).toHaveProperty('spacing');
  });
});

