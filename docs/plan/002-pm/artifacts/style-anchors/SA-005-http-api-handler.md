---
code: SA-005
name: HttpApiBuilder Handler Implementation
category: api
tags: [effect, platform, http, handler, implementation, layer]
created: 2026-04-20
---

# HttpApiBuilder Handler Implementation

## Overview

Demonstrates how to implement HTTP endpoint handlers using `HttpApiBuilder.group`. Shows how handlers access services from the Effect context, handle path parameters/payload/headers, return typed responses, and wire implementations into layers for the final server.

## Source Reference

**Repository:** ~/Sites/ai-use-repos/effect
**File:** `packages/platform-node/test/HttpApi.test.ts`
**Lines:** 556-673

## Code Example

```typescript
import {
  HttpApiBuilder,
  HttpApiClient,
  HttpApiSchema,
  HttpClientRequest,
  HttpServerResponse,
} from "@effect/platform"
import { NodeHttpServer } from "@effect/platform-node"
import { assert, describe, it } from "@effect/vitest"
import { Context, DateTime, Effect, Layer, Redacted, Ref, Schema } from "effect"

class UserRepo extends Context.Tag("UserRepo")<UserRepo, {
  readonly findById: (id: number) => Effect.Effect<User>
}>() {
  static Live = Layer.succeed(this, {
    findById: (id) =>
      Effect.map(DateTime.now, (now) => ({ id, name: "foo", createdAt: now })),
  })
}

const AuthorizationLive = Layer.succeed(
  Authorization,
  Authorization.of({
    cookie: (token) =>
      Effect.succeed(
        new User({
          id: 1,
          name: Redacted.value(token),
          createdAt: DateTime.unsafeNow(),
        })
      ),
  }),
)

const HttpUsersLive = HttpApiBuilder.group(
  Api,
  "users",
  (handlers) =>
    Effect.gen(function* () {
      const repo = yield* UserRepo
      return handlers
        .handle("findById", (_) =>
          _.path.id === -1
            ? CurrentUser
            : repo.findById(_.path.id))
        .handle("create", (_) =>
          _.payload.name === "boom"
            ? Effect.fail(new UserError())
            : Effect.map(DateTime.now, (now) =>
              new User({
                id: _.urlParams.id,
                name: _.payload.name,
                createdAt: now,
              })
            ))
        .handle("list", (_) =>
          _.headers.page === 0
            ? Effect.fail(new NoStatusError())
            : Effect.map(DateTime.nowInCurrentZone, (now) => [
              new User({
                id: 1,
                name: `page ${_.headers.page}`,
                createdAt: DateTime.toUtc(now),
              }),
            ]))
    }),
).pipe(Layer.provide([
  DateTime.layerCurrentZoneOffset(0),
  UserRepo.Live,
  AuthorizationLive,
]))

const HttpGroupsLive = HttpApiBuilder.group(
  Api,
  "groups",
  (handlers) =>
    handlers
      .handle("findById", ({ path }) =>
        path.id === 0
          ? Effect.fail(new GroupError())
          : Effect.succeed(new Group({ id: 1, name: "foo" })))
      .handle("create", ({ payload }) =>
        Effect.succeed(
          new Group({ id: 1, name: "foo" in payload ? payload.foo : payload.name })
        )),
)

const HttpApiLive = Layer.provide(HttpApiBuilder.api(Api), [
  HttpGroupsLive,
  HttpUsersLive,
  TopLevelLive,
])

const HttpLive = HttpApiBuilder.serve().pipe(
  Layer.provide(HttpApiBuilder.middlewareCors()),
  Layer.provide(HttpApiLive),
  Layer.provideMerge(NodeHttpServer.layerTest),
)
```

## What This Demonstrates

- **HttpApiBuilder.group** - Implement handlers for a named API group
- **Effect.gen in handlers** - Access services via `yield*` inside handler implementations
- **Handler argument access** - `_.path.id`, `_.payload.name`, `_.headers.page`, `_.urlParams`
- **Typed error responses** - `Effect.fail(new TypedError())` for schema-validated errors
- **Typed success responses** - Return `new SchemaClass(...)` instances for validated responses
- **Layer wiring** - `Layer.provide` to inject service dependencies into handler layers
- **Layer.provideMerge** - For merging with the HTTP server layer
- **Authentication middleware** - `AuthorizationLive` provides `CurrentUser` to handlers

## When to Use

- **All endpoint implementations** - Every handler in `packages/api/src/api/routes/`
- **Service consumption** - When handlers need to call domain services
- **Error handling** - When endpoints can fail with typed error responses
- **Testing** - Build test HTTP servers with `NodeHttpServer.layerTest`

## Pattern Requirements

✓ Use `HttpApiBuilder.group(Api, "groupName", (handlers) => ...)` to implement handlers
✓ Return `handlers.handle("endpointName", (_) => Effect)` for each endpoint
✓ Access services via `yield* ServiceTag` in `Effect.gen` wrapper
✓ Access request data via `_.path`, `_.payload`, `_.headers`, `_.urlParams`
✓ Return typed schema class instances for success (e.g., `new Project(...)`)
✓ Fail with tagged error classes (e.g., `Effect.fail(new NotFoundError())`)
✓ Wire handler layers with `Layer.provide([...dependencyLayers])`
✓ Compose all handler layers into `HttpApiBuilder.api(Api)` for the server

## Common Mistakes to Avoid

✗ Returning plain objects instead of Schema class instances — breaks response validation
✗ Forgetting `Effect.gen` wrapper when accessing services — cannot `yield*` outside gen
✗ Not providing required layers to the handler — missing service errors at runtime
✗ Using `HttpServerResponse.json()` when Schema classes handle serialization — redundant
✗ Throwing errors instead of `Effect.fail` — bypasses Effect error channel
✗ Accessing `_.payload` on GET endpoints — GET requests don't have payloads

## Related Anchors

- **SA-004** - HttpApi definition (the API contract these handlers implement)
- **SA-001** - Effect.Service pattern (services consumed inside handlers)
- **SA-007** - Schema.Class for API domain types (request/response schemas)
