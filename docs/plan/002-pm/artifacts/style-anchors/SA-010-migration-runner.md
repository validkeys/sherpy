---
code: SA-010
name: Database Migration Runner
category: data-access
tags: [effect, sql, migration, schema, database]
created: 2026-04-20
---

# Database Migration Runner

## Overview

Demonstrates the `@effect/sql` Migrator pattern for managing database schema migrations. Shows how to define migrations as SQL effects, load them from glob patterns or records, and run them in transactions with error handling.

## Source Reference

**Repository:** ~/Sites/ai-use-repos/effect
**File:** `packages/sql/src/Migrator.ts`
**Lines:** 73-351

## Code Example

```typescript
import { SqlClient, SqlMigrator } from "@effect/sql"
import { Effect } from "effect"

const runMigrations = SqlMigrator.make()({
  loader: SqlMigrator.fromGlob(
    import.meta.glob("./migrations/*.sql", { eager: false })
  ),
  schemaDirectory: "./db/schema",
  table: "sherpy_migrations",
})

export const MigratorService = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient

  yield* sql`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      pipeline_status TEXT NOT NULL DEFAULT 'intake',
      assigned_people TEXT,
      tags TEXT,
      priority TEXT DEFAULT 'medium',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `

  yield* sql`CREATE INDEX IF NOT EXISTS idx_projects_status
    ON projects(pipeline_status, updated_at DESC)`

  yield* sql`
    CREATE TABLE IF NOT EXISTS milestones (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      order_index INTEGER NOT NULL,
      estimated_days INTEGER,
      acceptance_criteria TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `
})

const program = Effect.gen(function* () {
  yield* runMigrations
})

const migrationRecord = SqlMigrator.fromRecord({
  "001_create_projects": Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    yield* sql`CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL)`
  }),
  "002_create_milestones": Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    yield* sql`CREATE TABLE IF NOT EXISTS milestones (id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, name TEXT NOT NULL)`
  }),
})
```

## What This Demonstrates

- **SqlMigrator.make()** - Create a migration runner with configurable table name and loader
- **SqlMigrator.fromGlob** - Load migrations from file glob patterns (Vite-compatible)
- **SqlMigrator.fromRecord** - Load migrations from a record of named Effects
- **Transaction wrapping** - Migrations run inside `sql.withTransaction` automatically
- **Migration tracking** - Tracks ran migrations in a dedicated table to avoid re-runs
- **Sequential ordering** - Migrations ordered by numeric prefix (001_, 002_, etc.)
- **Error handling** - `MigrationError` with reasons: "failed", "import-error", "duplicates", "locked"
- **SQL schema creation** - Raw SQL for CREATE TABLE and CREATE INDEX statements

## When to Use

- **Database initialization** - In `packages/api/src/db/schema.ts` on daemon startup
- **Schema evolution** - Adding new tables/columns as the project grows
- **Test fixtures** - Creating test database schemas before integration tests

## Pattern Requirements

✓ Name migration files with numeric prefix: `001_init-schema.sql`, `002_add-availability.sql`
✓ Use `SqlMigrator.fromGlob(import.meta.glob(...))` for file-based migrations
✓ Run migrations on daemon startup in the bootstrap sequence
✓ Write SQL that is compatible with both SQLite and PostgreSQL
✓ Use `CREATE TABLE IF NOT EXISTS` for idempotent migrations
✓ Use `REFERENCES table(id) ON DELETE CASCADE` for foreign key constraints
✓ Create indexes with `CREATE INDEX IF NOT EXISTS` for query performance

## Common Mistakes to Avoid

✗ Using database-specific SQL syntax — must work on both SQLite and PostgreSQL
✗ Forgetting numeric prefix on migration files — ordering will be wrong
✗ Not using `IF NOT EXISTS` — re-running migrations fails on existing tables
✗ Running migrations outside the transaction wrapper — partial migration risk
✗ Modifying existing migration files — create new migrations for schema changes

## Related Anchors

- **SA-002** - Model.Class with makeRepository (operates on migrated tables)
- **SA-009** - SQL testing patterns (testing against migrated schemas)
- **SA-001** - Effect.Service pattern (services use the migrated database)
