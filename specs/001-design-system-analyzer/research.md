# Research: Design System Analyzer

**Date**: 2025-11-13  
**Purpose**: Resolve all "NEEDS CLARIFICATION" items from Technical Context

## 1. Node.js and TypeScript Versions

### Decision
- **Node.js**: 20.x LTS (latest LTS as of 2024)
- **TypeScript**: 5.5.x (latest stable as of 2024)

### Rationale
- Node.js 20.x LTS provides long-term support, stability, and performance improvements
- TypeScript 5.5.x offers excellent type safety, modern language features, and tooling
- Both versions are production-ready and widely adopted
- Docker containers allow precise version pinning
- Native async/await support perfect for I/O-intensive operations

### Alternatives Considered
- Node.js 18.x LTS: Stable but missing latest performance improvements
- Node.js 22.x: Too new, may have compatibility issues
- JavaScript without TypeScript: Lacks type safety, harder to maintain

## 2. Playwright Integration

### Decision
- **Library**: `playwright` npm package (official Node.js package)
- **Installation**: Native npm package, no additional runtime needed

### Rationale
- `playwright` is the official Node.js package maintained by Microsoft Playwright team
- Native integration - no bindings or wrappers needed
- Best performance and feature support
- Direct access to all Playwright APIs
- Active development and updates
- Excellent TypeScript support with type definitions

### Alternatives Considered
- Puppeteer: Less maintained, Playwright is the successor with better features
- Selenium: Older, heavier, less modern browser support
- Playwright via Ruby/Python bindings: Adds unnecessary abstraction layer

### Implementation Notes
- Use `npm install playwright` or `yarn add playwright`
- Run `npx playwright install` to install browser binaries
- Use headless mode for containerized environment
- Leverage TypeScript types for better IDE support

## 3. MCP Server Implementation

### Decision
- **Approach**: Custom MCP server implementation in TypeScript
- **Protocol**: Model Context Protocol (MCP) over HTTP/HTTPS and stdio transports
- **Library**: Custom implementation using JSON-RPC 2.0

### Rationale
- MCP protocol is JSON-RPC based, straightforward to implement in TypeScript
- TypeScript provides type safety for protocol messages
- Custom implementation allows full control over transport (HTTP/HTTPS/stdio)
- Can leverage existing Node.js HTTP infrastructure (Express/Fastify)
- Better integration with Cursor IDE (which is also TypeScript-based)

### Alternatives Considered
- Using existing MCP library: May exist in JS ecosystem, but custom gives full control
- Using Python MCP server: Adds another language/runtime dependency
- Waiting for official MCP library: Unclear timeline, blocks development

### Implementation Notes
- Implement MCP protocol handlers for:
  - `tools/list` - List available MCP tools
  - `tools/call` - Execute tool (query design system, get component)
  - `resources/list` - List available design systems
  - `resources/read` - Read design system content
- Support both HTTP/HTTPS (network) and stdio (SSH tunnel) transports
- Use JSON-RPC 2.0 specification for request/response format
- API key authentication required for all MCP requests
- TypeScript interfaces for type-safe protocol messages

## 4. Background Job Processing

### Decision
- **Library**: BullMQ with Redis

### Rationale
- BullMQ is the modern, TypeScript-first successor to Bull
- Excellent performance and reliability
- Built-in job prioritization, rate limiting, and concurrency control
- Redis provides persistent job storage and distributed processing
- Perfect for configurable concurrent job limits
- TypeScript support with full type definitions
- Active development and large community

### Alternatives Considered
- **Bull (legacy)**: Older version, BullMQ is the recommended successor
- **Agenda.js**: MongoDB-based, adds database dependency
- **Bee-Queue**: Simpler but less features, no built-in rate limiting
- **In-memory queue**: Not suitable for production, jobs lost on restart
  - Rejected: Need persistence for long-running analysis jobs

### Implementation Notes
- Use BullMQ with Redis for job queue
- Configure maximum concurrent jobs via environment variable
- Jobs stored in Redis (persistent, can survive restarts)
- Job status tracking in Redis (deleted after completion per spec)
- Separate worker processes can be scaled independently

## 5. HTTP Server Framework

### Decision
- **Framework**: Express.js with TypeScript

### Rationale
- Most popular and mature Node.js web framework
- Excellent TypeScript support
- Large ecosystem of middleware
- Simple and flexible
- Well-documented
- Good performance for API workloads
- Easy to add CORS, authentication middleware

