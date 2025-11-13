# Tasks: Design System Analyzer

**Input**: Design documents from `/specs/001-design-system-analyzer/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are OPTIONAL - not explicitly requested in the feature specification, so test tasks are not included. Tests can be added later if needed.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Paths shown below assume single project structure per plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create project structure per implementation plan in plan.md
- [X] T002 Initialize Node.js 20.x project with TypeScript 5.5.x in package.json
- [X] T003 [P] Configure ESLint with TypeScript plugin in .eslintrc.js
- [X] T004 [P] Configure Prettier in .prettierrc
- [X] T005 [P] Create TypeScript configuration in tsconfig.json
- [X] T006 [P] Create .gitignore with Node.js and TypeScript patterns
- [X] T007 [P] Create .env.example with all required environment variables (API_KEYS, MAX_CONCURRENT_ANALYSES, MCP_PROTOCOL, MCP_PORT, DESIGNS_DIR, LOG_LEVEL, REDIS_URL, PORT)
- [X] T008 Create Dockerfile for Node.js service container with Playwright browsers
- [X] T009 Create docker-compose.yml with service, test, and Redis containers
- [X] T010 [P] Create README.md with project overview and setup instructions

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T011 Install and configure dependencies: express, playwright, bullmq, ioredis, pino, uuid in package.json
- [X] T012 [P] Create base logger utility with structured JSON logging in src/utils/logger.ts
- [X] T013 [P] Create correlation ID utility in src/utils/correlation-id.ts
- [X] T014 [P] Create API key authenticator service in src/services/api-key-authenticator.ts
- [X] T015 [P] Create base Express app structure in src/server.ts
- [X] T016 [P] Create error handling middleware in src/middleware/error-handler.ts
- [X] T017 [P] Create CORS middleware configuration in src/middleware/cors.ts
- [X] T018 [P] Create request logging middleware with correlation IDs in src/middleware/request-logger.ts
- [X] T019 Create BullMQ queue configuration in config/queue.ts
- [X] T020 Create Redis connection setup for BullMQ
- [X] T021 [P] Create TypeScript types for AnalysisJob in src/types/analysis-job.ts
- [X] T022 [P] Create TypeScript types for DesignSystem in src/types/design-system.ts
- [X] T023 [P] Create TypeScript types for MCP protocol in src/types/mcp.ts
- [X] T024 Create health check endpoint GET /health in src/routes/health.ts
- [X] T025 Create designs directory structure with volume mount configuration in docker-compose.yml
- [X] T025A [P] Create test fixture HTML page with basic components (buttons, forms, colors, typography) in tests/fixtures/pages/basic.html
- [X] T025B [P] Create test fixture HTML page with Bootstrap components in tests/fixtures/pages/bootstrap.html
- [X] T025C [P] Create test fixture HTML page with Material-UI components in tests/fixtures/pages/material-ui.html
- [X] T025D [P] Create test fixture HTML page with minimal styling for edge case testing in tests/fixtures/pages/minimal.html
- [X] T025E [P] Create test HTTP server for serving fixture pages during E2E tests in tests/fixtures/server.ts
- [X] T025F [P] Configure test server startup/shutdown in Playwright test setup in tests/e2e/playwright/global-setup.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Website Design System Extraction (Priority: P1) 🎯 MVP

**Goal**: Users can submit a website URL and receive an immediate 202 Accepted response. Analysis jobs complete and status endpoint returns "completed" status within 60 seconds for typical single-page websites. The system analyzes only the provided URL page (no crawling).

**Independent Test**: Submit a POST request with a valid website URL and verify that a design system JSON file is generated in the expected location. The test delivers value by proving the system can automatically extract design tokens from websites without manual intervention.

### E2E Tests for User Story 1

- [X] T025G [P] [US1] Create E2E test for basic page analysis in tests/e2e/playwright/analyze-basic.test.ts
- [X] T025H [P] [US1] Create E2E test for Bootstrap component detection in tests/e2e/playwright/analyze-bootstrap.test.ts
- [X] T025I [P] [US1] Create E2E test for Material-UI component detection in tests/e2e/playwright/analyze-material-ui.test.ts
- [X] T025J [P] [US1] Create E2E test for minimal page edge case in tests/e2e/playwright/analyze-minimal.test.ts
- [X] T025K [P] [US1] Create E2E test for error handling (invalid URL, timeout) in tests/e2e/playwright/analyze-errors.test.ts
- [X] T025L [P] [US1] Create E2E test for job status polling workflow in tests/e2e/playwright/job-status.test.ts
- [X] T025M [P] [US1] Create E2E test for concurrent job limit enforcement in tests/e2e/playwright/concurrent-jobs.test.ts

### Implementation for User Story 1

- [X] T026 [US1] Create POST /analyze endpoint handler in src/routes/analyze.ts
- [X] T027 [US1] Implement request validation for site_name and url in src/routes/analyze.ts
- [X] T028 [US1] Implement job creation with UUID generation in src/routes/analyze.ts
- [X] T029 [US1] Implement async job submission to BullMQ queue in src/routes/analyze.ts
- [X] T030 [US1] Implement immediate 202 Accepted response with job_id in src/routes/analyze.ts
- [X] T031 [US1] Create GET /status/:job_id endpoint handler in src/routes/status.ts
- [X] T032 [US1] Implement job status retrieval from Redis in src/routes/status.ts
- [X] T033 [US1] Implement job status deletion after completion/failure in src/routes/status.ts
- [X] T034 [US1] Create website analysis job processor in src/jobs/website-analysis.job.ts
- [X] T035 [US1] Implement Playwright browser launch and navigation in src/jobs/website-analysis.job.ts
- [X] T036 [US1] Create design system extractor service in src/services/design-system-extractor.ts
- [X] T037 [US1] Implement DOM traversal and element identification in src/services/design-system-extractor.ts
- [X] T038 [US1] Implement CSS selector analysis for component detection in src/services/design-system-extractor.ts
- [X] T039 [US1] Implement computed style inspection in src/services/design-system-extractor.ts
- [X] T040 [US1] Implement color token extraction (hex, rgb, rgba, named colors) in src/services/design-system-extractor.ts
- [X] T041 [US1] Implement typography token extraction (font-family, size, weight, line-height) in src/services/design-system-extractor.ts
- [X] T042 [US1] Implement spacing token extraction (margin, padding values) in src/services/design-system-extractor.ts
- [X] T043 [US1] Implement border-radius token extraction in src/services/design-system-extractor.ts
- [X] T044 [US1] Implement box-shadow token extraction in src/services/design-system-extractor.ts
- [X] T045 [US1] Implement transition/animation token extraction in src/services/design-system-extractor.ts
- [X] T046 [US1] Implement element state detection (hover, focus, active, disabled) in src/services/design-system-extractor.ts
- [X] T047 [US1] Implement library-specific component pattern detection (shadcn/ui, Bootstrap, Material-UI, etc.) via CSS class names in src/services/design-system-extractor.ts
- [X] T048 [US1] Implement library-specific component pattern detection via data attributes in src/services/design-system-extractor.ts
- [X] T049 [US1] Implement library-specific component pattern detection via DOM structure patterns in src/services/design-system-extractor.ts
- [X] T050 [US1] Create design token analyzer service in src/services/design-token-analyzer.ts
- [X] T051 [US1] Implement color consolidation (similar colors within 5% similarity) in src/services/design-token-analyzer.ts
- [X] T052 [US1] Implement spacing value consolidation (matching spacing values) in src/services/design-token-analyzer.ts
- [X] T053 [US1] Implement pattern mapping to design system tokens in src/services/design-token-analyzer.ts
- [X] T054 [US1] Implement design system JSON generation following design-tokens.org schema in src/services/design-token-analyzer.ts
- [X] T055 [US1] Implement design system file saving to designs/`<site-name>`/design-system.json in src/jobs/website-analysis.job.ts
- [X] T056 [US1] Implement error handling for invalid URLs in src/jobs/website-analysis.job.ts
- [X] T057 [US1] Implement error handling for inaccessible websites in src/jobs/website-analysis.job.ts
- [X] T058 [US1] Implement timeout handling for long-loading pages in src/jobs/website-analysis.job.ts
- [X] T059 [US1] Implement bot protection detection and error reporting in src/jobs/website-analysis.job.ts
- [X] T060 [US1] Implement storage failure detection (disk full, permission errors) in src/jobs/website-analysis.job.ts
- [X] T061 [US1] Implement configurable analysis time limit with partial result warning in src/jobs/website-analysis.job.ts
- [X] T062 [US1] Implement configurable maximum element count limit with partial result warning in src/jobs/website-analysis.job.ts
- [X] T063 [US1] Implement job status updates (pending → queued → in-progress → completed/failed) in src/jobs/website-analysis.job.ts
- [X] T064 [US1] Implement concurrent job limit enforcement with FIFO queueing in config/queue.ts
- [X] T065 [US1] Implement service startup validation for MAX_CONCURRENT_ANALYSES (fail if zero/negative/invalid) in src/server.ts
- [X] T066 [US1] Add structured logging with correlation IDs throughout analysis flow in src/jobs/website-analysis.job.ts
- [X] T067 [US1] Implement design system file overwrite when same site_name analyzed again in src/jobs/website-analysis.job.ts

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Users can submit analysis requests, track job status, and receive design system JSON files.

---

## Phase 4: User Story 2 - Design System Access via MCP Interface (Priority: P2)

**Goal**: A developer working in Cursor IDE can reference components and tokens from an analyzed design system while writing code. The developer connects to the MCP server running on a remote server via HTTPS/TLS or SSH tunnel, and through the MCP interface, they can query design systems by name and retrieve specific components, tokens, or patterns to incorporate into their work.

**Independent Test**: Configure Cursor IDE to connect to the remote MCP server (via HTTPS/TLS or SSH tunnel), provide the API key, and send queries through Cursor IDE's chat interface requesting specific components from a known design system. The test delivers value by proving developers can seamlessly access design system information during development from remote infrastructure.

### Implementation for User Story 2

- [ ] T068 [US2] Create MCP server implementation structure in src/mcp/server.ts
- [ ] T069 [US2] Implement JSON-RPC 2.0 protocol handlers in src/mcp/server.ts
- [ ] T070 [US2] Create HTTP transport implementation in src/mcp/transport/http-transport.ts
- [ ] T071 [US2] Create HTTPS transport implementation in src/mcp/transport/http-transport.ts
- [ ] T072 [US2] Create stdio transport implementation for SSH tunnel in src/mcp/transport/stdio-transport.ts
- [ ] T073 [US2] Implement MCP protocol tools/list handler in src/mcp/handlers/tools.handler.ts
- [ ] T074 [US2] Implement MCP protocol tools/call handler in src/mcp/handlers/tools.handler.ts
- [ ] T075 [US2] Implement MCP protocol resources/list handler in src/mcp/handlers/resources.handler.ts
- [ ] T076 [US2] Implement MCP protocol resources/read handler in src/mcp/handlers/resources.handler.ts
- [ ] T077 [US2] Create design system query handler in src/mcp/handlers/design-system.handler.ts
- [ ] T078 [US2] Implement design system lookup by name from designs/`<site-name>`/design-system.json in src/mcp/handlers/design-system.handler.ts
- [ ] T079 [US2] Create component query handler in src/mcp/handlers/component.handler.ts
- [ ] T080 [US2] Implement component retrieval from design system JSON in src/mcp/handlers/component.handler.ts
- [ ] T081 [US2] Implement token retrieval from design system JSON in src/mcp/handlers/design-system.handler.ts
- [ ] T082 [US2] Implement pattern retrieval from design system JSON in src/mcp/handlers/design-system.handler.ts
- [ ] T083 [US2] Implement API key authentication for MCP requests in src/mcp/server.ts
- [ ] T084 [US2] Implement MCP server configuration (HTTP/HTTPS protocol selection) in config/mcp.ts
- [ ] T085 [US2] Implement MCP server port configuration in config/mcp.ts
- [ ] T086 [US2] Integrate MCP server with Express app in src/server.ts
- [ ] T087 [US2] Implement error handling for non-existent design system queries in src/mcp/handlers/design-system.handler.ts
- [ ] T088 [US2] Implement error handling for non-existent component queries in src/mcp/handlers/component.handler.ts
- [ ] T089 [US2] Add structured logging for MCP requests in src/mcp/server.ts
- [ ] T090 [US2] Ensure design system files are accessible in real-time without service restart in src/mcp/handlers/design-system.handler.ts

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Users can extract design systems and query them via MCP interface from Cursor IDE.

---

## Phase 5: User Story 3 - Command-Line Interface for Analysis (Priority: P3)

**Goal**: A user can trigger website analysis from the command line instead of making HTTP requests. They can run a shell script with a site name and URL as parameters, and the script handles the request internally.

**Independent Test**: Run the shell script with valid parameters and verify it produces the same results as an HTTP POST request. The test delivers value by proving users have a simple way to trigger analysis without constructing HTTP requests manually.

### Implementation for User Story 3

- [ ] T091 [US3] Create shell script for analysis in scripts/analyze.sh
- [ ] T092 [US3] Implement parameter parsing (site_name and url) in scripts/analyze.sh
- [ ] T093 [US3] Implement API key reading from environment variable in scripts/analyze.sh
- [ ] T094 [US3] Implement HTTP POST request to /analyze endpoint in scripts/analyze.sh
- [ ] T095 [US3] Implement job status polling loop in scripts/analyze.sh
- [ ] T096 [US3] Implement status endpoint polling with job_id in scripts/analyze.sh
- [ ] T097 [US3] Implement completion detection and result display in scripts/analyze.sh
- [ ] T098 [US3] Implement error handling for invalid parameters in scripts/analyze.sh
- [ ] T099 [US3] Implement error handling for failed analysis jobs in scripts/analyze.sh
- [ ] T100 [US3] Add usage instructions and help text in scripts/analyze.sh
- [ ] T101 [US3] Make script executable with proper shebang in scripts/analyze.sh

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently. Users can extract design systems via HTTP API, query them via MCP, and trigger analysis via CLI.

---

## Phase 6: User Story 4 - MCP Server Configuration Documentation (Priority: P3)

**Goal**: A developer wants to connect Cursor IDE to the MCP server but needs clear instructions and configuration examples to set up the connection correctly.

**Independent Test**: Provide a developer with the configuration documentation and verify they can successfully configure Cursor IDE to connect to the MCP server using the provided examples.

### Implementation for User Story 4

- [ ] T102 [US4] Create MCP configuration documentation section in README.md
- [ ] T103 [US4] Document HTTP connection configuration example for Cursor IDE in README.md
- [ ] T104 [US4] Document HTTPS connection configuration example for Cursor IDE in README.md
- [ ] T105 [US4] Document SSH tunnel connection configuration example for Cursor IDE in README.md
- [ ] T106 [US4] Document API key configuration in MCP setup examples in README.md
- [ ] T107 [US4] Document port configuration for MCP server in README.md
- [ ] T108 [US4] Add troubleshooting section for MCP connection issues in README.md
- [ ] T109 [US4] Update quickstart.md with MCP configuration examples (already present, verify completeness)

**Checkpoint**: All user stories should now be independently functional. Users can extract design systems, query them via MCP, trigger analysis via CLI, and configure Cursor IDE using provided documentation.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T110 [P] Update README.md with complete API documentation and usage examples
- [ ] T111 [P] Add curl examples for all API endpoints in README.md
- [ ] T112 [P] Verify all environment variables are documented in .env.example
- [ ] T113 [P] Add API contract validation against openapi.yaml in src/middleware/contract-validator.ts
- [ ] T114 Code cleanup and refactoring across all services
- [ ] T115 [P] Add request/response logging improvements with trace IDs
- [ ] T116 [P] Add performance monitoring for analysis job duration
- [ ] T117 [P] Add queue depth monitoring in health check endpoint
- [ ] T118 Security hardening: validate all input parameters
- [ ] T119 Security hardening: implement rate limiting for API endpoints
- [ ] T120 Run quickstart.md validation to ensure all examples work
- [ ] T121 [P] Add comprehensive error messages for all failure scenarios
- [ ] T122 [P] Verify design system JSON schema compliance with design-tokens.org
- [ ] T123 [P] Add validation for design system file structure before saving
- [ ] T124 [P] Improve library detection accuracy with additional pattern matching
- [ ] T125 [P] Add support for additional design libraries (Ant Design, Chakra UI, etc.) in src/services/design-system-extractor.ts

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Depends on User Story 1 for design system files to exist, but MCP server can be implemented independently
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Depends on User Story 1 for /analyze endpoint to exist
- **User Story 4 (P3)**: Can start after Foundational (Phase 2) - Depends on User Story 2 for MCP server to exist, but documentation can be written in parallel

### Within Each User Story

- Models/types before services
- Services before endpoints/handlers
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, User Story 1 can start immediately
- User Stories 2, 3, and 4 can start in parallel after User Story 1 is complete (if team capacity allows)
- Tasks within a story marked [P] can run in parallel (different files, no dependencies)
- Different user stories can be worked on in parallel by different team members after dependencies are met

---

## Parallel Example: User Story 1

```bash
# Launch all test fixtures in parallel (Phase 2):
Task: "Create test fixture HTML page with basic components in tests/fixtures/pages/basic.html"
Task: "Create test fixture HTML page with Bootstrap components in tests/fixtures/pages/bootstrap.html"
Task: "Create test fixture HTML page with Material-UI components in tests/fixtures/pages/material-ui.html"
Task: "Create test fixture HTML page with minimal styling in tests/fixtures/pages/minimal.html"

