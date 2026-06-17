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
   This runs `go generate` across the `prompt/` and `spec/` packages (executing `gen_prompts.go` and `gen_specs.go`)
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

## Working with Specifications

The `sherpy describe` command embeds document specifications (`docs/specifications/*/spec.md`) in the binary at build time. If you modify any spec files or the document-type → spec mapping, you must regenerate the embedded content.

### Updating Specification Files

When modifying files in `docs/specifications/*/spec.md` or the mapping in `spec/gen_specs.go`:

1. **Make your changes** to the spec file or mapping
2. **Regenerate embedded content:**
   ```bash
   make generate
   ```
3. **Verify generation worked:**
   ```bash
   git diff spec/content_generated.go
   ```
4. **Run tests:**
   ```bash
   make test
   ```
5. **Commit both files:**
   ```bash
   git add docs/specifications/your-doc/spec.md
   git add spec/content_generated.go
   git commit -m "feat(spec): update your-doc specification"
   ```

### What Gets Embedded

The spec mapping is explicit in `spec/gen_specs.go` (document types do not always share a directory name with their spec, e.g. `gap-analysis` → `gap-analysis-worksheet/spec.md`). Only document types listed there are embedded. Currently 7 document types have specs; `wireframe-spec` has no `spec.md` and is intentionally excluded.

### Build Process Details

- `prompt/gen_prompts.go` - Build-time script that reads skills (strips frontmatter)
- `prompt/content_generated.go` - Generated file with embedded skill content
- `spec/gen_specs.go` - Build-time script that reads `docs/specifications/`
- `spec/content_generated.go` - Generated file with embedded spec content
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
   Examples: feat(prompt): add new pipeline step
             feat(spec): add wireframe-spec to describe command
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
