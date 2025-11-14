import { Router, Request, Response } from 'express';
import { McpRequest, McpResponse } from '../../types/mcp.js';
import { mcpServer } from '../server.js';
import logger from '../../utils/logger.js';

/**
 * HTTP/HTTPS transport for MCP server
 */
export function createHttpTransport(): Router {
  const router = Router();

  // MCP endpoint - accepts JSON-RPC 2.0 requests
  router.post('/', async (req: Request, res: Response) => {
    // Try to get API key from multiple sources:
    // 1. X-API-Key header
    // 2. Authorization header (Bearer token)
    // 3. apiKey in request body params (for MCP protocol)
    let apiKey = req.headers['x-api-key'] as string | undefined;
    if (!apiKey && req.headers['authorization']) {
      const authHeader = req.headers['authorization'] as string;
      if (authHeader.startsWith('Bearer ')) {
        apiKey = authHeader.substring(7);
      }
    }
    const correlationId = req.headers['x-correlation-id'] as string | undefined;

    try {
      // Validate request body
      if (!req.body || typeof req.body !== 'object') {
        res.status(400).json({
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32600,
            message: 'Invalid Request: Request body must be a JSON object',
          },
        });
        return;
      }

      const mcpRequest: McpRequest = req.body;

      // If API key is in request params (MCP protocol specific), use it
      if (!apiKey && mcpRequest.params && typeof mcpRequest.params === 'object' && 'apiKey' in mcpRequest.params) {
        apiKey = mcpRequest.params.apiKey as string;
      }

      // Log request
      logger.info(
        {
          correlationId,
          method: mcpRequest.method,
          id: mcpRequest.id,
          hasApiKey: !!apiKey,
        },
        'MCP request received'
      );

      // Process request
      const response: McpResponse = await mcpServer.processRequest(mcpRequest, apiKey);

      // Log response
      logger.info(
        {
          correlationId,
          method: mcpRequest.method,
          id: mcpRequest.id,
          hasError: !!response.error,
        },
        'MCP response sent'
      );

      // Send response
      res.json(response);
    } catch (error) {
      logger.error({ error, correlationId }, 'Error processing MCP request');
      
      const errorResponse: McpResponse = {
        jsonrpc: '2.0',
        id: req.body?.id || null,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error',
        },
      };
      
      res.status(500).json(errorResponse);
    }
  });

  return router;
}

