/**
 * Person domain schema using @effect/sql Model.Class
 * Represents team members and their capacity
 */

import { Model } from "@effect/sql";
import { Schema } from "effect";
import { DateTimeInsertWithOpenApi, DateTimeUpdateWithOpenApi, GeneratedUuidWithOpenApi } from "./openapi-helpers.js";

/**
 * Person entity - represents a team member with capacity tracking
 */
export class Person extends Model.Class<Person>("Person")({
  id: GeneratedUuidWithOpenApi,
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)),
  email: Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
  oktaUserId: Schema.optional(Schema.NullOr(Schema.String)),
  capacityHoursPerWeek: Schema.Number.pipe(
    Schema.positive(),
    Schema.finite(),
    Schema.lessThanOrEqualTo(168), // Max hours in a week
  ),
  createdAt: DateTimeInsertWithOpenApi,
  updatedAt: DateTimeUpdateWithOpenApi,
}) {}
