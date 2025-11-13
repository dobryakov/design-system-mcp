# Research: Design System Analyzer

**Date**: 2025-11-13  
**Purpose**: Resolve all "NEEDS CLARIFICATION" items from Technical Context

## 1. Ruby and Rails Versions

### Decision
- **Ruby**: 3.3.0 (latest stable as of 2024)
- **Rails**: 7.2.0 (latest stable as of 2024)

### Rationale
- Ruby 3.3.0 provides performance improvements, better memory management, and YJIT improvements
- Rails 7.2.0 includes Solid Queue (native background job processing), improved API mode, and better async support
- Both versions are production-ready and widely adopted
- Docker containers allow precise version pinning

### Alternatives Considered
- Ruby 3.2.x: Stable but missing latest performance improvements
- Rails 7.1.x: Stable but missing Solid Queue integration
- Ruby 3.4+ / Rails 8.0+: Too new, may have compatibility issues

## 2. Playwright Integration

### Decision
- **Library**: `playwright-ruby` gem (official Ruby binding for Playwright)
- **Installation**: Requires Node.js and Playwright browsers in Docker container

### Rationale
- `playwright-ruby` is the official Ruby binding maintained by Microsoft Playwright team
- Provides native Ruby API while using Node.js Playwright under the hood
- Better integration with Ruby codebase than shelling out to Node.js scripts
- Supports all Playwright features (browser automation, screenshots, network interception)

### Alternatives Considered
- Shelling out to Node.js Playwright: More complex error handling, harder to integrate
- Capybara with Selenium: Less modern, heavier, doesn't support modern browser features as well
- Puppeteer Ruby gem: Less maintained, Playwright is the successor

### Implementation Notes
- Docker container must include Node.js runtime and Playwright browsers
- Use `playwright-ruby` gem with `playwright install` command in Dockerfile
- Consider headless browser mode for containerized environment

## 3. MCP Server Implementation

### Decision
- **Approach**: Custom MCP server implementation in Ruby
- **Protocol**: Model Context Protocol (MCP) over HTTP/HTTPS and stdio transports

### Rationale
- No mature Ruby MCP server library exists as of 2024
- MCP protocol is JSON-RPC based, relatively straightforward to implement
- Custom implementation allows full control over transport (HTTP/HTTPS/stdio)
- Can leverage existing Rails infrastructure (routing, middleware, authentication)

### Alternatives Considered
- Waiting for Ruby MCP library: Unclear timeline, blocks development
- Using Node.js MCP server: Adds complexity, requires separate service
- Using Python MCP server: Adds another language/runtime dependency

### Implementation Notes
- Implement MCP protocol handlers for:
  - `tools/list` - List available MCP tools
  - `tools/call` - Execute tool (query design system, get component)
  - `resources/list` - List available design systems
  - `resources/read` - Read design system content
- Support both HTTP/HTTPS (network) and stdio (SSH tunnel) transports
- Use JSON-RPC 2.0 specification for request/response format
- API key authentication required for all MCP requests

## 4. Background Job Processing

### Decision
- **Library**: Solid Queue (Rails 7.2 native background job processor)

### Rationale
- Native Rails 7.2 integration, no external dependencies (Redis, PostgreSQL)
- File-based or database-backed job storage (can use SQLite for simplicity)
- Built-in job prioritization and concurrency control
- Simpler deployment (no Redis dependency)
- Sufficient for this use case (configurable concurrent limit, job queuing)

### Alternatives Considered
- **Sidekiq**: More mature, requires Redis, better for high-volume scenarios
  - Rejected: Adds Redis dependency, overkill for this use case
- **ActiveJob with async adapter**: Too simple, no persistence, jobs lost on restart
  - Rejected: Not suitable for long-running analysis jobs
- **Delayed Job**: Older, less maintained
  - Rejected: Solid Queue is the modern replacement

