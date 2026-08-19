# design-system-mcp

An **async MCP server** that extracts design tokens (colors, typography, spacing, components) from a live website and serves them to an AI IDE (Cursor). Long operations go into a job queue and return immediately — no blocking tool calls.

## Why async

A naive MCP server does the work synchronously: the agent calls a tool and waits. Fine for fast operations; wrong for long ones (browser automation, page crawling, ML inference) — you get timeouts, no horizontal scaling, and one heavy request holding a connection. This server splits **submit** from **result**: submit returns a job ID instantly, status is polled separately.

## Architecture

- **Submit returns a job ID immediately**, non-blocking; status is polled by ID.
- **Playwright in a container** does the actual site analysis, isolated — the host's `node_modules` is explicitly excluded from the image.
- **Redis under the queue** — task persistence and concurrency (`MAX_CONCURRENT_ANALYSES`, default 5).
- **HTTP API on port 3000** (`PORT`), **MCP on port 3001** (`MCP_PORT`): HTTP / HTTPS / SSH tunnel — flexible deploy and Cursor integration.

## Job lifecycle

```
POST /analyze              → 202 {"job_id": "…", "status": "pending"}
GET  /status/<job_id>      → 200 {"status": "in-progress", …}
GET  /status/<job_id>      → 200 {"status": "completed", "result_location": "designs/…/design-system.json"}
GET  /status/<job_id>      → 404   # status key is dropped ~5s after completed/failed
```

The result itself is a JSON file on disk (`result_location`), not the status payload. After completion the Redis status key is deleted on a short delay: a later poll returns 404 (completed, failed, or never existed). Collect `result_location` while the job is still `completed`, or read the file under `designs/`.

## Quickstart

```bash
cp .env.example .env          # set API_KEYS, PORT, MCP_PORT, MCP_PROTOCOL, etc.
docker-compose up --build     # redis + api (ports 3000 and 3001)
curl http://localhost:3000/health
# point Cursor's MCP config at http://localhost:3001 (see below)
```

## Stack

TypeScript · Docker / Compose · Redis · Playwright (E2E) · Jest.

## Trade-offs (by design)

- **404 after completion.** Job status is deleted shortly after the worker marks `completed` or `failed`. No long-lived job history in Redis — poll until you see `completed` (and `result_location`), do not come back “some time later” for status.
- **Max 5 concurrent** (`MAX_CONCURRENT_ANALYSES`) protects against overload; under a spike, jobs queue — the client needs a backpressure contract.

## Features

- **Website Analysis**: Automatically extract design tokens (colors, typography, spacing, components) from websites
- **Async Processing**: Submit analysis requests and track job status
- **MCP Integration**: Query design systems via MCP protocol from Cursor IDE
- **CLI Support**: Command-line interface for triggering analyses
- **Docker Ready**: Fully containerized with docker-compose

## Usage

### API Endpoints

HTTP API listens on **port 3000** by default. Send `X-API-Key` on `/analyze` and `/status`.

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
Job status is deleted shortly after completion or failure. If you get 404, the job has completed, failed, or never existed.

#### Health Check

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

The MCP (Model Context Protocol) server allows Cursor IDE to query design systems directly. The server runs on port 3001 by default (configurable via `MCP_PORT`).

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

See [Quickstart Guide](./specs/001-design-system-analyzer/quickstart.md) and [MCP_USAGE.md](./MCP_USAGE.md) for more detailed configuration examples.

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
