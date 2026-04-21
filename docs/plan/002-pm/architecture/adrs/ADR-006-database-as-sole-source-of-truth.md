# ADR-006: Use database as sole source of truth

**Status:** Accepted
**Date:** 2026-04-20
**Source:** technical-requirements.yaml (data_model, trade_offs)

## Context

The Sherpy flow pipeline generates planning artifacts (business requirements, technical requirements, milestones, timelines, etc.). Previous Sherpy versions used .sherpy/ directories with YAML/markdown files as the source of truth. This project is net new with no existing file-based projects to migrate. A decision is needed on whether the database or filesystem is the canonical data store.

## Decision

We will use the database as the sole source of truth. No .sherpy/ files are created or parsed. The Sherpy flow chat steps write directly to the database. Documents (YAML, markdown, PDF) are generated views rendered from database data by a document adapter service on demand. The documents table stores generated content for versioning and retrieval.

## Alternatives Considered

| Option | Reason not chosen |
|--------|-------------------|
| Files in .sherpy/ folders as source of truth, DB as cache | Requires file syncing, parsing, and re-parsing; introduces sync bugs between files and DB; adds complexity without benefit for a net new project |

## Consequences

### Positive
- Eliminates entire class of file sync/parsing bugs
- Documents are always consistent with database state
- Single query path for all data — no filesystem + database coordination
- Document versioning is straightforward via the documents table

### Negative / Trade-offs
- Requires a document adapter service to render DB data into YAML/markdown/PDF formats
- Documents must be regenerated from DB data rather than read from disk
- No offline file editing of planning artifacts

### Risks
- Low reversibility — foundational data architecture; switching to file-based would require a complete data layer rewrite