### Implementation Notes
- Use Solid Queue for async analysis job processing
- Configure maximum concurrent jobs via environment variable
- Jobs stored in database (SQLite for simplicity, can upgrade to PostgreSQL)
- Job status tracking in-memory or file-based (deleted after completion per spec)

## 5. HTTP Server

### Decision
- **Server**: Puma (Rails default)

### Rationale
- Default Rails web server, well-tested and production-ready
- Supports concurrent request handling (threads + processes)
- Good performance for API workloads
- Easy configuration via `config/puma.rb`
- Supports both HTTP and HTTPS (via reverse proxy or direct TLS)

### Alternatives Considered
- **Unicorn**: Process-based, no threads, less efficient for I/O-bound workloads
  - Rejected: Puma's thread pool better for API + background jobs
- **Passenger**: More complex, requires additional setup
  - Rejected: Puma is simpler and sufficient

### Implementation Notes
- Configure Puma for production (threads, workers)
- Use reverse proxy (nginx/traefik) for HTTPS termination if needed
- Or configure Puma with SSL certificates directly for HTTPS

## 6. Testing Framework

### Decision
- **Framework**: RSpec with supporting libraries

### Rationale
- Most popular testing framework for Rails applications
- Better syntax and DSL for API testing
- Rich ecosystem of matchers and helpers
- Better integration with Rails testing features
- Widely used in Rails community

### Alternatives Considered
- **Minitest**: Rails default, simpler, less DSL
  - Rejected: RSpec provides better readability and ecosystem for API testing
- **Test::Unit**: Older, less feature-rich
  - Rejected: RSpec is more modern and widely adopted

### Supporting Libraries
- `rspec-rails` - RSpec integration for Rails
- `factory_bot_rails` - Test data factories
- `shoulda-matchers` - Additional matchers
- `webmock` / `vcr` - HTTP request stubbing for external website testing
- Playwright for E2E browser tests (in test container)

## 7. Observability and Logging

### Decision
- **Logging Format**: Structured JSON logging
- **Trace IDs**: Request correlation IDs (UUID-based)
- **Health Checks**: `/health` endpoint with service status
- **Metrics**: Basic metrics via logging (can add Prometheus later if needed)

### Rationale
- JSON logs are machine-parseable and work well with log aggregation tools
- Correlation IDs allow tracking requests through async job processing
- Health checks required for container orchestration and monitoring
- Start simple, add metrics infrastructure later if needed

### Implementation Details

#### Structured Logging
- Use `lograge` gem for structured JSON logging
- Include: timestamp, level, message, request_id, job_id, user_id (if applicable)
- Format: JSON for production, human-readable for development

#### Trace/Correlation IDs
- Generate UUID for each incoming request (stored in `X-Request-ID` header or generated)
- Pass correlation ID to background jobs
- Include correlation ID in all log entries
- Allow clients to provide correlation ID via header

#### Health Check Endpoint
- `GET /health` - Returns 200 OK with service status
- Include: service name, version, uptime, job queue depth, active job count
- Use for container health checks and monitoring

#### Metrics (Future)
- Log key metrics: request duration, job duration, error rates
- Can add Prometheus exporter later if needed
- For now, metrics can be extracted from structured logs

### Alternatives Considered
- **Structured logging libraries**: `lograge` is standard for Rails
- **APM tools** (New Relic, Datadog): Overkill for initial implementation
  - Can add later if needed
- **Prometheus metrics**: Adds complexity, defer to later phase

## Summary

All "NEEDS CLARIFICATION" items have been resolved with concrete technology choices:

1. ✅ Ruby 3.3.0, Rails 7.2.0
2. ✅ `playwright-ruby` gem with Node.js runtime
3. ✅ Custom MCP server implementation in Ruby
4. ✅ Solid Queue for background jobs
5. ✅ Puma HTTP server
6. ✅ RSpec for testing
7. ✅ Structured JSON logging with correlation IDs, `/health` endpoint

All decisions align with Rails best practices, minimize external dependencies, and support the requirements for containerized deployment, async processing, and MCP server functionality.

