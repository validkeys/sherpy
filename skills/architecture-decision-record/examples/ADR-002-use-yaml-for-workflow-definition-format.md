# ADR-002: Use YAML for workflow definition format

**Status:** Accepted
**Date:** 2026-03-26
**Source:** technical-requirements.yaml

## Context

Users must define automation workflows in a human-readable configuration file. The format needs to support nested structures (tasks, dependencies, environment variables), be editable without tooling, and be familiar to developers who already use YAML in CI/CD pipelines (GitHub Actions, CircleCI, etc.).

## Decision

Workflow definitions will use YAML. The schema will be validated at load time using a JSON Schema definition, providing clear error messages for malformed files.

## Alternatives Considered

| Option | Reason not chosen |
|--------|-------------------|
| JSON | Verbose for nested structures; no support for comments, making self-documenting workflows harder |
| TOML | Less familiar to the target audience; weaker support for deeply nested structures |
| Custom DSL | High implementation cost; steep learning curve for users; tooling (syntax highlighting, linting) would need to be built from scratch |

## Consequences

### Positive
- Immediately familiar to developers using GitHub Actions, Ansible, Docker Compose
- YAML comments allow inline documentation within workflow files
- Broad tooling support (syntax highlighting, linters, schema validation in VS Code)

### Negative / Trade-offs
- YAML's implicit type coercion (e.g., `yes` → `true`, bare numbers) can surprise users; mitigated by strict schema validation on load
- Indentation-sensitivity makes deeply nested workflows error-prone to hand-edit

### Risks
- Users copy-pasting YAML from other tools may introduce tab characters (not valid in YAML); the validator must produce a clear error for this case
