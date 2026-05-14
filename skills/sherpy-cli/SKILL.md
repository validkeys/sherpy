---
name: sherpy-cli
description: Validate and convert Sherpy YAML documents using the Sherpy CLI tool. Use when you need to validate business requirements, technical requirements, milestones, milestone tasks, timelines, QA test plans, or gap analysis worksheets against their schemas, or convert them to formatted markdown. Triggers when working with Sherpy YAML files, checking document validity, or generating markdown documentation from planning artifacts.
user-invocable: true
---

# Sherpy CLI

Validates Sherpy YAML documents against schemas and converts them to formatted markdown. Ensures planning documents meet structural requirements before use in implementation workflows.

## When to Use

Invoke this skill when you need to:
- **Validate** Sherpy YAML documents (business requirements, technical requirements, milestones, tasks, timeline, QA plans, gap analysis)
- **Convert** valid YAML to readable markdown documentation
- **Verify** document structure before using in planning workflows
- **Generate** documentation from planning artifacts
- **Check** for validation errors or warnings in planning documents

## Supported Document Types

| Type | File Pattern | Purpose |
|------|-------------|---------|
| `business-requirements` | `business-requirements.yaml` | Business requirements with personas and use cases |
| `technical-requirements` | `technical-requirements.yaml` | Technical specs and architecture decisions |
| `milestones` | `milestones.yaml` | Project milestones with dependencies |
| `milestone-tasks` | `milestone-m*.tasks.yaml` | Detailed task breakdowns (30-150 min each) |
| `timeline` | `timeline.yaml` | Delivery timeline with workback dates |
| `qa-test-plan` | `qa-test-plan.yaml` | QA test suites and test cases |
| `gap-analysis` | `gap-analysis-worksheet.yaml` | Gap analysis worksheets |

## Usage

### Basic Validation

```bash
# Validate a document
sherpy validate -t business-requirements -f docs/business-requirements.yaml

# Validate with strict mode (warnings become errors)
sherpy validate -t business-requirements -f docs/business-requirements.yaml --strict
```

### Convert to Markdown

```bash
# Convert to stdout
sherpy to-markdown -t business-requirements -f docs/business-requirements.yaml

# Convert to file
sherpy to-markdown -t business-requirements -f docs/business-requirements.yaml -o output.md
```

### List Document Types

```bash
sherpy types
```

### Load Skill Prompt Instructions

Output skill prompt instructions for AI agents (CLI-only feature):

```bash
# List available prompts
sherpy prompt --list

# Output specific skill instructions (for AI agents)
sherpy prompt -t business-requirements-interview
sherpy prompt -t implementation-planner
sherpy prompt -t qa-test-plan
```

The `sherpy prompt` command outputs embedded skill instructions without YAML frontmatter. This provides a token-efficient alternative to installing individual skill files. The content is embedded in the binary at build time.

**Available prompts:**
- `gap-analysis-worksheet`, `business-requirements-interview`, `technical-requirements-interview`
- `style-anchors-collection`, `implementation-planner`, `implementation-plan-review`
- `definition-of-done`, `architecture-decision-record`, `delivery-timeline`
- `qa-test-plan`, `developer-summary`, `executive-summary`

See also: **sherpy-cli-planner** skill for orchestrated planning workflows via CLI.

## Validation Features

Sherpy CLI performs comprehensive validation:

### Schema Validation
- ✅ Required fields present and correctly typed
- ✅ Field length constraints (min/max characters)
- ✅ Enum values (priorities, types, strategies)
- ✅ Date formats (YYYY-MM-DD)

### Cross-Field Validation
- ✅ Sequential IDs (FR-1, FR-2, FR-3)
- ✅ ID references (actors in use cases must exist in personas)
- ✅ Dependency resolution (tasks reference valid task IDs)
- ✅ Circular dependency detection

### Business Rules
- ✅ Milestone count matches timeline entries
- ✅ Task durations within max limits
- ✅ Workback date calculations
- ✅ QA coverage percentages
- ✅ Allocation percentages sum to 100%

### Output Modes
- **Default**: Shows errors, warnings shown as info
- **Strict**: Warnings promoted to errors (use in CI/CD)
- **Verbose**: Detailed error messages with context

## Security Features

Sherpy CLI includes multiple security protections:

### Path Traversal Protection
- File paths validated to prevent `../../etc/passwd` attacks
- MaxDepth enforcement
- Symlink detection and blocking

### File Size Limits
- 10MB maximum file size
- Early rejection prevents memory exhaustion
- Protects against DoS attacks

### Secure Permissions
- Output files created with `0600` (user read/write only)
- No group or world access
- Protects sensitive planning documents

