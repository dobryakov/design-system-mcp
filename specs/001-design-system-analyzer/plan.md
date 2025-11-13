# Implementation Plan: Design System Analyzer

**Branch**: `001-design-system-analyzer` | **Date**: 2025-11-13 | **Spec**: `/specs/001-design-system-analyzer/spec.md`
**Input**: Feature specification from `/specs/001-design-system-analyzer/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

A Ruby on Rails microservice that extracts design systems from websites using Playwright automation and provides an MCP (Model Context Protocol) interface for Cursor IDE integration. The service accepts asynchronous analysis requests via HTTP POST, processes websites to extract design tokens (colors, typography, spacing, components), and makes extracted design systems queryable through an MCP server accessible over HTTP/HTTPS or SSH tunnel.

## Technical Context

**Language/Version**: Ruby 3.3.0, Rails 7.2.0  
**Primary Dependencies**: 
- `playwright-ruby` gem (official Ruby binding for Playwright, requires Node.js runtime)
- Custom MCP server implementation (no mature Ruby library exists)
- Solid Queue (Rails 7.2 native background job processor)
- Puma (Rails default HTTP server)

**Storage**: File system (JSON files in `designs/<site-name>/design-system.json` structure). SQLite database for Solid Queue job storage.  
**Testing**: RSpec with `rspec-rails`, `factory_bot_rails`, `webmock` for HTTP stubbing, Playwright for E2E browser automation testing  
**Target Platform**: Linux server (Docker containers via docker-compose.yml)  
**Project Type**: web (Rails API + MCP server)  
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
  - Minimum 2 containers: primary Rails service (HTTP API + MCP server + background workers) and test container
  - No host dependencies required (Ruby, Playwright, Node.js all in containers)
  - Background workers may be split into separate containers for scaling if needed

- **Principle III (Observability)**: ✅ **COMPLIANT**
  - Structured logging: JSON logging via `lograge` gem with correlation IDs
  - Trace IDs: UUID-based request correlation IDs passed to background jobs
  - Health-check endpoints: `/health` endpoint with service status, queue depth, active job count
  - Metrics: Logged metrics (request duration, job duration, error rates) - can add Prometheus later if needed

- **Principle IV (Configuration & Documentation)**: ✅ **COMPLIANT**
  - All configs use `.env`: API keys, concurrent limit, MCP protocol (HTTP/HTTPS), ports, storage paths
  - Documentation planned: README, quickstart, MCP configuration examples, `curl` examples for API
  - `env.example` will include all required variables with descriptions

- **Principle V (Testing)**: ✅ **COMPLIANT**
  - Unit tests: Rails framework tests inside service container
  - Integration tests: HTTP API tests in dedicated test container
  - E2E tests: Playwright browser tests in test container (with browsers installed)
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
app/
├── controllers/
│   ├── api/
│   │   ├── analyze_controller.rb      # POST /analyze endpoint
│   │   └── status_controller.rb       # GET /status/:job_id endpoint
│   └── health_controller.rb           # GET /health endpoint
├── jobs/
│   └── website_analysis_job.rb        # Async analysis processing
├── services/
│   ├── design_system_extractor.rb     # Playwright-based extraction logic
│   ├── design_token_analyzer.rb       # Token consolidation and analysis
│   └── api_key_authenticator.rb       # API key validation
├── mcp/
│   ├── server.rb                      # MCP server implementation
│   ├── handlers/
│   │   ├── design_system_handler.rb   # Query design systems
│   │   └── component_handler.rb       # Query specific components
│   └── transport/
│       ├── http_transport.rb          # HTTP/HTTPS transport
│       └── stdio_transport.rb         # SSH tunnel stdio transport
└── models/
    └── analysis_job.rb                # Job status tracking (in-memory or file-based)

config/
├── routes.rb                          # API routes
├── initializers/
│   └── mcp_server.rb                  # MCP server configuration
└── docker-compose.yml                 # Container orchestration

lib/
└── design_system/
    ├── token.rb                       # Design token data structure
    ├── component.rb                   # Component data structure
    └── serializer.rb                  # JSON serialization

scripts/
└── analyze.sh                         # CLI wrapper for analysis

spec/ or test/
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

**Structure Decision**: Rails API application structure with:
- Standard Rails MVC pattern for HTTP API endpoints
- Service objects for business logic (extraction, analysis, authentication)
- Background jobs for async processing
- MCP server module with transport abstraction (HTTP/HTTPS/stdio)
- File-based storage for design systems (mounted volume)
- Separate test directories for unit, integration, and e2e tests

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
