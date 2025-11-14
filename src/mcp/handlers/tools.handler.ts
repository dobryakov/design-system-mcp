import { McpToolsListResponse } from '../../types/mcp.js';
import { getComponent } from './component.handler.js';
import { getDesignTokens, getPatterns, loadDesignSystem } from './design-system.handler.js';
import logger from '../../utils/logger.js';

/**
 * List available MCP tools
 */
export function listTools(): McpToolsListResponse {
  return {
    tools: [
      {
        name: 'get_design_system',
        description: 'Get a design system by site name. Returns the complete design system including metadata, tokens, and components.',
        inputSchema: {
          type: 'object',
          properties: {
            site_name: {
              type: 'string',
              description: 'The site name of the design system to retrieve',
            },
          },
          required: ['site_name'],
        },
      },
      {
        name: 'get_component',
        description: 'Get a specific component definition from a design system by component name.',
        inputSchema: {
          type: 'object',
          properties: {
            site_name: {
              type: 'string',
              description: 'The site name of the design system',
            },
            component_name: {
              type: 'string',
              description: 'The name of the component to retrieve',
            },
          },
          required: ['site_name', 'component_name'],
        },
      },
      {
        name: 'get_tokens',
        description: 'Get design tokens (colors, fonts, spacing, etc.) from a design system.',
        inputSchema: {
          type: 'object',
          properties: {
            site_name: {
              type: 'string',
              description: 'The site name of the design system',
            },
          },
          required: ['site_name'],
        },
      },
      {
        name: 'get_patterns',
        description: 'Get component patterns from a design system.',
        inputSchema: {
          type: 'object',
          properties: {
            site_name: {
              type: 'string',
              description: 'The site name of the design system',
            },
          },
          required: ['site_name'],
        },
      },
      {
        name: 'list_design_systems',
        description: 'List all available design systems by site name.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
}

/**
 * Call an MCP tool
 */
export async function callTool(toolName: string, params: Record<string, unknown>): Promise<unknown> {
  logger.debug({ toolName, params }, 'Calling MCP tool');
  
  switch (toolName) {
    case 'get_design_system': {
      const siteName = params.site_name as string;
      if (!siteName) {
        throw new Error('site_name parameter is required');
      }
      return await loadDesignSystem(siteName);
    }
    
    case 'get_component': {
      const siteName = params.site_name as string;
      const componentName = params.component_name as string;
      if (!siteName || !componentName) {
        throw new Error('site_name and component_name parameters are required');
      }
      return await getComponent(siteName, componentName);
    }
    
    case 'get_tokens': {
      const siteName = params.site_name as string;
      if (!siteName) {
        throw new Error('site_name parameter is required');
      }
      return await getDesignTokens(siteName);
    }
    
    case 'get_patterns': {
      const siteName = params.site_name as string;
      if (!siteName) {
        throw new Error('site_name parameter is required');
      }
      return await getPatterns(siteName);
    }
    
    case 'list_design_systems': {
      const { listDesignSystems } = await import('./design-system.handler.js');
      return await listDesignSystems();
    }
    
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