### Injection Prevention
- Markdown special characters escaped
- HTML entities encoded
- Prevents XSS in generated documentation

### ReDoS Protection
- MaxIDLength = 100 characters
- Length validation before regex evaluation
- Prevents CPU exhaustion attacks

## Workflow Integration

### Sherpy Planning Workflow

When using Sherpy planning skills, validate documents after generation:

```bash
# After business-requirements-interview
sherpy validate -t business-requirements -f docs/requirements/business-requirements.yaml --strict

# After technical-requirements-interview
sherpy validate -t technical-requirements -f docs/requirements/technical-requirements.yaml --strict

# After implementation-planner
sherpy validate -t milestones -f docs/implementation/milestones.yaml --strict
sherpy validate -t milestone-tasks -f docs/implementation/tasks/milestone-m0.tasks.yaml --strict

# After delivery-timeline
sherpy validate -t timeline -f docs/delivery/timeline.yaml --strict

# After qa-test-plan
sherpy validate -t qa-test-plan -f docs/delivery/qa-test-plan.yaml --strict
```

### Pre-Commit Validation

Add validation to pre-commit hooks to catch errors early:

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Validating Sherpy documents..."

# Find all YAML files in docs/
for file in docs/**/*.yaml; do
  if [ -f "$file" ]; then
    # Determine type from path
    case "$file" in
      *business-requirements.yaml)
        sherpy validate -t business-requirements -f "$file" --strict || exit 1
        ;;
      *technical-requirements.yaml)
        sherpy validate -t technical-requirements -f "$file" --strict || exit 1
        ;;
      *milestones.yaml)
        sherpy validate -t milestones -f "$file" --strict || exit 1
        ;;
      *tasks.yaml)
        sherpy validate -t milestone-tasks -f "$file" --strict || exit 1
        ;;
      *timeline.yaml)
        sherpy validate -t timeline -f "$file" --strict || exit 1
        ;;
      *qa-test-plan.yaml)
        sherpy validate -t qa-test-plan -f "$file" --strict || exit 1
        ;;
      *gap-analysis*.yaml)
        sherpy validate -t gap-analysis -f "$file" --strict || exit 1
        ;;
    esac
  fi
done

echo "✓ All documents validated successfully"
```

### CI/CD Integration

#### GitHub Actions

```yaml
name: Validate Sherpy Documents

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Sherpy CLI
        run: go install github.com/validkeys/sherpy@latest
      
      - name: Validate Planning Documents
        run: |
          sherpy validate -t business-requirements -f docs/requirements/business-requirements.yaml --strict
          sherpy validate -t technical-requirements -f docs/requirements/technical-requirements.yaml --strict
          sherpy validate -t milestones -f docs/implementation/milestones.yaml --strict
```

#### GitLab CI

```yaml
validate-docs:
  stage: test
  image: golang:1.26
  script:
    - go install github.com/validkeys/sherpy@latest
    - sherpy validate -t business-requirements -f docs/requirements/business-requirements.yaml --strict
    - sherpy validate -t technical-requirements -f docs/requirements/technical-requirements.yaml --strict
```

### Documentation Generation

Generate markdown documentation from all planning artifacts:

```bash
#!/bin/bash
# generate-docs.sh

set -e

echo "Generating documentation from YAML sources..."

# Validate all documents first
echo "1. Validating documents..."
sherpy validate -t business-requirements -f docs/requirements/business-requirements.yaml --strict
sherpy validate -t technical-requirements -f docs/requirements/technical-requirements.yaml --strict
sherpy validate -t milestones -f docs/implementation/milestones.yaml --strict

# Convert to markdown
echo "2. Converting to markdown..."
mkdir -p docs/generated

sherpy to-markdown -t business-requirements \
  -f docs/requirements/business-requirements.yaml \
  -o docs/generated/business-requirements.md

sherpy to-markdown -t technical-requirements \
  -f docs/requirements/technical-requirements.yaml \
  -o docs/generated/technical-requirements.md

sherpy to-markdown -t milestones \
  -f docs/implementation/milestones.yaml \
  -o docs/generated/milestones.md

echo "✓ Documentation generated in docs/generated/"
```

## Common Validation Errors

### Sequential ID Errors

```yaml
# ❌ Wrong: Non-sequential IDs
functional_requirements:
  - id: FR-1
  - id: FR-3  # Error: expected FR-2

# ✅ Correct: Sequential IDs
functional_requirements:
  - id: FR-1
  - id: FR-2
```

### Circular Dependency Errors

```yaml
# ❌ Wrong: Circular dependency
milestones:
  - id: m0
    dependencies: [m1]
  - id: m1
    dependencies: [m0]  # Error: circular dependency

