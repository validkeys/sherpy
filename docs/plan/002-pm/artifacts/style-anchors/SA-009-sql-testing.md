---
code: SA-009
name: SQL Testing with @effect/vitest
category: testing
tags: [effect, vitest, sql, sqlite, testing, database, integration]
created: 2026-04-20
---

# SQL Testing with @effect/vitest

## Overview

Demonstrates how to write integration tests for SQL operations using `@effect/vitest` with real SQLite databases. Shows the pattern of creating temporary databases, seeding test data, testing `SqlResolver` operations with batching, and verifying results with `Option` handling.

## Source Reference

**Repository:** ~/Sites/ai-use-repos/effect
**File:** `packages/sql-sqlite-node/test/Resolver.test.ts`
**Lines:** 1-177

## Code Example

```typescript
import { FileSystem } from "@effect/platform"
import { NodeFileSystem } from "@effect/platform-node"
import { SqlResolver } from "@effect/sql"
import { SqliteClient } from "@effect/sql-sqlite-node"
import { assert, describe, it } from "@effect/vitest"
import { Array, Effect, Option } from "effect"
import * as Schema from "effect/Schema"

const makeClient = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const dir = yield* fs.makeTempDirectoryScoped()
  return yield* SqliteClient.make({
    filename: dir + "/test.db",
  })
}).pipe(Effect.provide([NodeFileSystem.layer]))

const seededClient = Effect.gen(function* () {
  const sql = yield* makeClient
  yield* sql`CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)`
  yield* Effect.forEach(
    Array.range(1, 100),
    (id) => sql`INSERT INTO test ${sql.insert({ id, name: `name${id}` })}`,
  )
  return sql
})

describe("Resolver", () => {
  describe("ordered", () => {
    it.scoped("insert with batching", () =>
      Effect.gen(function* () {
        const batches: Array<Array<string>> = []
        const sql = yield* seededClient
        const Insert = yield* SqlResolver.ordered("Insert", {
          Request: Schema.String,
          Result: Schema.Struct({ id: Schema.Number, name: Schema.String }),
          execute: (names) => {
            batches.push(names)
            return sql`INSERT INTO test ${sql.insert(names.map((name) => ({ name })))} RETURNING *`
          },
        })
        assert.deepStrictEqual(
          yield* Effect.all({
            one: Insert.execute("one"),
            two: Insert.execute("two"),
          }, { batching: true }),
          {
            one: { id: 101, name: "one" },
            two: { id: 102, name: "two" },
          },
        )
        assert.deepStrictEqual(batches, [["one", "two"]])
      }))

    it.scoped("find by id", () =>
      Effect.gen(function* () {
        const sql = yield* seededClient
        const FindById = yield* SqlResolver.findById("FindById", {
          Id: Schema.Number,
          Result: Schema.Struct({ id: Schema.Number, name: Schema.String }),
          ResultId: (result) => result.id,
          execute: (ids) => sql`SELECT * FROM test WHERE id IN ${sql.in(ids)}`,
        })
        assert.deepStrictEqual(
          yield* Effect.all({
            one: FindById.execute(1),
            two: FindById.execute(2),
            three: FindById.execute(101),
          }, { batching: true }),
          {
            one: Option.some({ id: 1, name: "name1" }),
            two: Option.some({ id: 2, name: "name2" }),
            three: Option.none(),
          },
        )
      }))
  })
})
```

## What This Demonstrates

- **Temp database creation** - `fs.makeTempDirectoryScoped()` + `SqliteClient.make()` for test DBs
- **Seeded test data** - `Effect.forEach` to insert fixture data before tests
- **it.scoped** - Automatic cleanup of scoped resources (temp directories, connections)
- **SqlResolver in tests** - Testing `ordered`, `findById`, `grouped` resolver patterns
- **Batching verification** - Capturing batch arrays to verify batching behavior
- **Option handling** - `Option.some()` / `Option.none()` for may-not-exist results
- **Effect.all with batching** - `{ batching: true }` to coalesce resolver calls
- **Schema.Struct inline** - Lightweight result schemas for test assertions

## When to Use

- **Repository tests** - Testing data access in `packages/api/test/services/`
- **Resolver tests** - Testing batched queries and custom SQL operations
- **Migration tests** - Testing schema creation and data migration
- **Integration tests** - Any test that needs a real database

## Pattern Requirements

✓ Use `it.scoped` for tests that need database resources with automatic cleanup
✓ Create temp databases with `FileSystem.makeTempDirectoryScoped()` + `SqliteClient.make()`
✓ Seed test data before assertions using `Effect.forEach` with `sql.insert`
✓ Test both success and not-found cases (verify `Option.none()` for missing records)
✓ Use `Effect.all({ ... }, { batching: true })` to test batch behavior
✓ Use `assert.deepStrictEqual` for structural equality checks
✓ Provide `NodeFileSystem.layer` when creating temp directories

## Common Mistakes to Avoid

✗ Using `it.effect` instead of `it.scoped` for database tests — resources won't be cleaned up
✗ Not seeding test data — querying empty tables tests nothing
✗ Using shared global database — tests interfere with each other
✗ Forgetting `{ batching: true }` — resolvers won't batch, defeating the test purpose
✗ Not testing `Option.none()` case — incomplete coverage for not-found scenarios

## Related Anchors

- **SA-002** - Model.Class with makeRepository (what you're testing)
- **SA-003** - SqlResolver patterns (the patterns being tested)
- **SA-008** - @effect/vitest test patterns (general test framework usage)
