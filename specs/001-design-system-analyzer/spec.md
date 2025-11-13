# Feature Specification: Design System Analyzer

**Feature Branch**: `001-design-system-analyzer`  
**Created**: 2025-11-13  
**Status**: Draft  
**Input**: User description: "Ты — инженер-разработчик. Создай полноценный микросервис на ruby on rails, который состоит из двух частей:

Часть 1:
🎯 Назначение: Принимает HTTP-запрос POST по адресу `/analyze` с JSON-данными. Использует библиотеку Playwright для автоматического анализа указанного сайта, извлекает дизайн-токены и формирует JSON-файл дизайн-системы.

Часть 2: Реализует программный интерфейс MCP для Cursor IDE. Позволяет в чате с ИИ в Cursor IDE писать что-то вроде "добавь на страницу блок XXX из дизайн-системы сайта YYY"."

## Clarifications

### Session 2025-11-13

- Q: What authentication/authorization model should the `/analyze` endpoint and MCP interface use? → A: API key authentication — users must provide a key in requests
- Q: For long-running analyses (up to 60 seconds), how should users track progress or status? → A: Asynchronous — immediate 202 Accepted response with status endpoint for polling
- Q: How should API keys be generated, managed, and provided to users? → A: Pre-configured keys stored in environment variables — keys provided via configuration at deployment time
- Q: Should the system limit the number of analyses that can run simultaneously? → A: Configurable limit — maximum set via environment variable, requests beyond limit are queued
- Q: How long should the system retain analysis job status information after completion? → A: Short-term only — delete job statuses immediately after completion
- Q: Как будет защищено подключение из Cursor IDE от посторонних лиц? → A: MCP сервер работает локально через stdio/локальный сокет с доступом только для пользователя системы, дополнительно защищается API ключом на уровне приложения
- Q: Этот проект будет запущен на удалённом сервере. Как к нему будет организован доступ из Cursor IDE по MCP? → A: MCP сервер доступен через HTTPS/TLS с обязательной аутентификацией по API ключу. Cursor IDE подключается к серверу через защищённое HTTPS соединение, либо через SSH туннель с локальным stdio подключением
- Q: Учти вариант, что mcp-сервер может предоставляться по обычному http, а не только https → A: MCP сервер может работать через HTTP или HTTPS (настраивается через конфигурацию). API ключ обязателен для обоих вариантов. HTTP рекомендуется только для локальной разработки или внутренних сетей
- Q: Сколько докер контейнеров будет? → A: Минимум 2 контейнера: основной Rails сервис (HTTP API + MCP сервер + background workers) и тестовый контейнер. Возможна дополнительная декомпозиция: отдельный контейнер для background workers, если требуется независимое масштабирование

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Website Design System Extraction (Priority: P1)

A user wants to automatically extract a design system from an existing website. They submit a website URL and a name for the design system. The system analyzes the website's visual and interactive elements, identifies design patterns (colors, typography, spacing, shadows, etc.), and generates a structured design system file that can be used for future development or design consistency.

**Why this priority**: This is the core functionality that enables the entire feature. Without the ability to analyze websites and extract design tokens, the MCP interface has nothing to work with. This must be implemented first as it provides immediate standalone value.

**Independent Test**: Can be fully tested by submitting a POST request with a valid website URL and verifying that a design system JSON file is generated in the expected location. The test delivers value by proving the system can automatically extract design tokens from websites without manual intervention.

**Acceptance Scenarios**:

1. **Given** a user has a website URL they want to analyze, **When** they submit a POST request with the site name and URL along with a valid API key, **Then** the system immediately returns 202 Accepted with an analysis job identifier and initiates analysis asynchronously.

2. **Given** an analysis job has been submitted, **When** a user polls the status endpoint with the job identifier while the job is pending or in-progress, **Then** the system returns the current analysis status (pending, queued, in-progress) and updates to completed with result location upon completion.

