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
    const apiKey = req.headers['x-api-key'] as string | undefined;
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

      // Log request
      logger.info(
        {
          correlationId,
          method: mcpRequest.method,
          id: mcpRequest.id,
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

