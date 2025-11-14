import { promises as fs } from 'fs';
import path from 'path';
import { listTools, callTool } from '../../../src/mcp/handlers/tools.handler.js';
import { DesignSystem } from '../../../src/types/design-system.js';

const DESIGNS_DIR = process.env.DESIGNS_DIR || './designs';
const TEST_SITE_NAME = 'test-site';

describe('MCP Tools Handler', () => {
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
        spacing: {
          small: {
            value: '8px',
          },
        },
      },
      component: {
        Button: {
          base: {
            backgroundColor: {
              value: '{global.color.primary.value}',
            },
          },
          variant: {
            primary: {
              backgroundColor: {
                value: '{global.color.primary.value}',
              },
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

  describe('listTools', () => {
    it('should return list of available tools', () => {
      const result = listTools();
      
      expect(result).toBeDefined();
      expect(result.tools).toBeInstanceOf(Array);
      expect(result.tools.length).toBeGreaterThan(0);
      
      // Check for expected tools
      const toolNames = result.tools.map((tool) => tool.name);
      expect(toolNames).toContain('get_design_system');
      expect(toolNames).toContain('get_component');
      expect(toolNames).toContain('get_tokens');
      expect(toolNames).toContain('get_patterns');
      expect(toolNames).toContain('list_design_systems');
    });

    it('should return tools with proper schema', () => {
      const result = listTools();
      
      result.tools.forEach((tool) => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        expect(tool.inputSchema).toHaveProperty('type');
        expect(tool.inputSchema.type).toBe('object');
      });
    });
  });

  describe('callTool', () => {
    it('should call get_design_system tool', async () => {
      const result = await callTool('get_design_system', {
        site_name: TEST_SITE_NAME,
      });

      expect(result).toBeDefined();
      expect((result as DesignSystem).metadata.name).toBe(TEST_SITE_NAME);
      expect((result as DesignSystem).global).toBeDefined();
    });

    it('should call get_component tool', async () => {
      const result = await callTool('get_component', {
        site_name: TEST_SITE_NAME,
        component_name: 'Button',
      });

      expect(result).toBeDefined();
      expect((result as any).base).toBeDefined();
      expect((result as any).variant).toBeDefined();
    });

    it('should call get_tokens tool', async () => {
      const result = await callTool('get_tokens', {
        site_name: TEST_SITE_NAME,
      });

      expect(result).toBeDefined();
      expect((result as any).color).toBeDefined();
      expect((result as any).spacing).toBeDefined();
    });

    it('should call get_patterns tool', async () => {
      const result = await callTool('get_patterns', {
        site_name: TEST_SITE_NAME,
      });

      expect(result).toBeDefined();
      expect((result as any).Button).toBeDefined();
    });

    it('should call list_design_systems tool', async () => {
      const result = await callTool('list_design_systems', {});

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect((result as string[])).toContain(TEST_SITE_NAME);
    });

    it('should throw error for unknown tool', async () => {
      await expect(
        callTool('unknown_tool', {})
      ).rejects.toThrow('Unknown tool');
    });

    it('should throw error for missing required parameters', async () => {
      await expect(
        callTool('get_design_system', {})
      ).rejects.toThrow('site_name parameter is required');
    });

    it('should throw error for non-existent design system', async () => {
      await expect(
        callTool('get_design_system', {
          site_name: 'non-existent-site',
        })
      ).rejects.toThrow('Design system not found');
    });

    it('should throw error for non-existent component', async () => {
      await expect(
        callTool('get_component', {
          site_name: TEST_SITE_NAME,
          component_name: 'NonExistentComponent',
        })
      ).rejects.toThrow('Component not found');
    });
  });
});

