# ADR-001: Use TypeScript for CLI implementation

**Status:** Accepted
**Date:** 2026-03-26
**Source:** technical-requirements.yaml

## Context

The project requires a CLI tool distributed to developer workstations across multiple operating systems. The team has existing TypeScript expertise and the codebase already uses Node.js tooling. A statically-typed language was preferred to reduce runtime errors in a tool that parses and executes user-defined workflow files.

## Decision

We will implement the CLI in TypeScript, compiled to a self-contained Node.js executable via `pkg` or `esbuild`. Distribution will be via npm as a globally installable package.

## Alternatives Considered

| Option | Reason not chosen |
|--------|-------------------|
| Go | No existing team expertise; would require separate build pipeline |
| Python | Dynamic typing increases risk of runtime parse errors; slower startup than compiled output |
| Plain JavaScript | Loses type safety benefits without meaningful reduction in complexity |

## Consequences

### Positive
- Type safety catches schema mismatches at compile time rather than runtime
- npm distribution is familiar to the target developer audience
- Existing TypeScript tooling (ESLint, Prettier, ts-jest) can be reused

### Negative / Trade-offs
- Node.js startup overhead (~100–200ms) on cold runs; acceptable given the < 500ms target
- Distributed binary size is larger than a Go equivalent (~40–60MB with bundled Node runtime)

### Risks
- Node.js version compatibility on end-user machines must be managed via `.nvmrc` and minimum-version checks at startup
