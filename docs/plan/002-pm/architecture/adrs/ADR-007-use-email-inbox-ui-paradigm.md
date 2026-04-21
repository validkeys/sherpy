# ADR-007: Use email inbox UI paradigm for project management

**Status:** Accepted
**Date:** 2026-04-20
**Source:** technical-requirements.yaml (overview, trade_offs)

## Context

The web UI needs a primary layout for managing projects through the Sherpy flow pipeline. Projects enter as new intake and move through planning stages. Users need to triage, tag, filter, and track project progress. A per-project AI chat drives Sherpy flow steps. A decision is needed on the overall UI paradigm.

## Decision

We will use an email inbox layout as the primary UI paradigm. Projects enter as new intake (like new emails), users tag/assign/filter them. Clicking a project shows its current pipeline status and a per-project assistant-ui chat for Sherpy flow steps and Q&A. Documents are viewable with syntax highlighting and exportable as PDF.

## Alternatives Considered

| Option | Reason not chosen |
|--------|-------------------|
| Traditional dashboard with cards/kanban | Standard PM UI but less natural fit for the Sherpy flow pipeline progression; inbox metaphor maps better to "items arrive, you process them, they move through stages" |

## Consequences

### Positive
- Familiar mental model (email inbox) that requires minimal learning
- Maps naturally to the Sherpy flow pipeline — projects arrive, get processed, move through stages
- Chat-per-project is intuitive in an inbox context
- Tagging and filtering are native inbox operations

### Negative / Trade-offs
- Non-standard PM UI — users expecting kanban boards or Gantt charts will need adjustment
- May not scale as well for very large numbers of projects without additional navigation patterns

### Risks
- Medium reversibility — UI is separate from backend, but the inbox paradigm influences component architecture deeply
