# Sherpy CLI

A Go CLI tool for validating and converting Sherpy YAML documents to Markdown, plus syncing plans to Jira Cloud.

## Overview

Sherpy CLI provides two main tools:

### `sherpy` - Document Validation & Conversion
Validates structured YAML documents against predefined schemas and converts them to formatted Markdown. Supports eight document types used in software project planning:

- **business-requirements** - Business requirements with personas, use cases, and functional requirements
- **technical-requirements** - Technical specifications, architecture, and implementation details
- **milestones** - Project milestones with dependencies and success criteria
- **milestone-tasks** - Detailed task breakdowns with time estimates and dependencies
- **timeline** - Delivery timeline with workback dates and phase breakdowns
- **qa-test-plan** - QA test suites with test cases and execution steps
- **gap-analysis** - Gap analysis worksheets with identified gaps and recommendations
- **wireframe-spec** - UX wireframe specifications with pages, components, and visual wireframes

### `sherpy-to-jira` - Jira Cloud Sync ✨ NEW
Automatically syncs Sherpy planning documents to Jira Cloud:
- Creates Epic from developer summary
- Creates Stories for milestones
- Creates Sub-tasks for tasks
- Handles dependencies, story points, and timelines
- Idempotent sync with content hashing

**Quick start:**
```bash
make sherpy-to-jira
export JIRA_EMAIL="your-email@company.com"
export JIRA_TOKEN="your-jira-api-token"
cd your-sherpy-project
sherpy-to-jira init
sherpy-to-jira setup
sherpy-to-jira sync --dry-run
```

See [docs/jira-integration/README.md](./docs/jira-integration/README.md) for full documentation.

## Installation

### Quick Install (Recommended)

**macOS and Linux:**

```bash
curl -fsSL https://raw.githubusercontent.com/validkeys/sherpy/main/install.sh | bash
```

Or download and inspect first:

```bash
curl -fsSL https://raw.githubusercontent.com/validkeys/sherpy/main/install.sh -o install.sh
chmod +x install.sh
./install.sh
```

This script will:
- Check for required dependencies (Go, Git, Make)
- Clone the repository to a temporary directory
- Build the binary from source
- Install to `/usr/local/bin` (may prompt for sudo)
- Optionally install the `sherpy-cli-planner` skill for Claude Code
- Verify the installation
- Clean up temporary files

**Optional:** If Claude Code is detected, the installer will offer to install the `sherpy-cli-planner` skill, which provides a `/sherpy-cli-planner` command that orchestrates the full 13-step planning workflow using sherpy CLI prompts.

**Requirements:**
- Go 1.26 or later
- Git
- Make
- Node.js/npm (optional, for Claude Code skill installation via `npx skills`)

### From Source (Manual)

```bash
git clone https://github.com/validkeys/sherpy.git
cd sherpy
make build
sudo make install
```

### Using Go

```bash
go install github.com/validkeys/sherpy@latest
```

### Pre-built Binaries

