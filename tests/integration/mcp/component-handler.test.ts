import { promises as fs } from 'fs';
import path from 'path';
import { getComponent, listComponents } from '../../../src/mcp/handlers/component.handler.js';
import { DesignSystem } from '../../../src/types/design-system.js';

const DESIGNS_DIR = process.env.DESIGNS_DIR || './designs';
const TEST_SITE_NAME = 'test-component-site';

describe('MCP Component Handler', () => {
  const testDesignSystemPath = path.join(DESIGNS_DIR, TEST_SITE_NAME);

  beforeAll(async () => {
    // Create test design system with components
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
      component: {
        Button: {
          base: {
            backgroundColor: {
              value: '{global.color.primary.value}',
            },
            padding: {
              value: '12px 24px',
            },
          },
          variant: {
            primary: {
              backgroundColor: {
                value: '{global.color.primary.value}',
              },
            },
            secondary: {
              backgroundColor: {
                value: '#6c757d',
              },
            },
          },
          state: {
            hover: {
              opacity: {
                value: '0.9',
              },
            },
            disabled: {
              opacity: {
                value: '0.5',
              },
            },
          },
          size: {
            small: {
              padding: {
                value: '8px 16px',
              },
            },
            large: {
              padding: {
                value: '16px 32px',
              },
            },
          },
        },
        Card: {
          base: {
            backgroundColor: {
              value: '#ffffff',
            },
            borderRadius: {
              value: '8px',
            },
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

  describe('getComponent', () => {
    it('should return component definition', async () => {
      const result = await getComponent(TEST_SITE_NAME, 'Button');

      expect(result).toBeDefined();
      expect(result.base).toBeDefined();
      expect(result.variant).toBeDefined();
      expect(result.state).toBeDefined();
      expect(result.size).toBeDefined();
    });

    it('should return component with all properties', async () => {
      const result = await getComponent(TEST_SITE_NAME, 'Button');

      expect(result.base?.backgroundColor).toBeDefined();
      expect(result.variant?.primary).toBeDefined();
      expect(result.variant?.secondary).toBeDefined();
      expect(result.state?.hover).toBeDefined();
      expect(result.state?.disabled).toBeDefined();
      expect(result.size?.small).toBeDefined();
      expect(result.size?.large).toBeDefined();
    });

    it('should return component without optional properties', async () => {
      const result = await getComponent(TEST_SITE_NAME, 'Card');

      expect(result.base).toBeDefined();
      expect(result.variant).toBeUndefined();
      expect(result.state).toBeUndefined();
      expect(result.size).toBeUndefined();
    });

    it('should throw error for non-existent component', async () => {
      await expect(
        getComponent(TEST_SITE_NAME, 'NonExistentComponent')
      ).rejects.toThrow('Component not found');
    });

    it('should throw error for non-existent design system', async () => {
      await expect(
        getComponent('non-existent-site', 'Button')
      ).rejects.toThrow('Design system not found');
    });
  });

  describe('listComponents', () => {
    it('should return list of component names', async () => {
      const result = await listComponents(TEST_SITE_NAME);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toContain('Button');
      expect(result).toContain('Card');
    });

    it('should return empty array if no components exist', async () => {
      // Create a design system without components
      const noComponentsPath = path.join(DESIGNS_DIR, 'no-components-list-site');
      await fs.mkdir(noComponentsPath, { recursive: true });
      
      const noComponentsSystem: DesignSystem = {
        $schema: 'https://design-tokens.org/schema/v1.1.json',
        metadata: {
          name: 'no-components-list-site',
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
        path.join(noComponentsPath, 'design-system.json'),
        JSON.stringify(noComponentsSystem, null, 2),
        'utf-8'
      );

      const result = await listComponents('no-components-list-site');
      expect(result).toEqual([]);

      // Cleanup
      await fs.rm(noComponentsPath, { recursive: true, force: true });
    });

    it('should throw error for non-existent design system', async () => {
      await expect(
        listComponents('non-existent-site')
      ).rejects.toThrow('Design system not found');
    });
  });
});

