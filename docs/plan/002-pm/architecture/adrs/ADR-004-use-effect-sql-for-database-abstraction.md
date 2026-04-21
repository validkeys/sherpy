# ADR-004: Use @effect/sql for database abstraction

**Status:** Accepted
**Date:** 2026-04-20
**Source:** technical-requirements.yaml (technology_stack, data_model, trade_offs)

## Context

The system must support dual-mode database operation: SQLite for local mode and PostgreSQL for cloud mode. All queries need to work against both databases without database-specific SQL in service code. The project is already committed to Effect-TS, so the database abstraction should integrate natively with the Effect ecosystem.

## Decision

We will use @effect/sql as the unified SQL client interface. Local mode uses @effect/sql-libsql connecting to ~/.sherpy/sherpy.db. Cloud mode uses @effect/sql-pg connecting to RDS PostgreSQL. The database implementation is swapped via Effect Layers driven by configuration or environment, while all service code programs against the generic SqlClient interface.

## Alternatives Considered

| Option | Reason not chosen |
|--------|-------------------|
| Kysely (type-safe SQL query builder) | External library requiring bridging into Effect ecosystem; @effect/sql is native and provides Layer-based DB swapping |

## Consequences

### Positive
- Native Effect-TS integration — SqlClient is an Effect Service, swappable via Layers
- Clean dual-mode support — same queries work on SQLite and PostgreSQL
- Built-in migration support aligned with Effect's runtime
- Effect Schema integration for type-safe query results

### Negative / Trade-offs
- Less mature query builder than Kysely — may need raw SQL for complex queries
- Smaller community and fewer examples compared to mainstream ORMs

### Risks
- Medium reversibility — both use standard SQL, so queries are portable, but the Layer wiring is Effect-specific
