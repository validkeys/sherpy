# Sherpy CLI Usage Guide

Complete guide to using Sherpy CLI for validating and converting YAML documents.

## Table of Contents

- [Basic Commands](#basic-commands)
- [Document Types](#document-types)
- [Validation Examples](#validation-examples)
- [Conversion Examples](#conversion-examples)
- [Advanced Usage](#advanced-usage)
- [Common Workflows](#common-workflows)
- [Troubleshooting](#troubleshooting)

## Basic Commands

### List Document Types

Show all supported document types:

```bash
sherpy types
```

### Get Help

```bash
# General help
sherpy --help

# Command-specific help
sherpy validate --help
sherpy to-markdown --help
```

### Check Version

```bash
sherpy version  # If version command is available
```

### Output Skill Prompts

Output skill prompt instructions for AI agents:

```bash
# List all available prompts
sherpy prompt --list

# Output specific prompt instructions
sherpy prompt -t business-requirements-interview
sherpy prompt -t implementation-planner
sherpy prompt -t qa-test-plan

# Get help for prompt command
sherpy prompt --help
```

The `prompt` command extracts skill instructions from embedded SKILL.md files and outputs them to stdout without YAML frontmatter. This is designed for AI agents that need step-by-step guidance for planning workflow steps.

**Use cases:**
- Loading skill instructions into AI agent context
- Building orchestrated planning workflows
- Token-efficient alternative to installing individual skill files
- Embedding planning guidance in CI/CD pipelines

**Available prompts:**
- `gap-analysis-worksheet` - Analyzes initial requirements for gaps
- `business-requirements-interview` - Gathers business requirements
- `technical-requirements-interview` - Gathers technical requirements
- `style-anchors-collection` - Documents code patterns as style anchors
- `implementation-planner` - Generates implementation plans with TDD tasks
- `implementation-plan-review` - Reviews plans against best practices
- `definition-of-done` - Defines milestone acceptance criteria
- `architecture-decision-record` - Documents architectural decisions
- `delivery-timeline` - Generates delivery timelines
- `qa-test-plan` - Generates QA test plans
- `developer-summary` - Generates developer summaries
- `executive-summary` - Generates executive summaries

## Document Types

Sherpy supports seven document types:

| Type | File Pattern | Description |
|------|-------------|-------------|
| `business-requirements` | `business-requirements.yaml` | Business requirements with personas and use cases |
| `technical-requirements` | `technical-requirements.yaml` | Technical specs and architecture |
| `milestones` | `milestones.yaml` | Project milestones with dependencies |
| `milestone-tasks` | `milestone-m*.tasks.yaml` | Detailed task breakdowns |
| `timeline` | `timeline.yaml` | Delivery timeline and workback dates |
| `qa-test-plan` | `qa-test-plan.yaml` | QA test suites and test cases |
| `gap-analysis` | `gap-analysis-worksheet.yaml` | Gap analysis worksheets |

## Validation Examples

### Basic Validation

```bash
# Validate a business requirements document
sherpy validate -t business-requirements -f docs/business-requirements.yaml

# Validate milestone tasks
sherpy validate -t milestone-tasks -f docs/milestone-m0.tasks.yaml
```

### Strict Mode

Convert warnings to errors:

```bash
sherpy validate -t business-requirements -f docs/business-requirements.yaml --strict
```

**Use strict mode when:**
- Validating for production use
- Ensuring 100% compliance
- CI/CD pipelines
- Pre-commit hooks

### Verbose Output

```bash
sherpy validate -t business-requirements -f docs/business-requirements.yaml --verbose
```

### Validate All Documents

```bash
#!/bin/bash
# validate-all.sh

for file in docs/*.yaml; do
  type=$(basename "$file" .yaml)
  echo "Validating $file..."
  sherpy validate -t "$type" -f "$file" || exit 1
done

echo "✓ All documents validated successfully"
```

## Conversion Examples

### Convert to Stdout

```bash
# Output to terminal
sherpy to-markdown -t business-requirements -f docs/business-requirements.yaml
```

### Convert to File

```bash
# Save to file
sherpy to-markdown -t business-requirements -f docs/business-requirements.yaml -o output.md
```

### Convert Multiple Documents

```bash
#!/bin/bash
# convert-all.sh

TYPES=(
  "business-requirements"
  "technical-requirements"
  "milestones"
  "timeline"
  "qa-test-plan"
)

for type in "${TYPES[@]}"; do
  input="docs/$type.yaml"
  output="docs/generated/$type.md"
  
  if [ -f "$input" ]; then
    echo "Converting $type..."
    sherpy to-markdown -t "$type" -f "$input" -o "$output"
  fi
done

echo "✓ Conversion complete"
```

### Pipeline Usage

```bash
# Validate then convert
sherpy validate -t business-requirements -f input.yaml && \
  sherpy to-markdown -t business-requirements -f input.yaml -o output.md

# Convert and view
sherpy to-markdown -t business-requirements -f input.yaml | less

# Convert and copy to clipboard (macOS)
sherpy to-markdown -t business-requirements -f input.yaml | pbcopy

# Convert and copy to clipboard (Linux)
sherpy to-markdown -t business-requirements -f input.yaml | xclip -selection clipboard
```

## Advanced Usage

### Environment Variables

```bash
# Set default input directory
export SHERPY_INPUT_DIR="./docs"

# Set default output directory
export SHERPY_OUTPUT_DIR="./docs/generated"
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
      
      - name: Install Sherpy
        run: |
          go install github.com/kydavis/sherpy@latest
      
      - name: Validate Documents
        run: |
          sherpy validate -t business-requirements -f docs/business-requirements.yaml --strict
          sherpy validate -t technical-requirements -f docs/technical-requirements.yaml --strict
          sherpy validate -t milestones -f docs/milestones.yaml --strict
```

#### GitLab CI

```yaml
validate-docs:
  stage: test
  image: golang:1.26
  script:
    - go install github.com/kydavis/sherpy@latest
    - sherpy validate -t business-requirements -f docs/business-requirements.yaml --strict
    - sherpy validate -t technical-requirements -f docs/technical-requirements.yaml --strict
```

### Pre-commit Hook

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash

echo "Validating Sherpy documents..."

# Find all YAML files in docs/
for file in docs/*.yaml; do
  if [ -f "$file" ]; then
    # Determine type from filename
    case "$file" in
      *business-requirements.yaml)
        type="business-requirements"
        ;;
      *technical-requirements.yaml)
        type="technical-requirements"
        ;;
      *milestones.yaml)
        type="milestones"
        ;;
      *timeline.yaml)
        type="timeline"
        ;;
      *qa-test-plan.yaml)
        type="qa-test-plan"
        ;;
      *gap-analysis*.yaml)
        type="gap-analysis"
        ;;
      *tasks.yaml)
        type="milestone-tasks"
        ;;
      *)
        continue
        ;;
    esac
    
    echo "Validating $file..."
    if ! sherpy validate -t "$type" -f "$file"; then
      echo "❌ Validation failed for $file"
      exit 1
    fi
  fi
done

echo "✓ All documents validated successfully"
```

Make it executable:

```bash
chmod +x .git/hooks/pre-commit
```

### Makefile Integration

```makefile
.PHONY: validate convert validate-all convert-all

validate:
	@sherpy validate -t business-requirements -f docs/business-requirements.yaml

validate-strict:
	@sherpy validate -t business-requirements -f docs/business-requirements.yaml --strict

validate-all:
	@echo "Validating all documents..."
	@sherpy validate -t business-requirements -f docs/business-requirements.yaml --strict
	@sherpy validate -t technical-requirements -f docs/technical-requirements.yaml --strict
	@sherpy validate -t milestones -f docs/milestones.yaml --strict
	@sherpy validate -t timeline -f docs/timeline.yaml --strict
	@sherpy validate -t qa-test-plan -f docs/qa-test-plan.yaml --strict
	@echo "✓ All documents validated"

convert:
	@sherpy to-markdown -t business-requirements -f docs/business-requirements.yaml -o docs/business-requirements.md

convert-all:
	@mkdir -p docs/generated
	@sherpy to-markdown -t business-requirements -f docs/business-requirements.yaml -o docs/generated/business-requirements.md
	@sherpy to-markdown -t technical-requirements -f docs/technical-requirements.yaml -o docs/generated/technical-requirements.md
	@sherpy to-markdown -t milestones -f docs/milestones.yaml -o docs/generated/milestones.md
	@sherpy to-markdown -t timeline -f docs/timeline.yaml -o docs/generated/timeline.md
	@sherpy to-markdown -t qa-test-plan -f docs/qa-test-plan.yaml -o docs/generated/qa-test-plan.md
	@echo "✓ All documents converted"
```

## Common Workflows

### Workflow 1: Create New Document

```bash
# 1. Copy example template
cp docs/specifications/business-requirements/example.yaml docs/business-requirements.yaml

# 2. Edit the document
vim docs/business-requirements.yaml

# 3. Validate while editing
sherpy validate -t business-requirements -f docs/business-requirements.yaml

# 4. Validate strictly before committing
sherpy validate -t business-requirements -f docs/business-requirements.yaml --strict

# 5. Convert to markdown for review
sherpy to-markdown -t business-requirements -f docs/business-requirements.yaml -o docs/business-requirements.md
```

### Workflow 2: Review Changes

```bash
# 1. Validate modified document
sherpy validate -t business-requirements -f docs/business-requirements.yaml

# 2. Convert to markdown
sherpy to-markdown -t business-requirements -f docs/business-requirements.yaml -o /tmp/current.md

# 3. Compare with previous version
git show HEAD:docs/business-requirements.yaml | sherpy to-markdown -t business-requirements -f - > /tmp/previous.md
diff /tmp/previous.md /tmp/current.md
```

### Workflow 3: Batch Processing

```bash
# Process all documents in a directory
find docs -name "*.yaml" -type f | while read file; do
  echo "Processing $file..."
  
  # Determine type from filename
  type=$(basename "$file" .yaml)
  
  # Validate
  if sherpy validate -t "$type" -f "$file"; then
    # Convert if valid
    output="${file%.yaml}.md"
    sherpy to-markdown -t "$type" -f "$file" -o "$output"
    echo "✓ Converted to $output"
  else
    echo "✗ Validation failed for $file"
  fi
done
```

### Workflow 4: Documentation Generation

```bash
#!/bin/bash
# generate-docs.sh

set -e

echo "Generating documentation from YAML sources..."

# Create output directory
mkdir -p docs/generated

# Validate all documents first
echo "1. Validating documents..."
sherpy validate -t business-requirements -f docs/business-requirements.yaml --strict
sherpy validate -t technical-requirements -f docs/technical-requirements.yaml --strict
sherpy validate -t milestones -f docs/milestones.yaml --strict

# Convert to markdown
echo "2. Converting to markdown..."
sherpy to-markdown -t business-requirements -f docs/business-requirements.yaml -o docs/generated/business-requirements.md
sherpy to-markdown -t technical-requirements -f docs/technical-requirements.yaml -o docs/generated/technical-requirements.md
sherpy to-markdown -t milestones -f docs/milestones.yaml -o docs/generated/milestones.md

# Generate index
echo "3. Generating index..."
cat > docs/generated/README.md <<EOF
# Project Documentation

Auto-generated documentation from YAML sources.

## Documents

- [Business Requirements](business-requirements.md)
- [Technical Requirements](technical-requirements.md)
- [Milestones](milestones.md)

Generated on: $(date)
EOF

echo "✓ Documentation generated in docs/generated/"
```

## Troubleshooting

### Common Errors

#### Error: "file not found"

```bash
# Check file exists
ls -la docs/business-requirements.yaml

# Use absolute path
sherpy validate -t business-requirements -f "$(pwd)/docs/business-requirements.yaml"
```

#### Error: "unknown document type"

```bash
# List valid types
sherpy types

# Ensure exact type name match
sherpy validate -t business-requirements -f docs/file.yaml  # Correct
sherpy validate -t business_requirements -f docs/file.yaml  # Wrong (underscore)
```

#### Error: "failed to parse YAML"

```bash
# Check YAML syntax
yamllint docs/business-requirements.yaml

# Common issues:
# - Mixed tabs and spaces
# - Missing colons
# - Incorrect indentation
# - Unquoted special characters
```

#### Error: "path traversal blocked"

```bash
# Don't use parent directory references
sherpy validate -t business-requirements -f ../../etc/passwd  # Blocked

# Use absolute paths or paths within working directory
sherpy validate -t business-requirements -f /absolute/path/to/file.yaml  # OK
sherpy validate -t business-requirements -f ./docs/file.yaml  # OK
```

#### Error: "file exceeds maximum size"

```bash
# Check file size
stat -f%z docs/file.yaml  # macOS
stat -c%s docs/file.yaml  # Linux

# Files must be < 10MB (10485760 bytes)
# Split large files or reduce content
```

### Validation Errors

#### Sequential ID errors

```yaml
# Wrong: Non-sequential IDs
functional_requirements:
  - id: FR-1
  - id: FR-3  # Error: expected FR-2

# Correct: Sequential IDs
functional_requirements:
  - id: FR-1
  - id: FR-2
```

#### Circular dependency errors

```yaml
# Wrong: Circular dependency
milestones:
  - id: m0
    dependencies: [m1]
  - id: m1
    dependencies: [m0]  # Error: circular dependency

# Correct: Linear dependencies
milestones:
  - id: m0
    dependencies: []
  - id: m1
    dependencies: [m0]
```

#### Invalid references

```yaml
# Wrong: Reference to non-existent persona
use_cases:
  - actor: "AdminUser"  # Error: AdminUser not in personas

# Correct: Reference existing persona
personas:
  - name: "AdminUser"
    role: "Administrator"

use_cases:
  - actor: "AdminUser"  # OK
```

### Debug Mode

```bash
# Enable verbose output
sherpy validate -t business-requirements -f docs/file.yaml --verbose

# Show full stack trace (if implemented)
SHERPY_DEBUG=1 sherpy validate -t business-requirements -f docs/file.yaml
```

### Getting Help

- **GitHub Issues**: https://github.com/kydavis/sherpy/issues
- **Documentation**: https://github.com/kydavis/sherpy/tree/main/docs
- **Examples**: See `docs/specifications/*/example.yaml`

## Best Practices

1. **Always validate before converting**
   ```bash
   sherpy validate -t business-requirements -f input.yaml && \
     sherpy to-markdown -t business-requirements -f input.yaml -o output.md
   ```

2. **Use strict mode in CI/CD**
   ```bash
   sherpy validate -t business-requirements -f docs/file.yaml --strict
   ```

3. **Version control YAML sources, not generated markdown**
   ```gitignore
   # .gitignore
   docs/generated/
   *.md
   ```

4. **Use absolute paths in scripts**
   ```bash
   DOCS_DIR="$(cd "$(dirname "$0")" && pwd)/docs"
   sherpy validate -t business-requirements -f "$DOCS_DIR/business-requirements.yaml"
   ```

5. **Check file permissions after conversion**
   ```bash
   sherpy to-markdown -t business-requirements -f input.yaml -o output.md
   ls -l output.md  # Should show -rw------- (600)
   ```

6. **Validate on file changes**
   ```bash
   # Use fswatch or inotifywait
   fswatch -o docs/*.yaml | xargs -n1 -I{} make validate-all
   ```

## Performance Tips

- **Batch validation**: Validate multiple files in parallel
  ```bash
  ls docs/*.yaml | xargs -P 4 -I {} sherpy validate -t $(basename {} .yaml) -f {}
  ```

- **Cache validation results**: Only re-validate changed files
  ```bash
  git diff --name-only HEAD | grep '\.yaml$' | while read file; do
    sherpy validate -t $(basename "$file" .yaml) -f "$file"
  done
  ```

- **Use make for incremental builds**
  ```makefile
  docs/%.md: docs/%.yaml
  	sherpy to-markdown -t $(basename $* .yaml) -f $< -o $@
  ```

## Security Considerations

- **Validate untrusted input**: Always validate YAML from external sources
- **Use strict mode**: Enable `--strict` for production validation
- **Check file permissions**: Verify output files have correct permissions (0600)
- **Limit file size**: Files over 10MB are automatically rejected
- **Avoid path traversal**: Use absolute paths or validate relative paths
- **Run in containers**: Use Docker for processing untrusted files

```bash
# Safe processing of untrusted files
docker run --rm \
  -v $(pwd)/input.yaml:/data/input.yaml:ro \
  sherpy validate -t business-requirements -f /data/input.yaml --strict
```
