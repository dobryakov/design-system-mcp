# Implementation Plan: Design System Analyzer

**Branch**: `001-design-system-analyzer` | **Date**: 2025-11-13 | **Spec**: `/specs/001-design-system-analyzer/spec.md`
**Input**: Feature specification from `/specs/001-design-system-analyzer/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

A Node.js/TypeScript microservice that extracts design systems from websites using Playwright automation and provides an MCP (Model Context Protocol) interface for Cursor IDE integration. The service accepts asynchronous analysis requests via HTTP POST, processes websites to extract design tokens (colors, typography, spacing, components), and makes extracted design systems queryable through an MCP server accessible over HTTP/HTTPS or SSH tunnel.

## Technical Context

**Language/Version**: Node.js 20.x LTS, TypeScript 5.5.x  
**Primary Dependencies**: 
- `playwright` npm package (official Node.js package, native integration)
- Custom MCP server implementation in TypeScript (JSON-RPC 2.0 based)
- BullMQ with Redis (background job processing)
- Express.js (HTTP server framework)

**Storage**: File system (JSON files in `designs/<site-name>/design-system.json` structure). Redis for BullMQ job storage.  
**Testing**: Jest with TypeScript support, `@playwright/test` for E2E browser automation testing, `supertest` for API testing  
**Target Platform**: Linux server (Docker containers via docker-compose.yml)  
**Project Type**: web (Node.js/TypeScript API + MCP server)  
**Performance Goals**: 
- Analysis jobs complete within 60 seconds for typical websites (under 50 pages)
- Status endpoint responds within 1 second
- MCP queries return results within 5 seconds of analysis completion

**Constraints**: 
- Async processing with immediate 202 Accepted response
- Configurable maximum concurrent analysis jobs (environment variable)
- Job status information deleted immediately after completion
- API key authentication required for all endpoints
- Support HTTP and HTTPS protocols for MCP (configurable)

**Scale/Scope**: 
- Multiple design systems (one per site name)
- Multiple concurrent analyses (configurable limit, queued when exceeded)
- Remote MCP server access via HTTP/HTTPS or SSH tunnel

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with the project constitution (`.specify/memory/constitution.md`):

- **Principle I (Microservice Architecture)**: ✅ **COMPLIANT**
  - REST API design: `/analyze` endpoint uses POST with proper HTTP status codes (202 Accepted, 401 Unauthorized, 404 Not Found)
  - Idempotency: Analysis requests are idempotent (same site name + URL = overwrite previous result)
  - Proper HTTP status codes: 202 (async accepted), 401 (auth error), 404 (job not found), 500 (server error)

- **Principle II (Containerization)**: ✅ **COMPLIANT**
  - All components run in Docker containers via `docker-compose.yml`
  - Minimum 2 containers: primary Node.js service (HTTP API + MCP server + background workers) and test container
  - Redis container for BullMQ job queue (can be shared or separate)
  - No host dependencies required (Node.js, Playwright browsers all in containers)
  - Background workers may be split into separate containers for scaling if needed

- **Principle III (Observability)**: ✅ **COMPLIANT**
  - Structured logging: JSON logging via `pino` logger with correlation IDs
  - Trace IDs: UUID-based request correlation IDs passed to background jobs
  - Health-check endpoints: `/health` endpoint with service status, queue depth, active job count
  - Metrics: Logged metrics (request duration, job duration, error rates) - can add Prometheus later if needed

- **Principle IV (Configuration & Documentation)**: ✅ **COMPLIANT**
  - All configs use `.env`: API keys, concurrent limit, MCP protocol (HTTP/HTTPS), ports, storage paths
  - Documentation planned: README, quickstart, MCP configuration examples, `curl` examples for API
  - `env.example` will include all required variables with descriptions

- **Principle V (Testing)**: ✅ **COMPLIANT**
  - Unit tests: Jest tests inside service container
  - Integration tests: HTTP API tests with Jest + Supertest in dedicated test container
  - E2E tests: Playwright browser tests with `@playwright/test` in test container (with browsers installed)
  - Test containers connected via shared `docker-compose.yml`

**Post-Design Re-evaluation (Phase 1 Complete)**: ✅ **ALL PRINCIPLES COMPLIANT**
- All clarifications resolved in research.md
- Data model, API contracts, and quickstart documentation created
- All constitutional requirements met with concrete implementation plans
- No violations requiring justification

Any violations must be justified in the Complexity Tracking table below.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── server.ts                          # Express app entry point
├── routes/
│   ├── analyze.ts                     # POST /analyze endpoint
│   ├── status.ts                      # GET /status/:job_id endpoint
│   └── health.ts                      # GET /health endpoint
├── jobs/
│   └── website-analysis.job.ts        # BullMQ job processor
├── services/
│   ├── design-system-extractor.ts     # Playwright-based extraction logic (includes library component detection)
│   ├── design-token-analyzer.ts       # Token consolidation and analysis
│   └── api-key-authenticator.ts       # API key validation
├── mcp/
│   ├── server.ts                      # MCP server implementation
│   ├── handlers/
│   │   ├── design-system.handler.ts   # Query design systems
│   │   └── component.handler.ts       # Query specific components
│   └── transport/
│       ├── http-transport.ts          # HTTP/HTTPS transport
│       └── stdio-transport.ts         # SSH tunnel stdio transport
├── types/
│   ├── analysis-job.ts                # Job status types
│   ├── design-system.ts               # Design system data types
│   └── mcp.ts                         # MCP protocol types
└── utils/
    ├── logger.ts                      # Pino logger setup
    └── correlation-id.ts              # Correlation ID utilities

config/
├── queue.ts                           # BullMQ configuration
├── mcp.ts                             # MCP server configuration
└── docker-compose.yml                 # Container orchestration

scripts/
└── analyze.sh                         # CLI wrapper for analysis

tests/
├── unit/
│   ├── services/
│   └── jobs/
├── integration/
│   ├── api/
│   └── mcp/
└── e2e/
    └── playwright/                    # Browser automation tests

designs/                               # Persistent storage (volume mount)
└── <site-name>/
    └── design-system.json
```

**Structure Decision**: Node.js/TypeScript application structure with:
- Express.js routes for HTTP API endpoints
- Service modules for business logic (extraction, analysis, authentication)
- BullMQ jobs for async processing
- MCP server module with transport abstraction (HTTP/HTTPS/stdio)
- TypeScript types for type safety
- File-based storage for design systems (mounted volume)
- Separate test directories for unit, integration, and e2e tests

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
