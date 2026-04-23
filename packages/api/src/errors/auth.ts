/**
 * Authentication error types
 * Tagged errors for authentication failures
 */

import { HttpApiSchema } from "@effect/platform";
import { Schema } from "effect";

/**
 * UnauthorizedError - 401 authentication failure
 * Used when JWT validation fails or token is missing/invalid
 */
export class UnauthorizedError extends Schema.TaggedError<UnauthorizedError>()(
  "UnauthorizedError",
  {
    message: Schema.String,
  },
  HttpApiSchema.annotations({ status: 401 }),
) {}

/**
 * ForbiddenError - 403 authorization failure
 * Used when authenticated user lacks permissions for resource
 */
export class ForbiddenError extends Schema.TaggedError<ForbiddenError>()(
  "ForbiddenError",
  {
    message: Schema.String,
    resource: Schema.optional(Schema.String),
  },
  HttpApiSchema.annotations({ status: 403 }),
) {}