### Alternatives Considered
- **Fastify**: Faster, but smaller ecosystem, less familiar to most developers
  - Could be considered for future optimization
- **NestJS**: More opinionated, adds complexity, overkill for this API
- **Koa**: More modern, but Express is more widely adopted

### Implementation Notes
- Use Express with TypeScript
- Add middleware for:
  - CORS support
  - JSON body parsing
  - API key authentication
  - Request logging with correlation IDs
  - Error handling
- Use TypeScript for type-safe route handlers

## 6. Testing Framework

### Decision
- **Framework**: Jest with TypeScript support

### Rationale
- Most popular testing framework for Node.js
- Excellent TypeScript support
- Built-in mocking, assertions, and test runners
- Good integration with Playwright for E2E tests
- Large ecosystem and community
- Well-documented

### Supporting Libraries
- `jest` - Test framework
- `@types/jest` - TypeScript types for Jest
- `ts-jest` - TypeScript preprocessor for Jest
- `supertest` - HTTP assertion library for API testing
- `playwright` - For E2E browser automation tests
- `@playwright/test` - Playwright test runner

### Alternatives Considered
- **Mocha + Chai**: More flexible but requires more setup
- **Vitest**: Faster, but newer, smaller ecosystem
- **Ava**: Simpler, but less features

## 7. Observability and Logging

### Decision
- **Logging Format**: Structured JSON logging
- **Library**: `pino` (fast JSON logger) or `winston`
- **Trace IDs**: Request correlation IDs (UUID-based)
- **Health Checks**: `/health` endpoint with service status
- **Metrics**: Basic metrics via logging (can add Prometheus later if needed)

### Rationale
- JSON logs are machine-parseable and work well with log aggregation tools
- `pino` is one of the fastest Node.js loggers, perfect for high-throughput APIs
- Correlation IDs allow tracking requests through async job processing
- Health checks required for container orchestration and monitoring
- Start simple, add metrics infrastructure later if needed

### Implementation Details

#### Structured Logging
- Use `pino` for structured JSON logging
- Include: timestamp, level, message, request_id, job_id, user_id (if applicable)
- Format: JSON for production, pretty-printed for development
- Use `pino-http` middleware for automatic request logging

#### Trace/Correlation IDs
- Generate UUID for each incoming request (stored in `X-Request-ID` header or generated)
- Pass correlation ID to background jobs via job metadata
- Include correlation ID in all log entries
- Allow clients to provide correlation ID via header

#### Health Check Endpoint
- `GET /health` - Returns 200 OK with service status
- Include: service name, version, uptime, job queue depth, active job count
- Use for container health checks and monitoring

#### Metrics (Future)
- Log key metrics: request duration, job duration, error rates
- Can add Prometheus exporter (`prom-client`) later if needed
- For now, metrics can be extracted from structured logs

### Alternatives Considered
- **Winston**: More features, but slower than pino
- **Bunyan**: Good, but pino is faster and more modern
- **APM tools** (New Relic, Datadog): Overkill for initial implementation
  - Can add later if needed
- **Prometheus metrics**: Adds complexity, defer to later phase

## 8. Project Structure and Build Tools

### Decision
- **Package Manager**: npm or yarn
- **Build Tool**: TypeScript compiler (`tsc`) or `tsx` for development
- **Linting**: ESLint with TypeScript plugin
- **Formatting**: Prettier

### Rationale
- npm/yarn are standard for Node.js projects
- TypeScript compiler is mature and reliable
- ESLint + Prettier provide code quality and consistency
- Standard tooling familiar to most Node.js developers

### Implementation Notes
- Use `tsconfig.json` for TypeScript configuration
- Use `eslint` with `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin`
- Use `prettier` for code formatting
- Use `tsx` or `ts-node` for development (direct TypeScript execution)
- Build to `dist/` directory for production

## Summary

All "NEEDS CLARIFICATION" items have been resolved with concrete technology choices:

1. ✅ Node.js 20.x LTS, TypeScript 5.5.x
2. ✅ Native `playwright` npm package
3. ✅ Custom MCP server implementation in TypeScript
4. ✅ BullMQ with Redis for background jobs
5. ✅ Express.js for HTTP server
6. ✅ Jest for testing
7. ✅ Pino for structured JSON logging with correlation IDs, `/health` endpoint
8. ✅ Standard Node.js tooling (npm/yarn, ESLint, Prettier)

All decisions align with Node.js/TypeScript best practices, leverage native Playwright integration, and support the requirements for containerized deployment, async processing, and MCP server functionality.
