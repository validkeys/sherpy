# ADR-005: Use pnpm workspaces monorepo for project structure

**Status:** Accepted
**Date:** 2026-04-20
**Source:** technical-requirements.yaml (project_structure, trade_offs)

## Context

The system has four main packages (cli, api, web, shared) that need coordinated development. Shared types between frontend and backend require a mechanism for ensuring API contract consistency. A decision is needed between a single monorepo with workspace packages or separate repositories.

## Decision

We will use a pnpm workspaces monorepo with four packages: `packages/cli`, `packages/api`, `packages/web`, and `packages/shared`. The shared package provides Effect Schema definitions and TypeScript types used by all other packages. Package boundaries are enforced by workspace protocol dependencies.

## Alternatives Considered

| Option | Reason not chosen |
|--------|-------------------|
| Separate repos for CLI, API, web | Coordination overhead; shared types require a published package or copy-paste; higher risk of API contract drift between frontend and backend |

## Consequences

### Positive
- Single repo for coordinated changes — frontend and backend evolve together
- Shared types package ensures API contract consistency at compile time
- pnpm workspaces provide clean package boundaries with workspace protocol
- Simplified dependency management across packages

### Negative / Trade-offs
- Tighter coupling between packages — changes in shared types affect all consumers immediately
- Monorepo tooling complexity (build ordering, caching) though pnpm handles most of this natively

### Risks
- Medium reversibility — packages can be extracted to separate repos later, but shared types would need a publishing mechanism
