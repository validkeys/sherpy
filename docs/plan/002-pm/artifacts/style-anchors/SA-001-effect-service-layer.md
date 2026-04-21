---
code: SA-001
name: Effect.Service with Layer-based Dependency Injection
category: services
tags: [effect, service, layer, dependency-injection, business-logic]
created: 2026-04-20
---

# Effect.Service with Layer-based Dependency Injection

## Overview

Demonstrates the canonical Effect.Service pattern for building domain services with Layer-based dependency injection. Shows how to compose services that depend on other services, manage resources with finalizers, and expose both a service and its Default layer for consumption by other layers.

## Source Reference

**Repository:** ~/Sites/ai-use-repos/EffectPatterns
**File:** `packages/toolkit/src/services/database.ts`
**Lines:** 52-170

## Code Example

```typescript
import { Config, Effect, Layer } from "effect"
import { ToolkitLogger } from "./logger.js"
import { ToolkitConfig } from "./config.js"

export class DatabaseService extends Effect.Service<DatabaseService>()(
  "DatabaseService",
  {
    effect: Effect.gen(function* () {
      const logger = yield* ToolkitLogger
      const config = yield* ToolkitConfig
      const maxConcurrent = yield* config.getMaxConcurrentDbRequests()

      const semaphore = yield* Effect.makeSemaphore(maxConcurrent)

      const databaseUrl = yield* Config.string("DATABASE_URL_OVERRIDE").pipe(
        Config.withDefault(getDatabaseUrl())
      )

      yield* logger.debug("Initializing database connection", {
        url: databaseUrl.replace(/:[^:@]+@/, ":****@"),
      })

      const connection = createDatabase(databaseUrl)

      yield* Effect.addFinalizer(() =>
        Effect.gen(function* () {
          yield* logger.debug("Closing database connection")
          yield* Effect.tryPromise({
            try: () => connection.close(),
            catch: (error) =>
              new Error(`Failed to close database connection: ${String(error)}`),
          }).pipe(Effect.ignore)
        })
      )

      return {
        db: connection.db,
        close: connection.close,
        semaphore,
      }
    }),
    dependencies: [ToolkitLogger.Default, ToolkitConfig.Default],
  },
) {}

export const DatabaseServiceLive = DatabaseService.Default.pipe(
  Layer.provide(ToolkitLogger.Default),
  Layer.provide(ToolkitConfig.Default),
)

export class ApplicationPatternRepositoryService
  extends Effect.Service<ApplicationPatternRepositoryService>()(
    "ApplicationPatternRepositoryService",
    {
      effect: Effect.gen(function* () {
        const dbService = yield* DatabaseService
        return createApplicationPatternRepository(dbService.db)
      }),
      dependencies: [DatabaseService.Default],
    },
  ) {}

export const ApplicationPatternRepositoryLive =
  ApplicationPatternRepositoryService.Default.pipe(
    Layer.provide(DatabaseServiceLive),
  )

export const DatabaseLayer = Layer.mergeAll(
  DatabaseServiceLive,
  ApplicationPatternRepositoryLive,
  EffectPatternRepositoryLive,
  SkillRepositoryLive,
)
```

## What This Demonstrates

- **Effect.Service pattern** - Class-based service with unique string identifier
- **Effect.gen composition** - Using generator functions for readable async logic
- **Dependency injection** - Dependencies declared in `dependencies` array, accessed via `yield*`
- **Resource finalizers** - `Effect.addFinalizer` for cleanup on scope closure
- **Layer composition** - `Layer.provide` to wire dependency graphs, `Layer.mergeAll` to combine
- **Exported Live layers** - Each service exports a `*Live` layer with full dependency chain
- **Config integration** - `Config.string` with `Config.withDefault` for environment-aware config
- **Semaphore for concurrency** - `Effect.makeSemaphore` to limit concurrent DB operations

## When to Use

- **All domain services** - Every service in `packages/api/src/services/`
- **Services needing DI** - When a service depends on other services or external resources
- **Resource management** - Services that hold connections, file handles, or other resources
- **Layer composition** - Building the final application layer from service layers

## Pattern Requirements

✓ Extend `Effect.Service<ThisType>()("ServiceName", { effect, dependencies })`
✓ Use unique string identifiers for each service (e.g., `"ProjectService"`, `"PersonService"`)
✓ Access dependencies via `yield* ServiceTag` inside `Effect.gen`
✓ Declare all dependencies in the `dependencies` array using `ServiceTag.Default`
✓ Export a composed `*Live` layer with `Service.Default.pipe(Layer.provide(...deps))`
✓ Use `Effect.addFinalizer` for resource cleanup (connections, file handles)
✓ Return plain objects from the service effect — methods return `Effect` types

## Common Mistakes to Avoid

✗ Using `async/await` inside `Effect.gen` — use `Effect.tryPromise` or `Effect.promise` instead
✗ Forgetting to list dependencies in the `dependencies` array — causes missing service errors
✗ Creating new service instances manually — services are singletons via the Layer system
✗ Using `new ServiceClass()` directly — always provide via Layers
✗ Returning Promises from service methods — all methods must return `Effect` types
✗ Mixing Layer.provide order — dependencies must be provided bottom-up
✗ Skipping `Effect.gen` and using raw Effect combinators for complex logic

## Related Anchors

- **SA-002** - @effect/sql Model.Class with makeRepository (data access layer)
- **SA-005** - HttpApiBuilder handler implementation (how services are consumed)
- **SA-008** - @effect/vitest test patterns (how to test services with Layer swapping)
- **SA-006** - Effect Schema domain types (schemas used alongside services)
