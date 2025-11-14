import { McpRequest, McpResponse, McpError } from '../types/mcp.js';
import { apiKeyAuthenticator } from '../services/api-key-authenticator.js';
import { listTools, callTool } from './handlers/tools.handler.js';
import { listResources, readResource } from './handlers/resources.handler.js';
import logger from '../utils/logger.js';

/**
 * MCP Server implementation with JSON-RPC 2.0 protocol
 */
export class McpServer {
  /**
   * Process an MCP request and return a response
   */
  async processRequest(request: McpRequest, apiKey?: string): Promise<McpResponse> {
    // Skip API key validation for initialize method (handshake)
    if (request.method !== 'initialize') {
      // Validate API key for all other methods
      if (!apiKeyAuthenticator.validate(apiKey)) {
        return this.createErrorResponse(
          request.id,
          -32001,
          'Unauthorized: Invalid or missing API key'
        );
      }
    }

    // Validate JSON-RPC version
    if (request.jsonrpc !== '2.0') {
      return this.createErrorResponse(
        request.id,
        -32600,
        'Invalid Request: jsonrpc must be "2.0"'
      );
    }

    try {
      const result = await this.handleMethod(request.method, request.params || {});
      return {
        jsonrpc: '2.0',
        id: request.id,
        result,
      };
    } catch (error) {
      logger.error({ error, method: request.method, params: request.params }, 'Error handling MCP request');
      
      const errorMessage = error instanceof Error ? error.message : 'Internal error';
      return this.createErrorResponse(
        request.id,
        -32603,
        `Internal error: ${errorMessage}`
      );
    }
  }

  /**
   * Handle MCP protocol methods
   */
  private async handleMethod(method: string, params: Record<string, unknown>): Promise<unknown> {
    switch (method) {
      case 'initialize':
        // MCP initialize method - returns server capabilities
        return {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {
              listChanged: false,
            },
            resources: {
              subscribe: false,
              listChanged: false,
            },
          },
          serverInfo: {
            name: 'design-system-analyzer',
            version: '1.0.0',
          },
        };
      
      case 'tools/list':
        return listTools();
      
      case 'tools/call': {
        const toolName = params.name as string;
        const toolParams = (params.arguments as Record<string, unknown>) || {};
        if (!toolName) {
          throw new Error('Tool name is required');
        }
        return await callTool(toolName, toolParams);
      }
      
      case 'resources/list':
        return await listResources();
      
      case 'resources/read': {
        const uri = params.uri as string;
        if (!uri) {
          throw new Error('Resource URI is required');
        }
        return await readResource(uri);
      }
      
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  /**
   * Create an error response
   */
  private createErrorResponse(
    id: string | number | null,
    code: number,
    message: string,
    data?: unknown
  ): McpResponse {
    const error: McpError = {
      code,
      message,
    };
    
    if (data !== undefined) {
      error.data = data;
    }
    
    return {
      jsonrpc: '2.0',
      id,
      error,
    };
  }
}

export const mcpServer = new McpServer();

