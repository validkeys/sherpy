# Contributing to Sherpy

Thank you for contributing to Sherpy! This document provides guidelines for contributing to the project.

## Development Setup

### Prerequisites

- Go 1.26 or later
- Make
- Git

### Clone and Build

```bash
git clone https://github.com/validkeys/sherpy.git
cd sherpy
make build
```

### Running Tests

```bash
make test
```

## Working with Skills

The `sherpy prompt` command embeds skill content in the binary at build time. If you modify any skill files, you must regenerate the embedded content.

### Updating Skill Files

When modifying files in `skills/*/SKILL.md`:

1. **Make your changes** to the skill file
2. **Regenerate embedded content:**
   ```bash
   make generate
   ```
   This runs `go generate ./prompt/...` which executes `gen_prompts.go`
3. **Verify generation worked:**
   ```bash
   git diff prompt/content_generated.go
   ```
   You should see your changes reflected in the generated file
4. **Run tests:**
   ```bash
   make test
   ```
5. **Commit both files:**
   ```bash
   git add skills/your-skill/SKILL.md
   git add prompt/content_generated.go
   git commit -m "feat: update your-skill instructions"
   ```

### What Gets Embedded

Only **pipeline skill** content is embedded in the binary:
- gap-analysis-worksheet
- business-requirements-interview
- technical-requirements-interview
- style-anchors-collection
- implementation-planner
- implementation-plan-review
- definition-of-done
- architecture-decision-record
- delivery-timeline
- qa-test-plan
- developer-summary
- executive-summary

**Orchestrator skills** (sherpy-cli-planner, sherpy-flow, etc.) are NOT embedded as they reference pipeline skills rather than being pipeline steps.

### Build Process Details

- `prompt/gen_prompts.go` - Build-time script that reads skills
- `prompt/content_generated.go` - Generated file with embedded content
- Frontmatter (---\nname: ...\n---) is stripped during generation
- Content is embedded using Go's map[string]string

## Pull Request Guidelines

1. **One feature per PR** - Keep changes focused
2. **Write tests** - All new code should have tests
3. **Update docs** - Keep README and CHANGELOG current
4. **Run quality checks:**
   ```bash
   make test
   go vet ./...
   go fmt ./...
   ```
5. **Commit message format:**
   ```
   type(scope): description

   Types: feat, fix, docs, refactor, test, chore
   Example: feat(prompt): add new pipeline step
   ```

## Code Review Process

- All PRs require approval from maintainer
- CI must pass (tests, linting, generation check)
- Code coverage should not decrease
- Breaking changes require major version bump

## Questions?

- Open an issue for bugs or feature requests
- Check existing issues before creating new ones
- Tag @maintainers for urgent questions
