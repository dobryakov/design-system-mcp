import * as readline from 'readline';
import { McpRequest, McpResponse } from '../../types/mcp.js';
import { mcpServer } from '../server.js';
import logger from '../../utils/logger.js';

/**
 * stdio transport for MCP server (for SSH tunnel)
 * Reads JSON-RPC 2.0 requests from stdin and writes responses to stdout
 */
export class StdioTransport {
  private rl: readline.Interface;
  private apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.API_KEY;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });
  }

  /**
   * Start listening for requests on stdin
   */
  start(): void {
    logger.info('MCP stdio transport started');

    this.rl.on('line', async (line: string) => {
      try {
        // Parse JSON-RPC request
        const request: McpRequest = JSON.parse(line);

        // Process request
        const response: McpResponse = await mcpServer.processRequest(request, this.apiKey);

        // Write response to stdout
        console.log(JSON.stringify(response));
      } catch (error) {
        logger.error({ error, line }, 'Error processing stdio MCP request');
        
        const errorResponse: McpResponse = {
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32700,
            message: error instanceof Error ? error.message : 'Parse error',
          },
        };
        
        console.log(JSON.stringify(errorResponse));
      }
    });

    this.rl.on('close', () => {
      logger.info('MCP stdio transport closed');
      process.exit(0);
    });
  }

  /**
   * Stop listening
   */
  stop(): void {
    this.rl.close();
  }
}

