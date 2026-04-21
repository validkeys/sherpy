# ADR-008: Skip CI/CD for v1

**Status:** Accepted
**Date:** 2026-04-20
**Source:** technical-requirements.yaml (development, trade_offs)

## Context

Sherpy PM v1 is a local-only tool with no deployment pipeline. The tool is installed via npm global install and runs on developer machines. There are no cloud deployments, staging environments, or automated release processes for v1. Quality enforcement currently relies on developer discipline.

## Decision

We will not set up CI/CD for v1. Quality enforcement will rely on pre-commit hooks (Biome lint + format, TypeScript type check, Vitest related tests) and developer discipline. Manual npm publish for releases. CI/CD will be added when cloud deployment becomes a real requirement.

## Alternatives Considered

| Option | Reason not chosen |
|--------|-------------------|
| GitHub Actions for lint/test/typecheck on PRs | Adds overhead without clear benefit for a local-only tool with no deployment pipeline; pre-commit hooks provide equivalent local quality enforcement |

## Consequences

### Positive
- Faster initial setup — no CI pipeline configuration needed
- Pre-commit hooks provide immediate feedback at commit time
- Appropriate overhead for v1 scope (local-only, small team)

### Negative / Trade-offs
- No automated quality gate on PRs — relies on developer discipline and pre-commit hooks
- No automated test runs on push — broken tests can enter main branch
- Manual release process is error-prone

### Risks
- High reversibility — CI/CD can be added at any time without architectural changes
- Pre-commit hooks can be bypassed with --no-verify; no server-side enforcement
