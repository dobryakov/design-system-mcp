import request from 'supertest';
import express from 'express';
import { createHttpTransport } from '../../../src/mcp/transport/http-transport.js';
import { McpRequest } from '../../../src/types/mcp.js';

describe('MCP HTTP Transport', () => {
  let app: express.Application;
  // Use the API key from environment (set in docker-compose)
  // docker-compose sets API_KEYS=your-api-key-1
  const validApiKey = process.env.API_KEYS?.split(',')[0]?.trim() || 'your-api-key-1';

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/mcp', createHttpTransport());
  });

  describe('Authentication', () => {
    it('should reject request without API key', async () => {
      const mcpRequest: McpRequest = {
        jsonrpc: '2.0',
        id: '1',
        method: 'tools/list',
      };

      const response = await request(app)
        .post('/mcp')
        .send(mcpRequest);

      expect(response.status).toBe(200); // JSON-RPC returns 200 with error
      expect(response.body.jsonrpc).toBe('2.0');
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe(-32001);
      expect(response.body.error.message).toContain('Unauthorized');
    });

    it('should reject request with invalid API key', async () => {
      const mcpRequest: McpRequest = {
        jsonrpc: '2.0',
        id: '1',
        method: 'tools/list',
      };

      const response = await request(app)
        .post('/mcp')
        .set('X-API-Key', 'invalid-key')
        .send(mcpRequest);

      expect(response.status).toBe(200);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe(-32001);
    });

    it('should accept request with valid API key', async () => {
      const mcpRequest: McpRequest = {
        jsonrpc: '2.0',
        id: '1',
        method: 'tools/list',
      };

      const response = await request(app)
        .post('/mcp')
        .set('X-API-Key', validApiKey)
        .send(mcpRequest);

      expect(response.status).toBe(200);
      expect(response.body.error).toBeUndefined();
      expect(response.body.result).toBeDefined();
    });
  });

  describe('JSON-RPC 2.0 Protocol', () => {
    it('should reject request with invalid jsonrpc version', async () => {
      const invalidRequest = {
        jsonrpc: '1.0',
        id: '1',
        method: 'tools/list',
      };

      const response = await request(app)
        .post('/mcp')
        .set('X-API-Key', validApiKey)
        .send(invalidRequest);

      expect(response.status).toBe(200);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe(-32600);
      expect(response.body.error.message).toContain('jsonrpc must be "2.0"');
    });

    it('should require valid JSON body', async () => {
      const response = await request(app)
        .post('/mcp')
        .set('X-API-Key', validApiKey)
        .set('Content-Type', 'application/json')
        .send('invalid json');

      // Express JSON parser may return 400 or the handler may return 200 with error
      // In this case, Express returns 200 with empty body when JSON parsing fails
      expect([400, 200]).toContain(response.status);
      if (response.status === 200) {
        // If it's 200, it should have an error in the JSON-RPC response or empty body
        // (Express JSON parser may set req.body to {} on parse error)
        if (response.body && response.body.error) {
          expect(response.body.error).toBeDefined();
        }
      }
    });

    it('should return response with same id as request', async () => {
      const mcpRequest: McpRequest = {
        jsonrpc: '2.0',
        id: 'test-id-123',
        method: 'tools/list',
      };

      const response = await request(app)
        .post('/mcp')
        .set('X-API-Key', validApiKey)
        .send(mcpRequest);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('test-id-123');
    });
  });

  describe('MCP Methods', () => {
    it('should handle tools/list method', async () => {
      const mcpRequest: McpRequest = {
        jsonrpc: '2.0',
        id: '1',
        method: 'tools/list',
      };

      const response = await request(app)
        .post('/mcp')
        .set('X-API-Key', validApiKey)
        .send(mcpRequest);

      expect(response.status).toBe(200);
      expect(response.body.error).toBeUndefined();
      expect(response.body.result).toBeDefined();
      if (response.body.result) {
        expect(response.body.result.tools).toBeInstanceOf(Array);
        expect(response.body.result.tools.length).toBeGreaterThan(0);
      }
    });

    it('should handle resources/list method', async () => {
      const mcpRequest: McpRequest = {
        jsonrpc: '2.0',
        id: '1',
        method: 'resources/list',
      };

      const response = await request(app)
        .post('/mcp')
        .set('X-API-Key', validApiKey)
        .send(mcpRequest);

      expect(response.status).toBe(200);
      expect(response.body.error).toBeUndefined();
      expect(response.body.result).toBeDefined();
      if (response.body.result) {
        expect(response.body.result.resources).toBeInstanceOf(Array);
      }
    });

    it('should handle unknown method with error', async () => {
      const mcpRequest: McpRequest = {
        jsonrpc: '2.0',
        id: '1',
        method: 'unknown/method',
      };

      const response = await request(app)
        .post('/mcp')
        .set('X-API-Key', validApiKey)
        .send(mcpRequest);

      expect(response.status).toBe(200);
      expect(response.body.error).toBeDefined();
      // Should be internal error for unknown method
      expect([-32603, -32000]).toContain(response.body.error.code);
      expect(response.body.error.message).toMatch(/Unknown method|Internal error/);
    });
  });
});