# Launch all E2E tests in parallel (Phase 3):
Task: "Create E2E test for basic page analysis in tests/e2e/playwright/analyze-basic.test.ts"
Task: "Create E2E test for Bootstrap component detection in tests/e2e/playwright/analyze-bootstrap.test.ts"
Task: "Create E2E test for Material-UI component detection in tests/e2e/playwright/analyze-material-ui.test.ts"
Task: "Create E2E test for minimal page edge case in tests/e2e/playwright/analyze-minimal.test.ts"
Task: "Create E2E test for error handling in tests/e2e/playwright/analyze-errors.test.ts"
Task: "Create E2E test for job status polling workflow in tests/e2e/playwright/job-status.test.ts"
Task: "Create E2E test for concurrent job limit enforcement in tests/e2e/playwright/concurrent-jobs.test.ts"

# Launch all type definitions in parallel:
Task: "Create TypeScript types for AnalysisJob in src/types/analysis-job.ts"
Task: "Create TypeScript types for DesignSystem in src/types/design-system.ts"
Task: "Create TypeScript types for MCP protocol in src/types/mcp.ts"

# Launch all token extraction methods in parallel:
Task: "Implement color token extraction in src/services/design-system-extractor.ts"
Task: "Implement typography token extraction in src/services/design-system-extractor.ts"
Task: "Implement spacing token extraction in src/services/design-system-extractor.ts"
Task: "Implement border-radius token extraction in src/services/design-system-extractor.ts"
Task: "Implement box-shadow token extraction in src/services/design-system-extractor.ts"
Task: "Implement transition/animation token extraction in src/services/design-system-extractor.ts"
```

---

## Parallel Example: User Story 2

```bash
# Launch all MCP handlers in parallel:
Task: "Create design system query handler in src/mcp/handlers/design-system.handler.ts"
Task: "Create component query handler in src/mcp/handlers/component.handler.ts"

# Launch all transport implementations in parallel:
Task: "Create HTTP transport implementation in src/mcp/transport/http-transport.ts"
Task: "Create HTTPS transport implementation in src/mcp/transport/http-transport.ts"
Task: "Create stdio transport implementation for SSH tunnel in src/mcp/transport/stdio-transport.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add User Story 4 → Test independently → Deploy/Demo
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (MVP - highest priority)
   - Developer B: Can start User Story 2 MCP server structure (after US1 endpoints exist)
   - Developer C: Can start User Story 3 CLI script (after US1 endpoints exist)
3. After User Story 1 completes:
   - Developer A: User Story 2 MCP handlers
   - Developer B: User Story 3 completion
   - Developer C: User Story 4 documentation
4. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- All tasks include explicit file paths for clarity
- Task IDs are sequential and indicate execution order
- User Story 1 (P1) is the MVP and must be completed first
- User Stories 2, 3, and 4 can proceed in parallel after User Story 1 is complete