3. **Given** an analysis job has completed (successfully or failed), **When** a user attempts to poll the status endpoint with the job identifier, **Then** the system returns a 404 Not Found error indicating the job status is no longer available.

4. **Given** the system is processing the maximum number of concurrent analyses, **When** a user submits an additional analysis request, **Then** the system returns 202 Accepted with a job identifier and the job status shows as "queued" until capacity becomes available.

5. **Given** a user submits a request without a valid API key, **When** the request is processed, **Then** the system returns an authentication error with status code 401.

6. **Given** a user submits an invalid or inaccessible URL, **When** the analysis job completes, **Then** the status endpoint returns a failed status with a clear error message indicating why the analysis failed.

7. **Given** a user submits the same site name twice, **When** the second analysis job completes, **Then** the new design system completely replaces the previous one.

8. **Given** a website requires authentication or shows bot protection, **When** the analysis job processes, **Then** the system detects this condition and marks the job as failed with an appropriate error message.

9. **Given** a website takes too long to load, **When** the analysis request times out, **Then** the status endpoint returns a failed status with a timeout error message.

10. **Given** a developer wants to connect to MCP server on remote host, **When** they configure Cursor IDE with remote server address and API key, **Then** the connection is established via HTTP or HTTPS (depending on server configuration) and authenticated with the API key.

11. **Given** MCP server is configured to use HTTP protocol, **When** a developer connects via HTTP, **Then** the connection succeeds and all requests require API key authentication.

---

### User Story 2 - Design System Access via MCP Interface (Priority: P2)

A developer working in Cursor IDE wants to reference components and tokens from an analyzed design system while writing code. The developer connects to the MCP server running on a remote server via HTTPS/TLS or SSH tunnel, and through the MCP interface, they can query design systems by name and retrieve specific components, tokens, or patterns to incorporate into their work.

**Why this priority**: This extends the value of the extracted design systems by making them accessible within the development environment. However, it depends on Story 1 being functional first. This is valuable for maintaining design consistency during development. The remote server deployment enables centralized access to design systems across multiple developers.

**Independent Test**: Can be fully tested by configuring Cursor IDE to connect to the remote MCP server (via HTTPS/TLS or SSH tunnel), providing the API key, and sending queries through Cursor IDE's chat interface requesting specific components from a known design system. The test delivers value by proving developers can seamlessly access design system information during development from remote infrastructure.

**Acceptance Scenarios**:

1. **Given** a design system has been extracted and saved, **When** a developer queries the MCP interface for that design system by name with a valid API key, **Then** the system returns available components and tokens.

2. **Given** a developer requests a specific component (e.g., "button" or "form") from a design system with a valid API key, **When** the MCP interface processes the query, **Then** it returns the component's properties, variants, and styling tokens.

3. **Given** a developer queries the MCP interface without a valid API key, **When** the request is processed, **Then** it returns an authentication error.

4. **Given** a developer queries for a non-existent design system, **When** the MCP interface processes the query, **Then** it returns a clear error indicating the design system was not found.

5. **Given** a developer queries for a component that doesn't exist in the design system, **When** the MCP interface processes the query, **Then** it returns a clear message indicating the component is not available.

6. **Given** a developer wants to connect via SSH tunnel, **When** they establish SSH connection to remote server and configure Cursor IDE to use local stdio through SSH tunnel, **Then** the MCP connection works through SSH tunnel with API key authentication.

---

### User Story 3 - Command-Line Interface for Analysis (Priority: P3)

A user wants to trigger website analysis from the command line instead of making HTTP requests. They can run a shell script with a site name and URL as parameters, and the script handles the request internally.

**Why this priority**: This provides convenience for users who prefer command-line tools, but it's not essential for core functionality. The HTTP API can serve the same purpose. This improves developer experience but can be implemented after core features are stable.

**Independent Test**: Can be fully tested by running the shell script with valid parameters and verifying it produces the same results as an HTTP POST request. The test delivers value by proving users have a simple way to trigger analysis without constructing HTTP requests manually.