# ✅ Correct: Linear dependencies
milestones:
  - id: m0
    dependencies: []
  - id: m1
    dependencies: [m0]
```

### Invalid Reference Errors

```yaml
# ❌ Wrong: Reference to non-existent persona
use_cases:
  - actor: "AdminUser"  # Error: AdminUser not in personas

# ✅ Correct: Reference existing persona
personas:
  - name: "AdminUser"
    role: "Administrator"

use_cases:
  - actor: "AdminUser"  # OK
```

### Task Duration Errors

```yaml
# ❌ Wrong: Task exceeds max duration
tasks:
  - id: m0-001
    estimate_minutes: 200  # Error: exceeds max 150 minutes

# ✅ Correct: Task within limits
tasks:
  - id: m0-001
    estimate_minutes: 120  # OK
```

## Best Practices

### 1. Validate Before Converting

Always validate documents before converting to markdown:

```bash
sherpy validate -t business-requirements -f input.yaml --strict && \
  sherpy to-markdown -t business-requirements -f input.yaml -o output.md
```

### 2. Use Strict Mode in CI/CD

Enable strict mode in automated workflows to catch all issues:

```bash
sherpy validate -t business-requirements -f docs/file.yaml --strict
```

### 3. Validate After Each Planning Step

After running any Sherpy planning skill, validate the output:

```bash
# After /business-requirements-interview
sherpy validate -t business-requirements -f docs/requirements/business-requirements.yaml --strict

# After /implementation-planner
sherpy validate -t milestones -f docs/implementation/milestones.yaml --strict
for file in docs/implementation/tasks/*.yaml; do
  sherpy validate -t milestone-tasks -f "$file" --strict
done
```

### 4. Check File Permissions

Verify output files have secure permissions:

```bash
sherpy to-markdown -t business-requirements -f input.yaml -o output.md
ls -l output.md  # Should show -rw------- (600)
```

### 5. Use Absolute Paths in Scripts

Avoid path confusion in automation:

```bash
DOCS_DIR="$(cd "$(dirname "$0")" && pwd)/docs"
sherpy validate -t business-requirements -f "$DOCS_DIR/requirements/business-requirements.yaml"
```

### 6. Batch Validate Changed Files

Only validate modified documents:

```bash
git diff --name-only HEAD | grep '\.yaml$' | while read file; do
  type=$(basename "$file" .yaml)
  sherpy validate -t "$type" -f "$file" --strict
done
```

## Exit Codes

- `0` - Success (validation passed, conversion succeeded)
- `1` - Validation failed or command error
- `2` - File not found or read error

## Installation

### From Source

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

### Verify Installation

```bash
sherpy types
```

## Troubleshooting

### Error: "file not found"

Check file exists and use absolute paths:

```bash
ls -la docs/business-requirements.yaml
sherpy validate -t business-requirements -f "$(pwd)/docs/business-requirements.yaml"
```

### Error: "unknown document type"

List valid types and check spelling:

```bash
sherpy types
# Use exact type name: business-requirements (not business_requirements)
```

### Error: "failed to parse YAML"

Check YAML syntax:

```bash
yamllint docs/business-requirements.yaml
# Common issues: mixed tabs/spaces, incorrect indentation, unquoted special chars
```

### Error: "path traversal blocked"

Don't use parent directory references:

```bash
# ❌ Blocked
sherpy validate -t business-requirements -f ../../etc/passwd

# ✅ Use absolute paths or paths within working directory
sherpy validate -t business-requirements -f /absolute/path/to/file.yaml
sherpy validate -t business-requirements -f ./docs/file.yaml
```

### Error: "file exceeds maximum size"

Files must be < 10MB:

```bash
# Check file size
stat -f%z docs/file.yaml  # macOS
stat -c%s docs/file.yaml  # Linux

# Maximum: 10485760 bytes (10MB)
```

## Related Skills

- **business-requirements-interview** - Generate `business-requirements.yaml`
- **technical-requirements-interview** - Generate `technical-requirements.yaml`
- **implementation-planner** - Generate `milestones.yaml` and task files
- **delivery-timeline** - Generate `timeline.yaml`
- **qa-test-plan** - Generate `qa-test-plan.yaml`
- **gap-analysis-worksheet** - Generate `gap-analysis-worksheet.yaml`
- **sherpy-flow** - Orchestrate full planning workflow with validation

## Documentation

- **GitHub**: https://github.com/validkeys/sherpy
- **README**: [README.md](../../README.md)
- **Usage Guide**: [USAGE.md](../../USAGE.md)
- **Security**: [SECURITY.md](../../SECURITY.md)

## Examples

### Validate All Documents in a Directory

```bash
#!/bin/bash
# validate-all.sh

DOCS_DIR="docs"
ERRORS=0

for file in "$DOCS_DIR"/**/*.yaml; do
  if [ -f "$file" ]; then
    echo "Validating $file..."
    
    # Determine type from filename/path
    case "$file" in
      *business-requirements.yaml) type="business-requirements" ;;
      *technical-requirements.yaml) type="technical-requirements" ;;
      *milestones.yaml) type="milestones" ;;
      *tasks.yaml) type="milestone-tasks" ;;
      *timeline.yaml) type="timeline" ;;
      *qa-test-plan.yaml) type="qa-test-plan" ;;
      *gap-analysis*.yaml) type="gap-analysis" ;;
      *) continue ;;
    esac
    
    if ! sherpy validate -t "$type" -f "$file" --strict; then
      ERRORS=$((ERRORS + 1))
    fi
  fi