Download pre-built binaries for macOS and Linux from the [releases page](https://github.com/validkeys/sherpy/releases).

## Uninstall

To remove Sherpy from your system:

```bash
# Using the uninstall script
curl -fsSL https://raw.githubusercontent.com/validkeys/sherpy/main/uninstall.sh | bash

# Or manually
sudo rm /usr/local/bin/sherpy

# Or with make (if in the repo directory)
make uninstall
```

## Quick Start

```bash
# 1. List available document types
sherpy types

# 2. Validate a document
sherpy validate -t business-requirements -f docs/business-requirements.yaml

# 3. Convert to markdown
sherpy to-markdown -t business-requirements -f docs/business-requirements.yaml -o output.md

# 4. Output skill prompt instructions (for AI agents)
sherpy prompt -t business-requirements-interview

# 5. List available prompts
sherpy prompt --list

# 6. Validate with strict mode (warnings → errors)
sherpy validate -t business-requirements -f docs/business-requirements.yaml --strict

# 7. View help for any command
sherpy validate --help
```

## Usage

### List Document Types

List all supported document types and their file patterns:

```bash
sherpy types
```

Output:
```
Available document types:
  business-requirements    business-requirements.yaml
  technical-requirements   technical-requirements.yaml
  milestones              milestones.yaml
  milestone-tasks         milestone-*.tasks.yaml
  timeline                timeline.yaml
  qa-test-plan            qa-test-plan.yaml
  gap-analysis            gap-analysis-worksheet.yaml
  wireframe-spec          wireframe-spec.yaml
```

### Validate Documents

Validate a YAML document against its schema:

```bash
sherpy validate -t <type> -f <file>
```

Examples:

```bash
# Validate business requirements
sherpy validate -t business-requirements -f docs/business-requirements.yaml

# Validate with strict mode (warnings become errors)
sherpy validate -t business-requirements -f docs/business-requirements.yaml --strict

# Validate milestone tasks
sherpy validate -t milestone-tasks -f docs/milestone-m1.tasks.yaml
```

#### Validation Features

- **Schema validation** - Ensures all required fields are present and correctly typed
- **Cross-field validation** - Validates references between fields (e.g., FR-IDs, dependencies)
- **Sequential ID validation** - Ensures IDs follow sequential patterns (FR-001, FR-002, etc.)
- **Date validation** - Validates date formats and workback calculations
- **Dependency graph validation** - Detects circular dependencies in milestones and tasks
- **Custom business rules** - Type-specific validation rules (allocation percentages, date ranges, etc.)

### Output Skill Prompts

Output skill prompt instructions to stdout (for AI agents):

```bash
# List available prompts
sherpy prompt --list

# Output specific prompt instructions
sherpy prompt -t business-requirements-interview
sherpy prompt -t implementation-planner
sherpy prompt -t qa-test-plan
```

This command strips YAML frontmatter from `skills/*/SKILL.md` files and outputs the instructional content. It's designed for AI agents that need step-by-step guidance for planning tasks. The prompt content is embedded in the binary at build time, so no external files are required.

Available prompts:
- `gap-analysis-worksheet` - Analyzes initial requirements for gaps
- `business-requirements-interview` - Gathers business requirements
- `technical-requirements-interview` - Gathers technical requirements
- `style-anchors-collection` - Documents code patterns
- `ux-wireframe-planning` - Detects UI changes and generates wireframe specs
- `implementation-planner` - Generates implementation plans
- `implementation-plan-review` - Reviews implementation plans
- `definition-of-done` - Defines milestone acceptance criteria
- `architecture-decision-record` - Documents architectural decisions
- `delivery-timeline` - Generates delivery timelines
- `qa-test-plan` - Generates QA test plans
- `developer-summary` - Generates developer summaries
- `executive-summary` - Generates executive summaries

### Describe Document Specifications

Output the formal YAML specification for a document type, so an LLM or developer can see the exact schema, fields, and validation rules a document must conform to:

```bash
# List document types that have an embedded specification
sherpy describe --list

# Print the specification for a specific type
sherpy describe -t business-requirements
sherpy describe -t milestones
sherpy describe -t qa-test-plan
```

This command outputs the embedded `spec.md` for the requested type. The spec content is embedded in the binary at build time, so no external files are required.

Available specifications:
- `business-requirements` - Business requirements with personas and use cases
- `technical-requirements` - Technical specs and architecture
- `milestones` - Project milestones with dependencies
- `milestone-tasks` - Detailed task breakdowns
- `timeline` - Delivery timeline and workback dates
- `qa-test-plan` - QA test suites and test cases
- `gap-analysis` - Gap analysis worksheets

## Token Efficiency

The `sherpy prompt` command and `sherpy-cli-planner` skill provide a token-efficient alternative to installing all 17 individual planning skills in Claude Code.

### Calculation Methodology

**Traditional approach:** Install all skill files in Claude Code

```
skills/
  business-requirements-interview/SKILL.md       8 KB
  technical-requirements-interview/SKILL.md     10 KB
  gap-analysis-worksheet/SKILL.md                6 KB
  architecture-decision-record/SKILL.md          5 KB
  style-anchors-collection/SKILL.md             13 KB
  implementation-planner/SKILL.md               28 KB
  implementation-plan-review/SKILL.md           16 KB
  definition-of-done/SKILL.md                   10 KB
  delivery-timeline/SKILL.md                    16 KB
  qa-test-plan/SKILL.md                          6 KB
  developer-summary/SKILL.md                    10 KB
  executive-summary/SKILL.md                    13 KB
  implementation-plan-best-practices/SKILL.md    9 KB
  sherpy-flow/SKILL.md                          13 KB
  sherpy-cli/SKILL.md                           18 KB
  create-continuation-prompt/SKILL.md            2 KB
  sherpy-cli-planner/SKILL.md                   11 KB
  ────────────────────────────────────────────────
  TOTAL: ~202 KB (all skills loaded in context)
```

**CLI approach:** Install orchestrator + load prompts on-demand

```
skills/
  sherpy-cli-planner/SKILL.md                   11 KB
  sherpy-cli/SKILL.md                           18 KB
  ────────────────────────────────────────────────
  Baseline: 29 KB

Per-step (loaded via sherpy prompt -t <type>):
  Step 1: gap-analysis-worksheet                 6 KB
  Step 2: business-requirements-interview        8 KB
  (only one step active at a time)
  ────────────────────────────────────────────────
  Typical: 29 KB + 8 KB = 37 KB total
  Maximum: 29 KB + 28 KB = 57 KB (when using implementation-planner)
```

### Token Savings

- **Traditional:** All 202 KB loaded simultaneously
- **CLI approach:** 29-57 KB (only active step loaded)
- **Savings:** 72-86% reduction in context window usage

### When to Use Each Approach

**Use traditional skills** if:
- You're using Claude Code interactively
- You want slash commands available (`/business-requirements-interview`)
- You jump between workflow steps frequently

**Use CLI approach** if:
- You're running workflows via CLI automation
- You want to minimize token usage
- You follow the 13-step workflow sequentially
- You're integrating with CI/CD or scripts

Both approaches produce identical output artifacts.

## Implementation Plan Audiences

Sherpy supports three audience types for implementation plans:

### AI Agent (Full Detail)
Generated tasks include:
- Step-by-step numbered implementation instructions
- Explicit code examples with file paths and line numbers
- TDD checklists with test-first requirements
- Detailed constraints ("ONLY use X", "NEVER use Y")
- Drift policies for autonomous development
- Exact validation commands with expected outputs

**Best for:** Claude Code, autonomous AI development, learning projects

### Human Developers (High-Level)
Generated tasks include:
- Clear objectives and key requirements
- Style anchor references for patterns
- High-level constraints and technology choices
- Success criteria without prescriptive steps
- General validation guidance

**Best for:** Experienced development teams, senior developers, architecture planning

### Hybrid (Moderate Detail)
Generated tasks include:
- Clear objectives with implementation approach
- Style anchor references
- Key decision points and guidance
- Constraints and pattern requirements
- Validation commands without expected outputs

**Best for:** Mixed teams, pair programming with AI, handoff documentation, junior developers

### Selecting an Audience

When running `/sherpy-flow` or `/sherpy-cli-planner`, you'll be prompted to choose an audience during Step 5 (Implementation Planning). The same planning artifacts (milestones.yaml and task files) are generated, but with instruction detail appropriate for your audience.

You can regenerate plans with a different audience at any time.

## UX/Wireframe Planning

Step 6 of the Sherpy pipeline detects whether a project involves frontend/UI work and, when it does, generates a structured wireframe specification plus visual wireframes. For projects with no frontend changes, the step auto-skips after generating a minimal spec with `has_ui_changes: false`.

### How It Works

1. **Detection** — Scans technical requirements (React, Next.js, Vue, etc.) and implementation tasks for UI-related work
2. **Spec Generation** — Extracts pages, components, states, and user flows into `ux/wireframe-spec.yaml`
3. **Wireframe Generation** — Creates a self-contained Pencil `.pen` file with a pre-built component library and page wireframes

### Exemplar Template

The wireframe step uses an **exemplar `.pen` file** as the starting point — a template containing a full wireframe component library with design tokens, reusable components, and slot definitions. Instead of building components from scratch, the agent:

1. **Copies** the template to `ux/wireframes.pen` (gets all variables + reusable components in one shot)
2. **Reads** the component structure via `pencil_batch_get` to discover available components, their IDs, and slots
3. **Removes** example pages (keeps only the reusable component definitions)
4. **Adds** project-specific pages as `ref` instances against the discovered components

The exemplar ships with these pre-built components:

| Category | Components |
|----------|-----------|
| Layout | `wf-page-shell`, `wf-header`, `wf-sidebar`, `wf-content-area`, `wf-footer` |
| Content | `wf-card`, `wf-section`, `wf-placeholder-box`, `wf-divider` |
| Form | `wf-form`, `wf-form-field`, `wf-button`, `wf-checkbox`, `wf-radio`, `wf-dropdown`, `wf-textarea` |
| Data | `wf-table`, `wf-table-row`, `wf-list-item`, `wf-chart` |
| Navigation | `wf-nav-item`, `wf-breadcrumb`, `wf-tab` |
| Annotation | `wf-label`, `wf-state-badge`, `wf-note` |

### Custom Templates

To use your own component library instead of the built-in template, provide a path when the skill runs:

```
Use exemplar wireframe template?
  1. Built-in template (default)
  2. Custom path: [provide path to your .pen file]
```

Custom templates are useful for teams that want consistent wireframe styling across projects (brand colors, different sidebar widths, custom components).

### Output Files

```
ux/
├── wireframe-spec.yaml   # Structured spec (pages, components, flows)
├── wireframes.pen        # All components + page wireframes (self-contained)
├── PAGE-001.png          # Exported preview
├── PAGE-002.png          # Exported preview
└── ...
```

### Consistency Rules

The wireframe skill enforces seven consistency rules:

1. **Single file** — All components and pages in one `ux/wireframes.pen` (Pencil doesn't support cross-file refs)
2. **No hardcoded colors** — All fills/strokes use `$wf-*` variables
3. **No raw shapes for known components** — Use `ref` instances
4. **Component structure** — Pages composed from `wf-page-shell` and its slots
5. **Consistent dimensions** — Literal `1440`x`900` for desktop (not `$wf-*` variable refs, which Pencil silently drops on width/height)
6. **Label everything** — All component instances have content-specific labels
7. **State annotations** — State badges where spec defines states

### Convert to Markdown

Convert a YAML document to Markdown:

```bash
sherpy to-markdown -t <type> -f <file> [-o <output>]
```

Examples:

```bash
# Convert to stdout
sherpy to-markdown -t business-requirements -f docs/business-requirements.yaml

# Convert to file
sherpy to-markdown -t business-requirements -f docs/business-requirements.yaml -o output.md

# Convert all document types
for type in business-requirements technical-requirements milestones timeline qa-test-plan; do
  sherpy to-markdown -t $type -f docs/$type.yaml -o docs/$type.md
done
```

#### Conversion Features

- **Structured formatting** - Consistent markdown structure with headers, tables, and lists
- **Table rendering** - Complex data rendered as markdown tables
- **Nested lists** - Hierarchical data rendered as nested bullet lists
- **Metadata preservation** - All important metadata included in the output
- **Readable output** - Human-friendly formatting optimized for documentation

## Document Type Examples

### Business Requirements

```bash
# Validate
sherpy validate -t business-requirements -f business-requirements.yaml

# Convert to markdown
sherpy to-markdown -t business-requirements -f business-requirements.yaml -o business-requirements.md
```

**Validates:**
- Project metadata (name, problem statement, objectives)
- User personas with roles and goals
- Use cases with actors and flows
- Functional requirements with sequential FR-IDs
- Success criteria and constraints
- Risks and assumptions

### Technical Requirements

```bash
sherpy validate -t technical-requirements -f technical-requirements.yaml
sherpy to-markdown -t technical-requirements -f technical-requirements.yaml -o technical.md
```

**Validates:**
- Architecture overview and system components
- Technology stack and dependencies
- Data models and API specifications
- Security and performance requirements
- Deployment and scalability constraints

### Milestones

```bash
sherpy validate -t milestones -f milestones.yaml
sherpy to-markdown -t milestones -f milestones.yaml -o milestones.md
```

**Validates:**
- Milestone definitions with sequential IDs
- Dependency relationships (no circular dependencies)
- Success criteria and deliverables
- Estimated durations and ordering strategy

### Milestone Tasks

```bash
sherpy validate -t milestone-tasks -f milestone-m1.tasks.yaml
sherpy to-markdown -t milestone-tasks -f milestone-m1.tasks.yaml -o tasks-m1.md
```

**Validates:**
- Task definitions with sequential IDs
- Task types (feature, test, review, docs)
- Time estimates (max 150 minutes per task)
- Dependencies within the milestone
- File operations (create, modify, touch_only)
- Quality gates at each stage

### Timeline

```bash
sherpy validate -t timeline -f timeline.yaml
sherpy to-markdown -t timeline -f timeline.yaml -o timeline.md
```

**Validates:**
- Development phases and milestone scheduling
- Post-development phases (PR, QA, signoff)
- Workback date calculations
- Day-by-day breakdown consistency
- Total delivery days vs. development days

### QA Test Plan

```bash
sherpy validate -t qa-test-plan -f qa-test-plan.yaml
sherpy to-markdown -t qa-test-plan -f qa-test-plan.yaml -o qa-plan.md
```

**Validates:**
- Test suites with unique suite IDs
- Test cases by type (positive, negative, edge, security, performance)
- Test steps with expected results
- Priority levels and functional requirement mappings

### Gap Analysis

```bash
sherpy validate -t gap-analysis -f gap-analysis-worksheet.yaml
sherpy to-markdown -t gap-analysis -f gap-analysis-worksheet.yaml -o gaps.md
```

**Validates:**
- Gap identification with sequential gap IDs
- Gap categories and priorities
- Recommendations and answers
- Total gap count consistency

### Wireframe Spec

```bash
sherpy validate -t wireframe-spec -f ux/wireframe-spec.yaml
sherpy to-markdown -t wireframe-spec -f ux/wireframe-spec.yaml -o ux/wireframe-spec.md
```

**Validates:**
- UI change detection flag (`has_ui_changes`)
- Sequential page IDs (PAGE-001, PAGE-002, etc.)
- Component references and cross-type ID validation
- Conditional validation (pages only required when `has_ui_changes: true`)
- Metadata and pen file references

## Development

### Build from Source

```bash
# Build binary
make build

# Run tests
make test

# Run linters
make lint

# Run integration tests
make integration-test

# Clean build artifacts
make clean
```

### Run Tests

```bash
# Unit tests
go test ./... -v

# Integration tests
go test ./integration -v

# With coverage
go test ./... -cover
```

### Project Structure

```
sherpy/
├── cmd/              # CLI command implementations
│   ├── root.go       # Root command and flags
│   ├── validate.go   # Validate command
│   └── to-markdown.go # Markdown conversion command
├── schema/           # Document schemas and validators
│   ├── business_requirements.go
│   ├── technical_requirements.go
│   ├── milestones.go
│   ├── milestone_tasks.go
│   ├── timeline.go
│   ├── qa_test_plan.go
│   ├── gap_analysis.go
│   └── registry.go   # Schema registry
├── markdown/         # Markdown converters
│   ├── converter.go  # Template engine
│   ├── business_requirements.go
│   ├── technical_requirements.go
│   ├── milestones.go
│   ├── milestone_tasks.go
│   ├── timeline.go
│   ├── qa_test_plan.go
│   └── gap_analysis.go
├── integration/      # Integration tests
│   └── integration_test.go
├── main.go           # Entry point
├── Makefile          # Build targets
└── .goreleaser.yml   # Release configuration
```

## Security Features

Sherpy CLI includes multiple security protections to ensure safe operation:

### Path Traversal Protection

Sherpy validates file paths to prevent directory traversal attacks while allowing legitimate access to project files.

**Path Policy:**
- ✓ **Allowed:** Current directory and subdirectories
- ✓ **Allowed:** One level of parent directory traversal (`../docs`)
- ✗ **Blocked:** Two or more levels of parent traversal (`../../etc`)

**Examples:**
```bash
# Allowed paths
sherpy validate -f ./requirements.yaml -t business-requirements
sherpy validate -f docs/business-requirements.yaml -t business-requirements
sherpy validate -f ../docs/requirements.yaml -t business-requirements

# Blocked paths
sherpy validate -f ../../etc/passwd -t business-requirements
# Error: path traversal detected: ../../etc/passwd
```

**Rationale:**

The one-level traversal allowance enables legitimate use cases like:
- Accessing sibling directories in multi-project workspaces
- Running sherpy from a different directory than your documents
- Shared tooling in monorepos

Since sherpy only **reads** files (no writes or execution) and respects your filesystem permissions, the security risk is limited to reading files you already have access to.

**Additional Protections:**
- Paths are normalized using `filepath.Clean`
- Absolute path validation prevents bypass attempts
- Your OS filesystem permissions still apply
- Combined with 10MB file size limit below

### File Size Limits
- **10MB maximum** - Files larger than 10MB are rejected before processing
- **Early validation** - Size checked before content is read
- **Prevents**: Memory exhaustion, DoS attacks via large files

### Secure File Permissions
- **0600 permissions** - Output files are created with user-only read/write permissions
- **No group/world access** - Protects sensitive planning documents
- **Applies to**: All markdown output files

### Injection Prevention
- **Markdown escaping** - User content is escaped to prevent markdown injection
- **HTML escaping** - HTML special characters are escaped to prevent XSS
- **Template safety** - Panic recovery for template execution errors
- **Prevents**: XSS attacks, markdown injection, malicious template rendering

### ReDoS Protection
- **MaxIDLength = 100** - IDs are length-checked before regex evaluation
- **Pre-validation** - Length validation occurs before expensive regex operations
- **Prevents**: Regular expression denial of service attacks

### Error Handling
- **Graceful degradation** - Errors are caught and reported without crashing
- **Panic recovery** - Template execution panics are recovered
- **Clear error messages** - Security errors provide actionable feedback

### Best Practices
```bash
# Validate file permissions after conversion
sherpy to-markdown -t business-requirements -f input.yaml -o output.md
ls -l output.md  # Should show -rw------- (600)

# Check file size before processing
stat -f%z input.yaml  # macOS
stat -c%s input.yaml  # Linux
# Reject if > 10MB (10485760 bytes)

# Use absolute paths when possible
sherpy validate -t milestones -f /absolute/path/to/milestones.yaml

# Run in restricted environments for untrusted input
docker run --rm -v $(pwd):/data sherpy validate -t business-requirements -f /data/input.yaml
```

## Exit Codes

- `0` - Success
- `1` - Validation failed or command error
- `2` - File not found or read error
- **Security errors return exit code 1 with descriptive messages**

## Requirements

- Go 1.26 or later

## Dependencies

- [cobra](https://github.com/spf13/cobra) - CLI framework
- [yaml.v3](https://github.com/go-yaml/yaml) - YAML parsing

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## Related Projects

This CLI tool is part of the Sherpy ecosystem:

- **[Sherpy Skills](https://github.com/validkeys/sherpy)** - Claude Code skills for structured requirements gathering and planning
- **Sherpy CLI** (this project) - Validation and conversion tools for Sherpy documents

## Authors

Developed by [Valid Keys](https://github.com/validkeys)
