import { promises as fs } from 'fs';
import path from 'path';
import { listResources, readResource } from '../../../src/mcp/handlers/resources.handler.js';
import { DesignSystem } from '../../../src/types/design-system.js';

const DESIGNS_DIR = process.env.DESIGNS_DIR || './designs';
const TEST_SITE_NAME = 'test-resources-site';

describe('MCP Resources Handler', () => {
  const testDesignSystemPath = path.join(DESIGNS_DIR, TEST_SITE_NAME);

  beforeAll(async () => {
    // Create test design system
    await fs.mkdir(testDesignSystemPath, { recursive: true });
    
    const testDesignSystem: DesignSystem = {
      $schema: 'https://design-tokens.org/schema/v1.1.json',
      metadata: {
        name: TEST_SITE_NAME,
        version: '1.0.0',
        lastModified: new Date().toISOString(),
      },
      global: {
        color: {
          primary: {
            value: '#007bff',
          },
        },
      },
    };

    await fs.writeFile(
      path.join(testDesignSystemPath, 'design-system.json'),
      JSON.stringify(testDesignSystem, null, 2),
      'utf-8'
    );
  });

  afterAll(async () => {
    // Cleanup test design system
    try {
      await fs.rm(testDesignSystemPath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('listResources', () => {
    it('should return list of available resources', async () => {
      const result = await listResources();
      
      expect(result).toBeDefined();
      expect(result.resources).toBeInstanceOf(Array);
      
      // Should include our test site
      const resourceUris = result.resources.map((r) => r.uri);
      expect(resourceUris).toContain(`design-system://${TEST_SITE_NAME}`);
    });

    it('should return resources with proper structure', async () => {
      const result = await listResources();
      
      result.resources.forEach((resource) => {
        expect(resource).toHaveProperty('uri');
        expect(resource).toHaveProperty('name');
        expect(resource.uri).toMatch(/^design-system:\/\//);
        expect(resource.mimeType).toBe('application/json');
      });
    });
  });

  describe('readResource', () => {
    it('should read resource by URI', async () => {
      const uri = `design-system://${TEST_SITE_NAME}`;
      const result = await readResource(uri);

      expect(result).toBeDefined();
      expect((result as DesignSystem).metadata.name).toBe(TEST_SITE_NAME);
    });

    it('should throw error for invalid URI format', async () => {
      await expect(
        readResource('invalid-uri')
      ).rejects.toThrow('Invalid resource URI format');
    });

    it('should throw error for missing site name in URI', async () => {
      await expect(
        readResource('design-system://')
      ).rejects.toThrow('Site name is required');
    });

    it('should throw error for non-existent design system', async () => {
      await expect(
        readResource('design-system://non-existent-site')
      ).rejects.toThrow('Design system not found');
    });
  });
});