done

if [ $ERRORS -eq 0 ]; then
  echo "✓ All documents validated successfully"
  exit 0
else
  echo "✗ Validation failed for $ERRORS document(s)"
  exit 1
fi
```

### Convert All Documents to Markdown

```bash
#!/bin/bash
# convert-all.sh

mkdir -p docs/generated

TYPES=(
  "business-requirements:docs/requirements/business-requirements.yaml"
  "technical-requirements:docs/requirements/technical-requirements.yaml"
  "milestones:docs/implementation/milestones.yaml"
  "timeline:docs/delivery/timeline.yaml"
  "qa-test-plan:docs/delivery/qa-test-plan.yaml"
)

for entry in "${TYPES[@]}"; do
  IFS=':' read -r type file <<< "$entry"
  
  if [ -f "$file" ]; then
    output="docs/generated/$(basename "$file" .yaml).md"
    echo "Converting $file -> $output"
    
    if sherpy validate -t "$type" -f "$file" --strict; then
      sherpy to-markdown -t "$type" -f "$file" -o "$output"
      echo "✓ Converted $type"
    else
      echo "✗ Validation failed for $file, skipping conversion"
    fi
  fi
done

echo "✓ Conversion complete - see docs/generated/"
```

### Makefile Integration

```makefile
.PHONY: validate validate-strict convert-all docs

# Validate all Sherpy documents
validate:
	@echo "Validating Sherpy documents..."
	@sherpy validate -t business-requirements -f docs/requirements/business-requirements.yaml
	@sherpy validate -t technical-requirements -f docs/requirements/technical-requirements.yaml
	@sherpy validate -t milestones -f docs/implementation/milestones.yaml
	@echo "✓ Validation complete"

# Validate with strict mode (for CI/CD)
validate-strict:
	@echo "Validating Sherpy documents (strict mode)..."
	@sherpy validate -t business-requirements -f docs/requirements/business-requirements.yaml --strict
	@sherpy validate -t technical-requirements -f docs/requirements/technical-requirements.yaml --strict
	@sherpy validate -t milestones -f docs/implementation/milestones.yaml --strict
	@sherpy validate -t timeline -f docs/delivery/timeline.yaml --strict
	@sherpy validate -t qa-test-plan -f docs/delivery/qa-test-plan.yaml --strict
	@echo "✓ Strict validation passed"

# Convert all documents to markdown
convert-all:
	@mkdir -p docs/generated
	@echo "Converting Sherpy documents to markdown..."
	@sherpy to-markdown -t business-requirements -f docs/requirements/business-requirements.yaml -o docs/generated/business-requirements.md
	@sherpy to-markdown -t technical-requirements -f docs/requirements/technical-requirements.yaml -o docs/generated/technical-requirements.md
	@sherpy to-markdown -t milestones -f docs/implementation/milestones.yaml -o docs/generated/milestones.md
	@sherpy to-markdown -t timeline -f docs/delivery/timeline.yaml -o docs/generated/timeline.md
	@sherpy to-markdown -t qa-test-plan -f docs/delivery/qa-test-plan.yaml -o docs/generated/qa-test-plan.md
	@echo "✓ Conversion complete"

# Generate all documentation
docs: validate-strict convert-all
	@echo "✓ Documentation generated in docs/generated/"
```

## Summary

Sherpy CLI is the validation and conversion engine for Sherpy planning documents. Use it to:

1. **Validate** YAML documents against schemas before use
2. **Convert** valid YAML to readable markdown documentation
3. **Integrate** validation into CI/CD pipelines
4. **Enforce** document quality standards with strict mode
5. **Generate** documentation from planning artifacts

Always validate documents after generation by planning skills to catch structural errors early. Use strict mode in automated workflows to ensure production-ready planning documents.
