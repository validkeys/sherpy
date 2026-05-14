# Sherpy CLI

A Go CLI tool for validating and converting Sherpy YAML documents to Markdown.

## Overview

Sherpy CLI (`sherpy`) validates structured YAML documents against predefined schemas and converts them to formatted Markdown. It supports seven document types used in software project planning:

- **business-requirements** - Business requirements with personas, use cases, and functional requirements
- **technical-requirements** - Technical specifications, architecture, and implementation details
- **milestones** - Project milestones with dependencies and success criteria
- **milestone-tasks** - Detailed task breakdowns with time estimates and dependencies
- **timeline** - Delivery timeline with workback dates and phase breakdowns
- **qa-test-plan** - QA test suites with test cases and execution steps
- **gap-analysis** - Gap analysis worksheets with identified gaps and recommendations

## Installation

### From Source

```bash
git clone https://github.com/kydavis/sherpy.git
cd sherpy
make build
sudo make install
```

### Using Go

```bash
go install github.com/kydavis/sherpy@latest
```

### Pre-built Binaries

Download pre-built binaries for macOS and Linux from the [releases page](https://github.com/kydavis/sherpy/releases).

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

## Exit Codes

- `0` - Success
- `1` - Validation failed or command error
- `2` - File not found or read error

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
