import { test, expect } from '@playwright/test';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { TEST_SERVER_URL } from '../../fixtures/server.js';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || 'test-api-key';
const TEST_PAGE_URL = `${TEST_SERVER_URL}/fixtures/bootstrap.html`;

test.describe('Bootstrap Component Detection', () => {
  test('should detect Bootstrap components and extract design tokens', async ({ request }) => {
    const siteName = `test-bootstrap-${Date.now()}`;

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

    // Poll for job completion
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
        status = 'completed';
        break;
      }

      const statusData = await statusResponse.json();
      status = statusData.status;
      attempts++;
    }

    expect(status).toBe('completed');

    // Verify design system file
    const designSystemPath = join(process.cwd(), 'designs', siteName, 'design-system.json');
    const designSystemContent = await readFile(designSystemPath, 'utf-8');
    const designSystem = JSON.parse(designSystemContent);

    // Verify Bootstrap patterns were detected
    expect(designSystem.metadata.name).toBe(siteName);
    
    // Check for Bootstrap-specific component patterns
    const hasBootstrapPatterns = 
      designSystem.component && 
      Object.keys(designSystem.component).some(key => 
        key.toLowerCase().includes('button') || 
        key.toLowerCase().includes('card') ||
        key.toLowerCase().includes('form')
      );

    // Bootstrap should be detected via class names or component patterns
    expect(hasBootstrapPatterns || designSystem.libraryPatterns?.includes('bootstrap')).toBeTruthy();
  });
});

