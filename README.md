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

### Submit Analysis Request

```bash
curl -X POST http://localhost:3000/analyze \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "site_name": "example",
    "url": "https://example.com"
  }'
```

### Check Job Status

```bash
curl http://localhost:3000/status/<job-id> \
  -H "X-API-Key: your-api-key"
```

### Using CLI Script

```bash
./scripts/analyze.sh example https://example.com
```

## MCP Server Configuration

See [Quickstart Guide](./specs/001-design-system-analyzer/quickstart.md) for detailed MCP configuration instructions for Cursor IDE.

## Development

### Install Dependencies

```bash
npm install
```

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

