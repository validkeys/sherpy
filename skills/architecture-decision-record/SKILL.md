---
name: architecture-decision-record
description: Extracts key architectural decisions from technical-requirements.yaml and formalizes them as individual ADR markdown files in an adrs/ directory. Each ADR captures context, the decision made, alternatives considered, and consequences — creating a durable record of why the system is built the way it is.
---

# Architecture Decision Record

Extracts key architectural decisions from `technical-requirements.yaml` and formalizes each one as a standalone ADR file. ADRs document *why* the system is built the way it is, not just *what* was chosen — making them essential for onboarding, audits, and revisiting trade-offs.

## Prerequisites

- `technical-requirements.yaml` (output from `/technical-requirements-interview`)

## Usage

```
/architecture-decision-record path/to/technical-requirements.yaml
```

## Process

### Step 1: Load Technical Requirements

Read `technical-requirements.yaml` and identify every decision point. Look in these sections:

- `architecture` — patterns, frameworks, structural choices
- `technology_stack` — language, runtime, major libraries, databases
- `data_model` — storage engine choice, schema design decisions
- `api_design` — REST vs GraphQL vs RPC, versioning strategy
- `security` — auth mechanism, token strategy, encryption approach
- `testing` — testing strategy, coverage targets, tooling
- `deployment` — hosting, CI/CD pipeline, containerization
- `trade_offs` and `open_questions` — explicitly flagged decisions

Collect each decision as a candidate ADR. A decision qualifies if:
- It involves a meaningful choice between alternatives, OR
- It has notable consequences for the system's future flexibility, OR
- It was explicitly flagged as a trade-off or open question

### Step 2: Identify Alternatives

For each candidate decision, reason about what the realistic alternatives were. Derive these from:
- The `trade_offs` section of the technical requirements (if present)
- Common alternatives for the chosen technology/pattern
- Any "options considered" language in the requirements

If no alternatives are inferable, note "alternatives not documented" rather than fabricating them.

### Step 3: Assign ADR IDs and Titles

Number ADRs sequentially starting at `ADR-001`. Titles should be brief and declarative:
- Good: `Use PostgreSQL as the primary data store`
- Bad: `Database decision`

Group related decisions logically (e.g., all auth decisions before all deployment decisions).

### Step 4: Write ADR Files

Create an `adrs/` directory in the same location as `technical-requirements.yaml`.

Write one file per ADR: `adrs/ADR-NNN-kebab-case-title.md`

Each file follows this format:

```markdown
# ADR-NNN: [Title]

**Status:** Accepted
**Date:** [YYYY-MM-DD — use today's date]
**Source:** technical-requirements.yaml

## Context

[2-4 sentences describing the problem or decision that needed to be made.
What forces were at play? What constraints existed? Why did this need a decision?]

## Decision

[1-3 sentences stating the decision clearly and directly.
Start with "We will..." or "The system will..."]

## Alternatives Considered

| Option | Reason not chosen |
|--------|-------------------|
| [Alternative 1] | [why ruled out] |
| [Alternative 2] | [why ruled out] |

[If alternatives are not documented in the requirements, write:
"Alternatives were not documented in the source requirements."]

## Consequences

### Positive
- [benefit 1]
- [benefit 2]

### Negative / Trade-offs
- [drawback or constraint this decision introduces]

### Risks
- [risk 1, if any]
```

### Step 5: Write adrs/INDEX.md

Create `adrs/INDEX.md` as a summary table:

```markdown
# Architecture Decision Records

| ID | Title | Status | Date |
|----|-------|--------|------|
| [ADR-001](ADR-001-title.md) | [Title] | Accepted | YYYY-MM-DD |
| ... | | | |
```

### Step 6: Gap Analysis

Report inline after generating all files:

```
## ADR Gap Analysis

**Project:** [name]
**ADRs Generated:** [n]

**Decision Areas Covered:**
[✓ / ✗] Architecture / structural patterns
[✓ / ✗] Technology stack
[✓ / ✗] Data storage
[✓ / ✗] API design
[✓ / ✗] Security / authentication
[✓ / ✗] Testing strategy
[✓ / ✗] Deployment / infrastructure

**Open Questions carried forward:** [n]
[List any open_questions from technical-requirements.yaml that could not yet be
formalized as Accepted ADRs — these are candidates for future ADRs.]

**Recommendations:** [none / list]
```

## Output Format

```
adrs/
  INDEX.md
  ADR-001-[title].md
  ADR-002-[title].md
  ...
```

## Example Output

See [examples/](./examples/) for a sample INDEX.md and two ADR files.
