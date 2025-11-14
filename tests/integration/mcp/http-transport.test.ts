import request from 'supertest';
import express from 'express';
import { createHttpTransport } from '../../../src/mcp/transport/http-transport.js';
import { McpRequest } from '../../../src/types/mcp.js';

describe('MCP HTTP Transport', () => {
  let app: express.Application;
  const validApiKey = 'test-api-key';

  beforeAll(() => {
    // Set up test API key
    process.env.API_KEYS = validApiKey;
  });

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/mcp', createHttpTransport());
  });

  afterAll(() => {
    delete process.env.API_KEYS;
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
        .send('invalid json');

      expect(response.status).toBe(400);
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
      expect(response.body.result).toBeDefined();
      expect(response.body.result.tools).toBeInstanceOf(Array);
      expect(response.body.result.tools.length).toBeGreaterThan(0);
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
      expect(response.body.result).toBeDefined();
      expect(response.body.result.resources).toBeInstanceOf(Array);
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
      expect(response.body.error.code).toBe(-32603);
      expect(response.body.error.message).toContain('Unknown method');
    });
  });
});

