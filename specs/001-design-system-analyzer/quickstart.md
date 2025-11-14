# Quickstart Guide: Design System Analyzer

**Date**: 2025-11-13  
**Purpose**: Get the service up and running quickly

## Prerequisites

- Docker and Docker Compose installed
- Git (for cloning repository)
- At least 4GB RAM available for Docker containers

## Quick Setup

### 1. Clone and Navigate

```bash
git clone <repository-url>
cd design-system-mcp
```

### 2. Configure Environment

Copy the example environment file and configure API keys:

```bash
cp env.example .env
```

Edit `.env` and set required variables:

```bash
# API Keys (comma-separated list)
API_KEYS=your-api-key-1,your-api-key-2

# Analysis Configuration
MAX_CONCURRENT_ANALYSES=5

# MCP Server Configuration
MCP_PROTOCOL=http  # or https
MCP_PORT=3001

# Storage
DESIGNS_DIR=./designs

# Logging
LOG_LEVEL=info
```

### 3. Build and Start Services

```bash
docker-compose up --build
```

This will:
- Build the Node.js service container
- Build the test container
- Start Redis for BullMQ job queue
- Start the Node.js API server on port 3000
- Start the MCP server on port 3001 (if configured)

### 4. Verify Health

Check that the service is running:

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "design-system-analyzer",
  "version": "1.0.0",
  "uptime_seconds": 10,
  "queue_depth": 0,
  "active_jobs": 0,
  "max_concurrent_jobs": 5
}
```

## Usage Examples

### Submit Analysis Request

```bash
curl -X POST http://localhost:3000/analyze \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key-1" \
  -d '{
    "site_name": "example",
    "url": "https://example.com"
  }'
```

Response:
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "message": "Analysis job submitted successfully",
  "correlation_id": "550e8400-e29b-41d4-a716-446655440001"
}
```

### Check Job Status

```bash
curl http://localhost:3000/status/550e8400-e29b-41d4-a716-446655440000 \
  -H "X-API-Key: your-api-key-1"
```

Response (in-progress):
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

Response (completed):
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

**Note**: After completion, the job status is deleted. Poll the status endpoint before the job completes to capture the result location.

### View Generated Design System

```bash
cat designs/example/design-system.json
```

### Using the CLI Script

```bash
./scripts/analyze.sh example https://example.com
```

The script handles API key authentication and async job polling internally.

## MCP Server Configuration

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
      "args": ["user@remote-server", "cd /path/to/service && bundle exec rails mcp:stdio"],
      "env": {
        "API_KEY": "your-api-key-1"
      }
    }
  }
}
```

## Testing

### Test Infrastructure

The testing setup uses two Docker services with the `test` profile:

#### `test-server` Service

**Purpose**: HTTP server that serves test fixture HTML pages for E2E testing.

**What it does**:
- Runs an Express server on port 3002
- Serves static HTML files from `tests/fixtures/pages/` directory
- Provides test fixture pages: `basic.html`, `bootstrap.html`, `material-ui.html`, `minimal.html`
- Exposes `/health` endpoint for health checks
- Accessible from API container via Docker network at `http://test-server:3002`

**Why it's needed**:
- E2E tests submit URLs from this server to the API for analysis
- The API container (running Playwright) needs to access these pages to analyze them
- Pages are served over Docker network, allowing API container to fetch them during analysis

**Example**:
```javascript
// Test sends this URL to API
const TEST_PAGE_URL = "http://test-server:3002/fixtures/basic.html";
// API container opens this URL via Playwright and analyzes the page
```

#### `test` Service

**Purpose**: Container that runs automated tests (Playwright E2E tests).

**What it does**:
- Executes Playwright E2E tests via `npm test` command
- Runs tests from `tests/e2e/playwright/` directory
- Sends HTTP requests to API container at `http://api:3000`
- Uses test-server URLs when submitting analysis requests
- Waits for `redis`, `api`, and `test-server` services to be healthy before starting