**Acceptance Scenarios**:

1. **Given** a user has a website URL and site name, **When** they run the shell script with these parameters, **Then** the script triggers analysis and generates the design system file.

2. **Given** a user runs the shell script with invalid or missing parameters, **When** the script executes, **Then** it displays usage instructions and exits with an error code.

---

### User Story 4 - MCP Server Configuration Documentation (Priority: P3)

A developer wants to connect Cursor IDE to the MCP server but needs clear instructions and configuration examples to set up the connection correctly.

**Why this priority**: While the MCP server functionality itself is critical (Story 2), configuration documentation enables developers to actually use it. This is important for adoption but can be documented after the core MCP functionality is implemented.

**Independent Test**: Can be fully tested by providing a developer with the configuration documentation and verifying they can successfully configure Cursor IDE to connect to the MCP server using the provided examples.

**Acceptance Scenarios**:

1. **Given** a developer wants to connect Cursor IDE to MCP server via HTTP, **When** they follow the provided configuration example, **Then** they can successfully configure Cursor IDE and establish connection.

2. **Given** a developer wants to connect Cursor IDE to MCP server via HTTPS, **When** they follow the provided HTTPS configuration example, **Then** they can successfully configure Cursor IDE with TLS and establish secure connection.

3. **Given** a developer wants to connect Cursor IDE via SSH tunnel, **When** they follow the provided SSH tunnel configuration example, **Then** they can successfully establish SSH tunnel and configure Cursor IDE to use it.

4. **Given** a developer follows the configuration example, **When** they configure Cursor IDE, **Then** the example includes all required information: server address, protocol, API key configuration, and port settings.

---

### Edge Cases

- What happens when a website has no interactive elements or minimal styling?
- How does the system handle websites that are entirely JavaScript-rendered and take time to load?
- What happens when a website uses inline styles exclusively instead of CSS classes?
- How does the system handle websites with multiple color schemes or themes?
- What happens when a design system file already exists but the analysis fails partway through?
- How does the system handle very large websites with thousands of elements?
- What happens when a website blocks automated browsing or requires CAPTCHA?
- How does the system handle websites that are behind authentication walls?
- What happens when a URL redirects multiple times or enters a redirect loop?
- How does the system handle malformed or invalid JSON in the request body?
- What happens when the storage location for design systems is full or inaccessible?
- What happens when a request includes an invalid API key that doesn't match any configured environment variable values?
- How does the system handle requests missing the API key entirely?
- What happens when the service starts without any API keys configured in environment variables?
- What happens when a user polls a status endpoint with an invalid or non-existent job identifier?
- What happens when a user attempts to poll a status endpoint for a job that has already completed and been deleted?
- How does the system handle status polling requests for jobs that were deleted after completion?
- What happens when multiple analyses are submitted for the same site name simultaneously?
- What happens when the concurrent analysis limit is reached and additional requests are submitted?
- How are queued analysis jobs prioritized when capacity becomes available (FIFO, priority, etc.)?
- What happens when the maximum concurrent limit is set to zero or an invalid value via environment variable?
- What happens when a developer attempts to connect to MCP server without TLS/HTTPS when server is configured for HTTPS only?
- How does the system handle MCP connection attempts from unauthorized network addresses?
- What happens when SSH tunnel is established but API key authentication fails?
- What happens when MCP server is configured for HTTP and a connection is made via HTTP?
- How does the system handle API key transmission over unencrypted HTTP connections?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept HTTP POST requests to an `/analyze` endpoint containing a site name and website URL, authenticated via API key.

- **FR-002**: System MUST require and validate API keys for all `/analyze` endpoint requests against valid keys configured via environment variables, returning 401 Unauthorized for missing or invalid keys.

- **FR-003**: System MUST process analysis requests asynchronously, immediately returning 202 Accepted with a unique job identifier upon request validation.

