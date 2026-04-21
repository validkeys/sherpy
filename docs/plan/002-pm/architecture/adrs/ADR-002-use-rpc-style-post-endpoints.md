# ADR-002: Use RPC-style POST endpoints for API design

**Status:** Accepted
**Date:** 2026-04-20
**Source:** technical-requirements.yaml (api, trade_offs)

## Context

The API serves a single dedicated frontend (the React web UI) with no external API consumers planned for v1. The system is a local-first tool where the browser communicates with a local API daemon. A decision is needed between conventional RESTful resource modeling and a simpler RPC-style approach that maps directly to service methods.

## Decision

We will use RPC-style POST endpoints for all operations (e.g., `/api/createProject`, `/api/listProjects`, `/api/generateSchedule`). Each endpoint maps to a single service method. No resource-oriented URL structure or HTTP method semantics (GET/PUT/DELETE) are used for business operations. Only the health check uses GET.

## Alternatives Considered

| Option | Reason not chosen |
|--------|-------------------|
| Resource-oriented REST with CRUD via HTTP methods | No external API consumers to benefit from REST conventions; adds mapping complexity between HTTP verbs and service methods for a single-frontend tool |

## Consequences

### Positive
- Simpler to implement — one endpoint per operation, no HTTP method routing complexity
- Aligns with the service-method mental model — each API call maps to one service method
- Sufficient for a tool with a single dedicated frontend

### Negative / Trade-offs
- Less conventional API — clients must know endpoint names rather than follow resource patterns
- Not cacheable via HTTP semantics (all POSTs)
- Would need a REST or GraphQL layer if external API consumers are added later

### Risks
- Medium reversibility — can add REST endpoints alongside RPC endpoints, but the frontend would need updating