**Dependencies**:
- Requires `redis` service (for API's BullMQ queue)
- Requires `api` service (to send analysis requests)
- Requires `test-server` service (to get fixture page URLs)

**Environment Variables**:
- `API_URL=http://api:3000` - URL for API requests
- `TEST_SERVER_URL=http://localhost:3002` - URL for test container to access test-server
- `TEST_SERVER_URL_FOR_API=http://test-server:3002` - URL that API container uses to access test-server

### Run Unit Tests

```bash
docker-compose --profile test run --rm test npm run test:unit
```

### Run Integration Tests

```bash
docker-compose --profile test run --rm test npm run test:integration
```

### Run E2E Tests

```bash
# Start required services first
docker-compose --profile test up -d redis api test-server

# Run E2E tests
docker-compose --profile test run --rm test npm run test:e2e
```

### Run All Tests

```bash
# Start required services first
docker-compose --profile test up -d redis api test-server

# Run all tests
docker-compose --profile test run --rm test npm test
```

### Test Service Architecture

```
┌─────────────┐
│   test      │  ← Runs Playwright E2E tests
│  (тесты)    │
└──────┬──────┘
       │ HTTP requests
       ↓
┌─────────────┐
│     api     │  ← Main API service
│  (Playwright│     (analyzes pages)
│   analysis) │
└──────┬──────┘
       │ HTTP requests
       ↓
┌─────────────┐
│ test-server │  ← Serves test fixture HTML pages
│  (fixtures) │
└─────────────┘
```

**Note**: Both `test` and `test-server` services use the `test` profile, so they only start when using `docker-compose --profile test`.

## Troubleshooting

### Service Won't Start

1. Check Docker logs:
```bash
docker-compose logs api
docker-compose logs redis
```

2. Verify environment variables:
```bash
docker-compose exec api env | grep -E "API_KEYS|MAX_CONCURRENT"
```

3. Check port availability:
```bash
netstat -tuln | grep -E "3000|3001|6379"
```

4. Verify Redis connection:
```bash
docker-compose exec redis redis-cli ping
```

### Analysis Jobs Failing

1. Check job status for error messages:
```bash
curl http://localhost:3000/status/<job-id> -H "X-API-Key: your-api-key"
```

2. Check service logs:
```bash
docker-compose logs -f api
```

3. Verify Playwright browsers are installed:
```bash
docker-compose exec api npx playwright install
```

### MCP Connection Issues

1. Verify MCP server is running:
```bash
curl http://localhost:3001/health
```

2. Check API key authentication:
```bash
curl http://localhost:3001/mcp/tools/list -H "X-API-Key: your-api-key"
```

3. Review MCP server logs:
```bash
docker-compose logs -f api | grep mcp
```

## Next Steps

- Read the full [API Documentation](./contracts/openapi.yaml)
- Review the [Data Model](./data-model.md)
- Check the [Implementation Plan](./plan.md) for architecture details
- See [Research](./research.md) for technology decisions

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `API_KEYS` | Yes | - | Comma-separated list of valid API keys |
| `MAX_CONCURRENT_ANALYSES` | No | 5 | Maximum concurrent analysis jobs |
| `MCP_PROTOCOL` | No | `http` | MCP server protocol (`http` or `https`) |
| `MCP_PORT` | No | 3001 | MCP server port |
| `DESIGNS_DIR` | No | `./designs` | Directory for storing design system files |
| `LOG_LEVEL` | No | `info` | Logging level (`debug`, `info`, `warn`, `error`) |
| `NODE_ENV` | No | `production` | Node.js environment |
| `REDIS_URL` | No | `redis://redis:6379` | Redis connection URL for BullMQ |
| `PORT` | No | 3000 | HTTP API server port |

## Support

For issues or questions:
- Check service logs: `docker-compose logs -f api`
- Review health endpoint: `curl http://localhost:3000/health`
- Check job status for error details

