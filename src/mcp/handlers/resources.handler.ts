import { McpResource, McpResourcesListResponse } from '../../types/mcp.js';
import { listDesignSystems } from './design-system.handler.js';
import { loadDesignSystem } from './design-system.handler.js';

/**
 * List available MCP resources (design systems)
 */
export async function listResources(): Promise<McpResourcesListResponse> {
  const designSystems = await listDesignSystems();
  
  const resources: McpResource[] = designSystems.map((siteName) => ({
    uri: `design-system://${siteName}`,
    name: siteName,
    description: `Design system for ${siteName}`,
    mimeType: 'application/json',
  }));
  
  return {
    resources,
  };
}

/**
 * Read a resource (design system) by URI
 */
export async function readResource(uri: string): Promise<unknown> {
  // Parse URI format: design-system://<site-name>
  if (!uri.startsWith('design-system://')) {
    throw new Error(`Invalid resource URI format: ${uri}. Expected format: design-system://<site-name>`);
  }
  
  const siteName = uri.replace('design-system://', '');
  if (!siteName) {
    throw new Error('Site name is required in resource URI');
  }
  
  return await loadDesignSystem(siteName);
}

