# ADR-001: Use Effect-TS Layered Services for backend architecture

**Status:** Accepted
**Date:** 2026-04-20
**Source:** technical-requirements.yaml (architecture, trade_offs)

## Context

The backend needs a service-oriented architecture that supports dependency injection, testability, and composable business logic. The project has committed to Effect-TS as its core framework. The team must decide between using Effect-TS's native Layer/Service pattern or an external service-command library like @validkeys/contracted.

## Decision

We will use Effect-TS's native Layer, Service, and Effect primitives as the sole backend architecture pattern. Domain services are plain Effect-TS services with methods, composed via Effect's dependency injection Layer system. No additional service-command abstraction layer is introduced.

## Alternatives Considered

| Option | Reason not chosen |
|--------|-------------------|
| @validkeys/contracted service-command architecture | Adds external dependency; Layer system already provides DI and testability; simpler mental model for team committed to Effect-TS |

## Consequences

### Positive
- Native to Effect-TS — no bridging layer or additional dependency
- Effect's Layer system provides clean dependency injection and test swapping
- Simpler mental model with fewer abstractions
- Full Effect ecosystem compatibility (Schema, platform, sql, vitest)

### Negative / Trade-offs
- Less formal command structure — no defineCommand/defineService macros enforcing a command pattern
- Service methods are plain Effect-TS methods without compile-time command validation

### Risks
- Low reversibility — this is the core architectural pattern and changing it would require rewriting all services
