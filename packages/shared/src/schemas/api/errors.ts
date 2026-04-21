/**
 * API error types using Schema.TaggedError
 * All errors include HTTP status annotations for @effect/platform HttpApi
 */

import { HttpApiSchema } from "@effect/platform"
import { Schema } from "effect"

/**
 * 404 Not Found - Resource does not exist
 */
export class NotFoundError extends Schema.TaggedError<NotFoundError>()(
  "NotFoundError",
  {
    entity: Schema.String,
    id: Schema.String,
    message: Schema.optional(Schema.String),
  },
  HttpApiSchema.annotations({ status: 404 }),
) {}

/**
 * 409 Conflict - Duplicate resource or conflicting state
 */
export class ConflictError extends Schema.TaggedError<ConflictError>()(
  "ConflictError",
  {
    resource: Schema.String,
    conflictType: Schema.Literal("duplicate", "state-conflict", "constraint"),
    message: Schema.String,
  },
  HttpApiSchema.annotations({ status: 409 }),
) {}

/**
 * 400 Bad Request - Schema validation failure
 */
export class ValidationError extends Schema.TaggedError<ValidationError>()(
  "ValidationError",
  {
    field: Schema.optional(Schema.String),
    message: Schema.String,
    errors: Schema.optional(Schema.Array(Schema.String)),
  },
  HttpApiSchema.annotations({ status: 400 }),
) {}

/**
 * 401 Unauthorized - Missing or invalid JWT token
 */
export class UnauthorizedError extends Schema.TaggedError<UnauthorizedError>()(
  "UnauthorizedError",
  {
    message: Schema.String,
  },
  HttpApiSchema.annotations({ status: 401 }),
) {}

/**
 * 403 Forbidden - Insufficient permissions (future use)
 */
export class ForbiddenError extends Schema.TaggedError<ForbiddenError>()(
  "ForbiddenError",
  {
    resource: Schema.String,
    action: Schema.String,
    message: Schema.String,
  },
  HttpApiSchema.annotations({ status: 403 }),
) {}

/**
 * 500 Internal Server Error - Unexpected server error
 */
export class InternalError extends Schema.TaggedError<InternalError>()(
  "InternalError",
  {
    message: Schema.String,
    cause: Schema.optional(Schema.String),
  },
  HttpApiSchema.annotations({ status: 500 }),
) {}
