/**
 * MCP Server Configuration
 */

export interface McpConfig {
  protocol: 'http' | 'https';
  port: number;
  host?: string;
}

export function getMcpConfig(): McpConfig {
  const protocol = (process.env.MCP_PROTOCOL || 'http') as 'http' | 'https';
  const port = parseInt(process.env.MCP_PORT || '3001', 10);
  const host = process.env.MCP_HOST || '0.0.0.0';

  return {
    protocol,
    port,
    host,
  };
}