- **FR-004**: System MUST enforce a configurable maximum limit on concurrent analysis jobs (configurable via environment variable), queueing requests that exceed this limit and processing them when capacity becomes available.

- **FR-005**: System MUST provide a status endpoint that accepts job identifiers and returns analysis status (pending, queued, in-progress, completed, failed) and result information when available. Job status information MUST be deleted immediately after a job reaches completed or failed status.

- **FR-006**: System MUST analyze the provided website to identify all visual and interactive elements (buttons, input fields, links, forms, menus, cards, animations, etc.).

- **FR-007**: System MUST extract design tokens including colors, fonts, sizes, border-radius values, spacing, box-shadow properties, and element states (hover, focus, active).

- **FR-008**: System MUST identify repeating patterns in the website (e.g., common button colors, shared shadow styles) and map them to design system tokens.

- **FR-009**: System MUST generate a structured JSON design system file following a predefined template structure.

- **FR-010**: System MUST save generated design system files to a location organized by site name (e.g., `designs/<site-name>/design-system.json`).

- **FR-011**: System MUST overwrite existing design system files when a new analysis job completes for the same site name.

- **FR-012**: System MUST detect and report errors for invalid URLs, inaccessible websites, timeout conditions, JavaScript errors, and bot protection mechanisms, marking the analysis job as failed with appropriate error details.

- **FR-013**: System MUST return structured error responses with appropriate error codes for different failure scenarios in both immediate responses (validation errors) and status endpoint responses (analysis errors).

- **FR-014**: System MUST support CORS headers to allow cross-origin requests for local development and testing.

- **FR-015**: System MUST provide an MCP (Model Context Protocol) interface that allows querying design systems by name, authenticated via API key.

- **FR-016**: System MUST require and validate API keys for all MCP interface requests against valid keys configured via environment variables, returning authentication errors for missing or invalid keys.

- **FR-023**: System MUST provide MCP server accessible over network via HTTP or HTTPS (configurable through environment variables) on a configurable port, with mandatory API key authentication for all connections.

- **FR-024**: System MUST support MCP access through SSH tunnel with local stdio connection as an alternative access method, allowing Cursor IDE to connect via SSH and use local stdio transport when SSH tunnel is established.

- **FR-025**: System MUST support both HTTP and HTTPS protocols for MCP connections. HTTPS SHOULD be used in production environments for security. HTTP MAY be used for local development or internal networks but MUST still require API key authentication.

- **FR-026**: System MUST validate API keys for all MCP requests, regardless of transport method (HTTP, HTTPS, or SSH tunnel with stdio), returning authentication errors for missing or invalid keys.

- **FR-027**: System MUST provide documentation and configuration examples for connecting MCP server to Cursor IDE, including examples for HTTP, HTTPS, and SSH tunnel connection methods with API key authentication.

- **FR-028**: System MUST be deployed using Docker containers via docker-compose.yml, with at minimum: (1) primary Rails service container containing HTTP API server, MCP server, and background job workers, (2) test container for running automated tests. Additional worker containers MAY be added for independent scaling if needed.

- **FR-017**: System MUST allow the MCP interface to retrieve specific components, tokens, or patterns from stored design systems.

- **FR-018**: System MUST make design system files available to the MCP interface in real-time without requiring service restart or container rebuild.

- **FR-019**: System MUST provide a shell script interface that accepts a site name and URL as parameters and triggers website analysis (shell script must include API key for authentication and handle async processing).

- **FR-020**: System MUST consolidate similar colors and styles to create a minimal, non-redundant token system.

- **FR-021**: System MUST identify and document when components appear to be sourced from known design libraries (e.g., shadcn, reactbits, bootstrap) if such indicators are clearly visible.

- **FR-022**: System MUST structure design tokens into categories: colors, typography, spacing, radius, shadows, transitions, and components.

### Key Entities

