---
code: SA-003
name: SqlResolver for Batched and Custom Queries
category: data-access
tags: [effect, sql, resolver, batching, queries, data-loader]
created: 2026-04-20
---

# SqlResolver for Batched and Custom Queries

## Overview

Demonstrates `SqlResolver` patterns from `@effect/sql` for batched queries that go beyond basic CRUD. Shows `SqlResolver.ordered` for INSERT with RETURNING, `SqlResolver.findById` for batched lookups by ID, and `SqlResolver.grouped` for grouped result sets. Also shows `sql.withTransaction` for wrapping operations in transactions.

## Source Reference

**Repository:** ~/Sites/ai-use-repos/effect
**File:** `packages/sql-pg/examples/resolver.ts`
**Lines:** 1-87

## Code Example

```typescript
import { SqlClient, SqlResolver } from "@effect/sql"
import { PgClient } from "@effect/sql-pg"
import { Effect, Layer, String } from "effect"
import * as Schema from "effect/Schema"

class Person extends Schema.Class<Person>("Person")({
  id: Schema.Number,
  name: Schema.String,
  createdAt: Schema.DateFromSelf
}) {}

const InsertPersonSchema = Schema.Struct(Person.fields).pipe(
  Schema.omit("id", "createdAt")
)

const program = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient

  yield* sql`TRUNCATE TABLE people RESTART IDENTITY CASCADE`

  const Insert = yield* SqlResolver.ordered("InsertPerson", {
    Request: InsertPersonSchema,
    Result: Person,
    execute: (requests) =>
      sql`INSERT INTO people ${sql.insert(requests)} RETURNING people.*`
  })

  const GetById = yield* SqlResolver.findById("GetPersonById", {
    Id: Schema.Number,
    Result: Person,
    ResultId: (result) => result.id,
    execute: (ids) =>
      sql`SELECT * FROM people WHERE id IN ${sql.in(ids)}`
  })

  const GetByName = yield* SqlResolver.grouped("GetPersonByName", {
    Request: Schema.String,
    RequestGroupKey: (_) => _,
    Result: Person,
    ResultGroupKey: (_) => _.name,
    execute: (ids) =>
      sql<{}>`SELECT * FROM people WHERE name IN ${sql.in(ids)}`
  })

  const inserted = yield* sql.withTransaction(
    Effect.all(
      [
        Insert.execute({ name: "John Doe" }),
        Insert.execute({ name: "Joe Bloggs" }),
      ],
      { batching: true }
    )
  )

  console.log(
    yield* Effect.all(
      [GetById.execute(inserted[0].id), GetById.execute(inserted[1].id)],
      { batching: true }
    )
  )

  console.log(
    yield* Effect.forEach(
      ["John Doe", "Joe Bloggs", "John Doe"],
      (id) => GetByName.execute(id),
      { batching: true }
    )
  )
})

const PgLive = PgClient.layer({
  database: "effect_pg_dev",
  transformQueryNames: String.camelToSnake,
  transformResultNames: String.snakeToCamel,
})

program.pipe(
  Effect.provide(PgLive),
  Effect.tapErrorCause(Effect.logError),
  Effect.runFork
)
```

## What This Demonstrates

- **SqlResolver.ordered** - Batched INSERT with RETURNING, results match request order
- **SqlResolver.findById** - Batched lookup by ID, returns `Option<Option<T>>` per ID
- **SqlResolver.grouped** - Batched lookup grouped by key, returns arrays per group
- **sql.withTransaction** - Wrap multiple operations in a database transaction
- **Effect.all with batching** - `{ batching: true }` enables automatic request batching
- **Effect.forEach with batching** - Batching across sequential-style iterations
- **sql.insert / sql.in** - Tagged template helpers for type-safe SQL construction
- **Name transforms** - `String.camelToSnake` / `String.snakeToCamel` for column mapping

## When to Use

- **Batched queries** - When multiple requests should be combined into one SQL query
- **INSERT with RETURNING** - When you need the created row back with generated fields
- **Multi-lookup patterns** - When fetching many records by ID in a single round-trip
- **Grouped results** - When results need to be partitioned by a key (e.g., tasks by milestone)
- **Transactions** - When multiple operations must succeed or fail atomically

## Pattern Requirements

✓ Use `SqlResolver.ordered` for INSERT ... RETURNING and ordered result sets
✓ Use `SqlResolver.findById` for batched lookups with `ResultId` to extract the key
✓ Use `SqlResolver.grouped` when results need grouping by `RequestGroupKey` / `ResultGroupKey`
✓ Always pass `{ batching: true }` to `Effect.all` / `Effect.forEach` for batching
✓ Use `sql.withTransaction` for operations that must be atomic
✓ Provide unique string names for each resolver (e.g., `"InsertPerson"`, `"GetPersonById"`)
✓ Use `sql.insert()` and `sql.in()` tagged template helpers — never concatenate SQL strings

## Common Mistakes to Avoid

✗ Using individual queries in a loop instead of batched resolvers — N+1 query problem
✗ Forgetting `{ batching: true }` in `Effect.all` — defeats the purpose of resolvers
✗ Not providing `ResultId` in `findById` — resolver cannot map results to requests
✗ Concatenating SQL strings — use tagged template literals for injection safety
✗ Wrapping single operations in `sql.withTransaction` unnecessarily — overhead without benefit
✗ Using the same resolver name for different resolvers — causes conflicts

## Related Anchors

- **SA-002** - Model.Class with makeRepository for standard CRUD
- **SA-009** - SQL testing with @effect/vitest
- **SA-001** - Effect.Service pattern (where resolvers are typically used)
