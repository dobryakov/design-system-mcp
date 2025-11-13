# Data Model: Design System Analyzer

**Date**: 2025-11-13  
**Purpose**: Define entities, fields, relationships, validation rules, and state transitions

## Entities

### 1. Design System

**Description**: A structured collection of design tokens and component definitions extracted from a website.

**Storage**: JSON file at `designs/<site-name>/design-system.json`

**Structure**:
```json
{
  "$schema": "https://design-tokens.org/schema/v1.1.json",
  "metadata": {
    "name": "<site-name>",
    "version": "<semantic-version>",
    "author": "<extracted-or-default>",
    "description": "<extracted-description>",
    "lastModified": "<ISO-8601-timestamp>"
  },
  "group": "tokens",
  "aliases": {
    "<alias-name>": "<value>"
  },
  "global": {
    "color": { ... },
    "font": { ... },
    "radius": { ... },
    "shadow": { ... },
    "spacing": { ... },
    "transition": { ... }
  },
  "themes": {
    "<theme-name>": { ... }
  },
  "component": {
    "<component-name>": {
      "base": { ... },
      "variant": { ... },
      "state": { ... },
      "size": { ... }
    }
  }
}
```

**Fields**:
- `metadata.name` (string, required): Site name from analysis request
- `metadata.version` (string, required): Semantic version (starts at "1.0.0")
- `metadata.author` (string, optional): Extracted from website or default
- `metadata.description` (string, optional): Extracted description
- `metadata.lastModified` (string, required): ISO-8601 timestamp of analysis
- `aliases` (object, optional): Named aliases for commonly used values
- `global` (object, required): Global design tokens (colors, fonts, spacing, etc.)
- `themes` (object, optional): Theme-specific token overrides
- `component` (object, optional): Component definitions with variants, states, sizes

**Validation Rules**:
- Site name must be valid filesystem-safe string (alphanumeric, hyphens, underscores)
- Version must follow semantic versioning (major.minor.patch)
- All color values must be valid CSS color formats (hex, rgb, rgba, named colors)
- All spacing/radius values must be valid CSS units (px, rem, em, etc.)
- Component names must be valid identifiers (alphanumeric, hyphens, underscores)

**Relationships**:
- One Design System per site name (overwrites previous if exists)
- Design System references global tokens via `{global.token.path}` syntax
- Design System references themes via `{themes.<theme-name>.token.path}` syntax
- Components reference global tokens and themes in their definitions

### 2. Analysis Job

**Description**: An asynchronous processing task representing a single website analysis request.

**Storage**: In-memory hash/Redis-like structure (deleted immediately after completion)

**Fields**:
- `id` (string, required): Unique job identifier (UUID)
- `status` (enum, required): `pending`, `queued`, `in-progress`, `completed`, `failed`
- `site_name` (string, required): Target site name for analysis
- `url` (string, required): Website URL to analyze
- `submitted_at` (datetime, required): Job submission timestamp
- `started_at` (datetime, optional): Job processing start timestamp
- `completed_at` (datetime, optional): Job completion timestamp
- `result_location` (string, optional): Path to generated design system file (if completed)
- `error_message` (string, optional): Error details (if failed)
- `correlation_id` (string, required): Request correlation ID for tracing

**State Transitions**:
```
pending → queued → in-progress → completed (deleted)
pending → queued → in-progress → failed (deleted)
pending → failed (deleted)  # Immediate failure (validation error)
```

**Validation Rules**:
- Job ID must be unique UUID v4
- URL must be valid HTTP/HTTPS URL format
- Site name must be filesystem-safe (alphanumeric, hyphens, underscores, max 255 chars)
- Status transitions must follow valid state machine
- Job must be deleted immediately after reaching `completed` or `failed` status

**Relationships**:
- One Analysis Job per request
- Analysis Job produces one Design System (on success)
- Analysis Job may reference correlation ID from original HTTP request

### 3. Design Token

**Description**: A named design value (color, spacing, font size, etc.) that can be referenced in the design system.

**Storage**: Nested within Design System JSON structure

**Types**:
- **Color Token**: CSS color value (hex, rgb, rgba, named)
- **Typography Token**: Font family, size, weight, line-height
- **Spacing Token**: Margin, padding values (px, rem, em)
- **Radius Token**: Border-radius values
- **Shadow Token**: Box-shadow properties
- **Transition Token**: Animation/transition properties

