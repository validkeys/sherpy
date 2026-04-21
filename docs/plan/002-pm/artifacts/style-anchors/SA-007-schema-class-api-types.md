---
code: SA-007
name: Schema.Class for API Domain Types
category: validation
tags: [effect, schema, class, tagged-error, api, request, response]
created: 2026-04-20
---

# Schema.Class for API Domain Types

## Overview

Demonstrates `Schema.Class` and `Schema.TaggedError` / `Schema.TaggedClass` for defining API request/response types and error types. These class-based schemas provide runtime validation, type-safe construction, and integration with `@effect/platform`'s `HttpApi` for automatic request/response validation.

## Source Reference

**Repository:** ~/Sites/ai-use-repos/effect
**File:** `packages/platform-node/test/HttpApi.test.ts`
**Lines:** 353-368

## Code Example

```typescript
import { HttpApiSchema } from "@effect/platform"
import { Schema } from "effect"

class GlobalError extends Schema.TaggedClass<GlobalError>()("GlobalError", {}) {}

class GroupError extends Schema.TaggedClass<GroupError>()("GroupError", {}) {}

class UserError extends Schema.TaggedError<UserError>()("UserError", {}, HttpApiSchema.annotations({ status: 400 })) {}

class NoStatusError extends Schema.TaggedClass<NoStatusError>()("NoStatusError", {}) {}

class User extends Schema.Class<User>("User")({
  id: Schema.Int,
  uuid: Schema.optional(Schema.UUID),
  name: Schema.String,
  createdAt: Schema.DateTimeUtc,
}) {}

class Group extends Schema.Class<Group>("Group")({
  id: Schema.Int,
  name: Schema.String,
}) {}

// Deriving insert schema from class fields
const CreateUserPayload = Schema.Struct(
  Struct.omit(User.fields, "id", "createdAt")
)

// Tagged error with HTTP status annotation
class NotFoundError extends Schema.TaggedError<NotFoundError>()("NotFoundError", {
  projectId: Schema.String,
  message: Schema.String,
}, HttpApiSchema.annotations({ status: 404 })) {}

// Validation error with 400 status
class ValidationError extends Schema.TaggedError<ValidationError>()("ValidationError", {
  field: Schema.String,
  message: Schema.String,
}, HttpApiSchema.annotations({ status: 400 })) {}

// Constructing instances
const user = new User({ id: 1, name: "Alice", createdAt: DateTime.unsafeNow() })

// Using in error handling
const findUser = (id: number) =>
  Effect.gen(function* () {
    const result = yield* repo.findById(id)
    if (Option.isNone(result)) {
      return yield* Effect.fail(new NotFoundError({
        projectId: String(id),
        message: `Project ${id} not found`,
      }))
    }
    return result.value
  })
```

## What This Demonstrates

- **Schema.Class** - Class-based schema with typed fields and constructor
- **Schema.TaggedError** - Tagged error class with `_tag` discriminant and HTTP status
- **Schema.TaggedClass** - Tagged data class for discriminated unions
- **HttpApiSchema.annotations** - Attach HTTP status codes to error schemas
- **Schema.optional** - Optional fields in class schemas
- **Field derivation** - `Struct.omit(User.fields, "id")` to derive schemas from classes
- **Class constructors** - `new User({ id: 1, name: "Alice" })` for type-safe construction
- **Effect.fail with typed errors** - `Effect.fail(new NotFoundError({...}))` for structured errors

## When to Use

- **API request types** - POST payloads in `packages/shared/src/schemas/`
- **API response types** - Success response shapes for each endpoint
- **Error types** - All error types in `packages/api/src/errors/`
- **WebSocket event types** - Tagged classes for event discrimination
- **Domain models** - When you need both runtime validation and class methods

## Pattern Requirements

✓ Use `Schema.Class<Name>("Name")({...fields})` for data types
✓ Use `Schema.TaggedError<Name>()("Name", { fields }, annotations?)` for error types
✓ Always provide `HttpApiSchema.annotations({ status: N })` on error types
✓ Use unique `_tag` strings for each `TaggedError` / `TaggedClass`
✓ Construct instances with `new ClassName({...})` — provides type checking
✓ Place error types in `packages/api/src/errors/` with descriptive names
✓ Place request/response schemas in `packages/shared/src/schemas/`

## Common Mistakes to Avoid

✗ Using plain `class` without `Schema.Class` — loses runtime validation
✗ Forgetting `HttpApiSchema.annotations({ status })` on errors — defaults to 500
✗ Using the same `_tag` string for different error types — causes discrimination conflicts
✗ Not using `Schema.TaggedError` for error types — untagged errors can't be discriminated
✗ Constructing with `as const` assertions instead of `new ClassName({...})`

## Related Anchors

- **SA-004** - HttpApi definition (where these schemas are used)
- **SA-006** - Effect Schema domain types (struct-based schemas)
- **SA-002** - Model.Class (database entity schemas with variant support)
- **SA-005** - HttpApiBuilder handlers (where errors are thrown)