- **Design System**: A structured collection of design tokens and component definitions extracted from a website. Contains metadata (name, version, author), global tokens (colors, typography, spacing, etc.), theme definitions, and component specifications. Stored as JSON files in a site-name-based directory structure.

- **Analysis Job**: An asynchronous processing task that represents a single website analysis request. Contains a unique identifier, current status (pending, queued, in-progress, completed, failed), submission timestamp, completion timestamp (when applicable), and result location or error details. Job status information is temporary and deleted immediately upon completion (successful or failed), requiring users to capture result locations from the final status response before deletion.

- **Website Analysis Result**: The output of analyzing a website, containing extracted design tokens, identified patterns, component structures, and metadata. Used to populate the design system JSON structure.

- **Design Token**: A named design value (color, spacing, font size, etc.) that can be referenced in the design system. Tokens may be semantic (e.g., "primary-color") or base values (e.g., hex color codes).

- **Component Definition**: A reusable UI element specification including base properties, variants, states, and size options. Components reference design tokens for their styling values.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can submit a website URL and receive an immediate 202 Accepted response. Analysis jobs complete and status endpoint returns "completed" status within 60 seconds for typical websites (under 50 pages or equivalent content volume).

- **SC-002**: The generated design system file correctly identifies and extracts at least 80% of the primary design tokens (main colors, typography scale, primary spacing values) from websites with standard HTML/CSS structure.

- **SC-003**: The MCP interface successfully retrieves design system information for 95% of queries when the requested design system exists and is accessible.

- **SC-004**: System correctly handles and returns appropriate error messages for 100% of invalid URL formats, inaccessible websites, and timeout scenarios without crashing or producing unhandled errors.

- **SC-005**: Generated design system files follow the predefined JSON structure template with all required top-level sections (metadata, global tokens, themes, components) properly populated.

- **SC-006**: Design system files are accessible via MCP interface within 5 seconds of analysis job completion, without requiring service restart or manual intervention.

- **SC-009**: Status endpoint responds to polling requests within 1 second, allowing users to efficiently track analysis job progress.

- **SC-007**: Users can successfully trigger website analysis via shell script with the same reliability and results as HTTP POST requests.

- **SC-008**: The system consolidates similar design values (colors within 5% similarity, matching spacing values) into shared tokens, reducing redundancy by at least 30% compared to listing all unique values.

## Assumptions

- Websites to be analyzed are primarily accessible without authentication, or authentication issues will be reported as errors.
- Design systems are stored on persistent storage that is mounted as a volume, allowing files to persist across container restarts.
- System is deployed using Docker containers via docker-compose.yml. Minimum architecture includes: (1) primary Rails service container with HTTP API, MCP server, and background workers running in the same container, (2) separate test container for automated testing. Background workers may be split into separate containers for independent scaling if needed.
- API keys are configured via environment variables at deployment time and provided to users separately (not generated by the service).
- Maximum concurrent analysis limit is configurable via environment variable, with queued jobs processed in order when capacity becomes available.
- Analysis job status information is deleted immediately upon job completion (successful or failed), requiring users to capture result locations from the final status response if needed.
- The MCP server will be configured and used within Cursor IDE environment.
- MCP server runs on a remote server and is accessible via HTTP or HTTPS over network (protocol configurable via environment variables) or through SSH tunnel with local stdio connection. All connections require API key authentication regardless of protocol. HTTPS provides transport-level encryption in addition to API key security, while HTTP relies solely on API key authentication (suitable for local development or internal networks).
- When accessed via SSH tunnel, Cursor IDE establishes SSH connection to remote server and uses local stdio transport through the tunnel, maintaining security through SSH authentication and API key validation.
- Users have reasonable expectations for analysis time based on website complexity (simple static sites analyzed quickly, complex SPAs may take longer).
- Design system extraction focuses on visual and stylistic patterns rather than functional behavior or business logic.
- Websites using modern web standards (HTML5, CSS3) will yield better extraction results than legacy markup.