**Fields** (varies by type):
- `value` (string/number, required): The actual design value
- `type` (string, optional): Token type (for shadows: "dropShadow")
- Additional type-specific fields as needed

**Validation Rules**:
- Color values must be valid CSS color formats
- Spacing/radius values must be valid CSS units
- Font sizes must be valid CSS font-size values
- Shadow values must be valid CSS box-shadow syntax

**Relationships**:
- Design Tokens belong to a Design System
- Design Tokens can reference other tokens via alias syntax
- Design Tokens can be organized hierarchically (e.g., `global.color.base.blue.500`)

### 4. Component Definition

**Description**: A reusable UI element specification including base properties, variants, states, and size options.

**Storage**: Nested within Design System JSON structure under `component.<name>`

**Structure**:
```json
{
  "base": {
    "<property>": { "value": "<token-reference-or-value>" }
  },
  "variant": {
    "<variant-name>": {
      "<property>": { "value": "<token-reference-or-value>" }
    }
  },
  "state": {
    "<state-name>": {
      "<property>": { "value": "<token-reference-or-value>" }
    }
  },
  "size": {
    "<size-name>": {
      "<property>": { "value": "<token-reference-or-value>" }
    }
  }
}
```

**Fields**:
- `base` (object, required): Base component properties
- `variant` (object, optional): Variant-specific overrides (primary, secondary, etc.)
- `state` (object, optional): State-specific styles (hover, focus, active, disabled)
- `size` (object, optional): Size-specific overrides (sm, md, lg)

**Validation Rules**:
- Component names must be valid identifiers
- All property values must reference tokens or be valid CSS values
- Variant/state/size names must be valid identifiers

**Relationships**:
- Component Definitions belong to a Design System
- Component Definitions reference Design Tokens for styling values
- Component Definitions can have multiple variants, states, and sizes

## Data Flow

### Analysis Request Flow

1. **HTTP Request** → `POST /analyze` with `site_name`, `url`, `api_key`
2. **Validation** → Validate API key, URL format, site name
3. **Job Creation** → Create Analysis Job with status `pending`
4. **Queue Check** → Check concurrent job limit, set status to `queued` if limit reached
5. **Job Processing** → Background job:
   - Set status to `in-progress`
   - Launch Playwright browser
   - Navigate to URL
   - Extract design tokens and components
   - Consolidate similar values into tokens
   - Generate Design System JSON
   - Save to `designs/<site-name>/design-system.json`
   - Set status to `completed` with result location
   - Delete job status
6. **Error Handling** → On error:
   - Set status to `failed` with error message
   - Delete job status

### MCP Query Flow

1. **MCP Request** → Query design system by name with `api_key`
2. **Authentication** → Validate API key
3. **File Lookup** → Read `designs/<site-name>/design-system.json`
4. **Response** → Return design system data or component-specific data

## Storage Strategy

### Design Systems
- **Location**: `designs/<site-name>/design-system.json`
- **Format**: JSON file following design-tokens.org schema
- **Persistence**: File system (mounted Docker volume)
- **Overwrite**: New analysis for same site name overwrites previous file

### Analysis Jobs
- **Location**: In-memory hash/ActiveSupport::Cache (or similar)
- **Format**: Ruby hash/object
- **Persistence**: Ephemeral (deleted after completion)
- **Key**: Job ID (UUID)
- **TTL**: Until job reaches `completed` or `failed` status

### Background Jobs (Solid Queue)
- **Location**: SQLite database (default) or PostgreSQL
- **Format**: Solid Queue job records
- **Persistence**: Database-backed
- **Retention**: Configurable (jobs can be cleaned up after completion)

## Validation Summary

### Input Validation
- API key: Must match configured environment variable values
- URL: Must be valid HTTP/HTTPS URL, accessible
- Site name: Filesystem-safe string (alphanumeric, hyphens, underscores), max 255 chars

### Output Validation
- Design System JSON: Must conform to design-tokens.org schema
- All token values: Must be valid CSS values
- Component definitions: Must reference valid tokens or contain valid CSS values
- File paths: Must be valid filesystem paths

### State Validation
- Job status transitions: Must follow valid state machine
- Job deletion: Must occur immediately after `completed` or `failed` status

