---
code: SA-004
name: HttpApi with HttpApiGroup and HttpApiEndpoint
category: api
tags: [effect, platform, http, api, routing, schema, openapi]
created: 2026-04-20
---

# HttpApi with HttpApiGroup and HttpApiEndpoint

## Overview

Demonstrates the `@effect/platform` HttpApi declarative API definition pattern. Shows how to define API groups with endpoints, schema-validated request/response types, path parameters, middleware (authentication), and OpenAPI annotations. This is the canonical pattern for defining RPC-style endpoints in Sherpy PM.

## Source Reference

**Repository:** ~/Sites/ai-use-repos/effect
**File:** `packages/platform-node/examples/api.ts`
**Lines:** 1-122

## Code Example

```typescript
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiMiddleware,
  HttpApiSchema,
  HttpApiSecurity,
  HttpApiSwagger,
  HttpMiddleware,
  HttpServer,
  OpenApi,
} from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Context, Effect, Layer, Redacted, Schema } from "effect"
import { createServer } from "node:http"

class User extends Schema.Class<User>("User")({
  id: Schema.Number,
  name: Schema.String,
}) {}

class CurrentUser extends Context.Tag("CurrentUser")<CurrentUser, User>() {}

class Unauthorized extends Schema.TaggedError<Unauthorized>()("Unauthorized", {
  message: Schema.String,
}, HttpApiSchema.annotations({ status: 401 })) {}

export class Authentication extends HttpApiMiddleware.Tag<Authentication>()(
  "Authentication",
  {
    failure: Unauthorized,
    provides: CurrentUser,
    security: {
      bearer: HttpApiSecurity.bearer,
    },
  },
) {}

const idParam = HttpApiSchema.param("id", Schema.NumberFromString)

class ProjectsApi extends HttpApiGroup.make("projects")
  .add(
    HttpApiEndpoint.get("findById")`/${idParam}`
      .addSuccess(Project)
      .addError(Schema.String.pipe(
        HttpApiSchema.asEmpty({ status: 404, decode: () => "not found" })
      ))
  )
  .add(
    HttpApiEndpoint.post("create", "/")
      .setPayload(CreateProjectRequest)
      .addSuccess(CreateProjectResponse)
  )
  .add(
    HttpApiEndpoint.post("list", "/list")
      .setPayload(ListProjectsRequest)
      .addSuccess(ListProjectsResponse)
  )
  .middleware(Authentication)
  .prefix("/projects")
  .annotateContext(OpenApi.annotations({
    title: "Projects API",
    description: "API for managing projects",
  }))
{}

class MyApi extends HttpApi.make("api")
  .add(ProjectsApi)
{}

// Server bootstrap
HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
  Layer.provide(HttpApiSwagger.layer()),
  Layer.provide(HttpApiBuilder.middlewareOpenApi()),
  Layer.provide(ApiLive),
  Layer.provide(HttpApiBuilder.middlewareCors()),
  HttpServer.withLogAddress,
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 })),
  Layer.launch,
  NodeRuntime.runMain,
)
```

## What This Demonstrates

- **HttpApiGroup.make** - Define a named group of related endpoints with shared prefix and middleware
- **HttpApiEndpoint.get/post** - Declare HTTP methods with typed path parameters via tagged templates
- **Schema-validated I/O** - `.setPayload()`, `.addSuccess()`, `.addError()` for type-safe contracts
- **HttpApiMiddleware.Tag** - Declarative authentication middleware with security schemes
- **HttpApiSecurity.bearer** - JWT bearer token authentication (for Okta OIDC)
- **HttpApiSchema.param** - Type-safe path parameters with schema validation
- **OpenAPI annotations** - Auto-generated documentation via `.annotateContext()`
- **HttpApiBuilder.serve** - Wire everything together with middleware stack
- **NodeRuntime.runMain** - Run the Effect as the main program

## When to Use

- **All RPC endpoints** - Every endpoint in `packages/api/src/api/routes/`
- **API group definition** - Group related endpoints (projects, people, schedules) into API groups
- **Schema validation** - When request/response types need validation (all API endpoints)
- **Authentication** - Apply Okta JWT bearer middleware to protected endpoint groups

## Pattern Requirements

✓ Define API groups as `class extends HttpApiGroup.make("groupName")`
✓ Use `HttpApiEndpoint.get/post("name", "/path")` for each endpoint
✓ Always call `.addSuccess(Schema)` — every endpoint needs a typed response
✓ Use `.setPayload(Schema)` for POST body validation
✓ Use `HttpApiSchema.param("name", Schema)` for path parameters
✓ Apply authentication via `.middleware(Authentication)` on the group
✓ Use `.prefix("/resource")` for URL path prefix on the group
✓ Compose groups into an `HttpApi.make("api").add(GroupA).add(GroupB)`
✓ Use `HttpApiBuilder.serve(HttpMiddleware.logger)` with proper Layer wiring

## Common Mistakes to Avoid

✗ Using raw `HttpRouter` instead of `HttpApi` — HttpApi provides schema validation and OpenAPI
✗ Forgetting `.addSuccess()` — causes compilation errors and missing OpenAPI spec
✗ Defining endpoints without a group — all endpoints must belong to an `HttpApiGroup`
✗ Not using tagged template literals for paths — `HttpApiEndpoint.get("name")\`/${idParam}\``
✗ Mixing middleware on individual endpoints — apply middleware at the group level
✗ Using `HttpServer.router` directly — prefer `HttpApi` declarative style

## Related Anchors

- **SA-005** - HttpApiBuilder handler implementation (how to implement the handlers)
- **SA-007** - Schema.Class for API domain types (request/response schemas)
- **SA-001** - Effect.Service with Layer DI (services consumed by handlers)
