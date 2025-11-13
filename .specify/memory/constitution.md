<!--
Sync Impact Report:
Version change: [TEMPLATE] → 1.0.0
Modified principles: N/A (initial creation from template)
Added sections:
  - Principle I. Product-Oriented Microservice Architecture
  - Principle II. Containerization and Open Infrastructure
  - Principle III. Observability and Diagnosability
  - Principle IV. Managed Configuration and Documentation
  - Principle V. Quality, Testing, and Experimentation
  - Technological Standards
  - Workflow and Compliance
  - Governance
Removed sections: N/A (template placeholders removed)
Templates requiring updates:
  ✅ plan-template.md - Constitution Check section already exists
  ✅ spec-template.md - No direct constitution references, compatible
  ✅ tasks-template.md - No direct constitution references, compatible
Follow-up TODOs: None
-->

# Design System MCP Constitution

## Core Principles

### Principle I. Product-Oriented Microservice Architecture

- Each service is implemented as a set of independent, containerized components: public HTTP API, asynchronous computation workers, data preparation pipelines, ML infrastructure, and others.

- All APIs comply with REST, support idempotency, return proper HTTP status codes, and provide extensible contract schemas.

### Principle II. Containerization and Open Infrastructure

- All services, clients, test runners, and auxiliary tools are deployed via `docker-compose.yml`; no mandatory dependencies are required on the host machine.

- By default, no interpreters (Python, Node.js, PHP, Ruby, etc.) are expected to be installed on the host; if scripts need to run, the interpreters are executed inside corresponding containers without host installation.

- Only open-source solutions are used for computation, data storage, queues, feature store, and ML life-cycle.

- Tests and client SDKs (JS, PHP, shell) are placed in separate containers and can be executed independently.

### Principle III. Observability and Diagnosability

- All requests, errors, and background jobs must be logged in a structured format with mandatory trace IDs, channel metadata, device data, and `customer_id`.

- Each key service must expose health-check endpoints and metrics (latency, throughput, queue depth, recommendation quality) for monitoring.

- Diagnostic commands, `docker-compose logs`, and investigation scripts must be provided for incident analysis; logging should expand along with new functionality.

### Principle IV. Managed Configuration and Documentation

- All configurations are read from `.env`; each variable's meaning must be documented in README or reference guides. Any new variable must include an example in `env.example` and setup instructions.

- Documentation and specifications are maintained in English, including `curl` examples, script samples, ML algorithm descriptions for business use, and run guides.

- Any change in API, configuration, or process requires updating the README, quickstart guides, contracts, and migration comments.

### Principle V. Quality, Testing, and Experimentation

- Unit, integration, and load tests are mandatory for all components; synthetic data should be generated automatically when needed.

- For different test classes, appropriate environments are used:

  - Built-in framework unit tests run inside their respective service containers.

  - HTTP API and browser (e2e, Playwright) tests run in a dedicated test container.

  - All test containers are connected via the shared `docker-compose.yml`.

- The set of containers can be extended at the team's discretion.

## Technological Standards

- Backend APIs must follow REST principles.

- Client implementations (JS, PHP, shell) and utility scripts are built in separate containers; scripts should support tracing and `.env` configuration when possible.

- Every endpoint must provide usage examples.

## Workflow and Compliance

- Before starting development, each feature must undergo a Constitution Check stage; any nonconformities are recorded in the Complexity Tracking table with justification.

- Tests must run in containers defined in `docker-compose.yml`; the CI/CD pipeline must use the same images.

- When APIs, data, or configurations change, documentation, contract schemas, and `env.example` must be updated accordingly.

- Logs and metrics are analyzed via provided scripts; investigation results are recorded in documentation or post-mortem reports.

- Any service using nonstandard ports must be documented along with proxying rules through frontend containers.

## Governance

- The Constitution has the highest authority: architectural decisions, project plans, and code reviews are all verified for compliance with its principles.

- Every significant service change must include verification of plans, specifications, and task lists for adherence to the principles and technological standards.

**Version**: 1.0.0 | **Ratified**: 2025-11-13 | **Last Amended**: 2025-11-13
