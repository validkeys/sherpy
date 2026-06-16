# AGENTS.md

## Repository Structure

This repo has three core elements:

1. **Skills** (`skills/`) — AI agent skills consumed by skills.sh. Each skill is a directory with a `SKILL.md` and optional `references/`.
2. **Document Specifications** (`docs/specifications/`) — Source-of-truth specs for each document type. Synced into `skills/*/references/` via `scripts/sync-specs.sh`.
3. **CLI** (`cmd/`, `prompt/`, `markdown/`, `schema/`, `jira/`, `main.go`) — Go tool that validates and converts Sherpy YAML documents.

## Conventions

### Bug Reports

Bug reports are tracked as **GitHub Issues**, never as files in the repository. Do not create bug report markdown files in `docs/` or anywhere else in the repo.

```
# Correct
gh issue create --title "BUG: ..." --body "..."

# Wrong
docs/bug-reports/BUG-001-some-bug.md
```

### Plans and Working Documents

All plans, implementation notes, and working documents go in `.tmp-docs/plans/` (gitignored). Use a numbered folder with a slug:

```
.tmp-docs/plans/{00N}/{slug}/
```

Examples:

```
.tmp-docs/plans/001/sherpy-cleanup/
.tmp-docs/plans/002/add-export-command/
.tmp-docs/plans/003/jira-sync-refactor/
```

The `{00N}` prefix is a zero-padded sequential number. The slug is a short kebab-case description. These are local working artifacts — they are not committed to the repository.
