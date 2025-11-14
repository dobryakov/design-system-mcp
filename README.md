# Design System Analyzer

A Node.js/TypeScript microservice that extracts design systems from websites using Playwright automation and provides an MCP (Model Context Protocol) interface for Cursor IDE integration.

## Features

- **Website Analysis**: Automatically extract design tokens (colors, typography, spacing, components) from websites
- **Async Processing**: Submit analysis requests and track job status
- **MCP Integration**: Query design systems via MCP protocol from Cursor IDE
- **CLI Support**: Command-line interface for triggering analyses
- **Docker Ready**: Fully containerized with docker-compose

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- At least 4GB RAM available for Docker containers

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd design-system-mcp
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env and set your API keys
```

3. Build and start services:
```bash
docker-compose up --build
```

4. Verify health:
```bash
curl http://localhost:3000/health
```

## Usage

### API Endpoints

#### Submit Analysis Request

Submit a website for analysis. Returns immediately with a job ID.

```bash
curl -X POST http://localhost:3000/analyze \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "site_name": "example",
    "url": "https://example.com"
  }'
```

**Response (202 Accepted):**
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "message": "Analysis job submitted successfully",
  "correlation_id": "550e8400-e29b-41d4-a716-446655440001"
}
```

#### Check Job Status

Get the current status of an analysis job.

```bash
curl http://localhost:3000/status/550e8400-e29b-41d4-a716-446655440000 \
  -H "X-API-Key: your-api-key"
```

**Response (200 OK - In Progress):**
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "in-progress",
  "site_name": "example",
  "url": "https://example.com",
  "submitted_at": "2025-11-13T10:00:00Z",
  "started_at": "2025-11-13T10:00:05Z"
}
```

**Response (200 OK - Completed):**
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "site_name": "example",
  "url": "https://example.com",
  "submitted_at": "2025-11-13T10:00:00Z",
  "started_at": "2025-11-13T10:00:05Z",
  "completed_at": "2025-11-13T10:00:45Z",
  "result_location": "designs/example/design-system.json"
}
```

**Response (404 Not Found):**
Job status is deleted immediately after completion. If you get 404, the job has completed or failed.

#### Health Check

Check service health and queue status.

```bash
curl http://localhost:3000/health
```

**Response (200 OK):**
```json
{
  "status": "healthy",
  "service": "design-system-analyzer",
  "version": "1.0.0",
  "uptime_seconds": 3600,
  "queue_depth": 2,
  "active_jobs": 1,
  "max_concurrent_jobs": 5
}
```

### Using CLI Script

The CLI script handles job submission and status polling automatically:

```bash
./scripts/analyze.sh example https://example.com
```

Or with API key as argument:

```bash
./scripts/analyze.sh example https://example.com your-api-key
```

### Error Responses

All endpoints return standard error responses:

**401 Unauthorized:**
```json
{
  "error": "Unauthorized: Invalid or missing API key",
  "code": "unauthorized"
}
```

**400 Bad Request:**
```json
{
  "error": "Invalid request: site_name is required",
  "code": "validation_error"
}
```

**404 Not Found:**
```json
{
  "error": "Job not found",
  "code": "not_found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error",
  "code": "internal_error"
}
```

## MCP Server Configuration

The MCP (Model Context Protocol) server allows Cursor IDE to query design systems directly. The server runs on port 3001 by default (configurable via `MCP_PORT` environment variable).

### For Cursor IDE (HTTP)

Add to your Cursor IDE MCP configuration:

```json
{
  "mcpServers": {
    "design-system-analyzer": {
      "url": "http://localhost:3001",
      "apiKey": "your-api-key-1"
    }
  }
}
```

### For Cursor IDE (HTTPS)

For remote servers with HTTPS:

```json
{
  "mcpServers": {
    "design-system-analyzer": {
      "url": "https://your-server.com:3001",
      "apiKey": "your-api-key-1"
    }
  }
}
```

Set `MCP_PROTOCOL=https` in your `.env` file and configure SSL certificates.

### For Cursor IDE (SSH Tunnel)

1. Establish SSH tunnel:
```bash
ssh -L 3001:localhost:3001 user@remote-server
```

2. Configure Cursor IDE to use local stdio:
```json
{
  "mcpServers": {
    "design-system-analyzer": {
      "command": "ssh",
      "args": ["user@remote-server", "cd /path/to/service && node dist/src/mcp/transport/stdio-transport.js"],
      "env": {
        "API_KEY": "your-api-key-1"
      }
    }
  }
}
```

### Troubleshooting

- **Connection refused**: Verify MCP server is running on the configured port
- **Unauthorized**: Check that your API key matches the `API_KEYS` environment variable
- **Timeout**: Ensure network connectivity and firewall rules allow access to the MCP port

See [Quickstart Guide](./specs/001-design-system-analyzer/quickstart.md) for more detailed configuration examples.

## Development

### Install Dependencies

**Note**: For Docker-based development, you don't need to install dependencies on the host. All dependencies are installed in containers.

If you want to develop locally without Docker:

```bash
npm install
```

**Important**: 
- `node_modules` on the host is not used by containers
- Test containers use isolated `node_modules` via anonymous Docker volumes
- The `api` container uses `node_modules` from the Docker image (production dependencies only)
- If you have `node_modules` on the host, it's safe to delete it when using Docker

### Run Tests

Tests run in Docker containers. The test infrastructure includes:
- **`test-server`**: Serves test fixture HTML pages on port 3002
- **`test`**: Runs Playwright E2E tests

```bash
# Start test infrastructure
docker-compose --profile test up -d redis api test-server

# All tests
docker-compose --profile test run --rm test npm test

# Unit tests only
docker-compose --profile test run --rm test npm run test:unit

# Integration tests
docker-compose --profile test run --rm test npm run test:integration

# E2E tests
docker-compose --profile test run --rm test npm run test:e2e
```

See [Quickstart Guide - Testing](./specs/001-design-system-analyzer/quickstart.md#testing) for detailed information about test services.

### Linting and Formatting

```bash
# Lint
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## Documentation

- [Specification](./specs/001-design-system-analyzer/spec.md)
- [Implementation Plan](./specs/001-design-system-analyzer/plan.md)
- [Quickstart Guide](./specs/001-design-system-analyzer/quickstart.md)
- [API Contract](./specs/001-design-system-analyzer/contracts/openapi.yaml)

## License

MIT

