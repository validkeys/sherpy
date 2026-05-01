/**
 * Task domain schema using @effect/sql Model.Class
 * Represents individual tasks within a milestone
 */

import { Model } from "@effect/sql";
import { Schema } from "effect";
import { DateTimeInsertWithOpenApi, DateTimeUpdateWithOpenApi, GeneratedUuidWithOpenApi } from "./openapi-helpers.js";

/**
 * Task status enum
 */
export const TaskStatus = Schema.Literal("pending", "in-progress", "blocked", "complete");

export type TaskStatus = typeof TaskStatus.Type;

/**
 * Task entity - represents a discrete unit of work within a milestone
 */
export class Task extends Model.Class<Task>("Task")({
  id: GeneratedUuidWithOpenApi,
  milestoneId: Schema.String,
  projectId: Schema.String,
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)),
  description: Schema.optional(
    Schema.NullOr(Schema.String).pipe(
      Schema.transform(Schema.UndefinedOr(Schema.String), {
        strict: false,
        decode: (nullOrStr) => (nullOrStr === null ? undefined : nullOrStr),
        encode: (undefinedOrStr) => (undefinedOrStr === undefined ? null : undefinedOrStr),
      }),
    ),
  ),
  status: TaskStatus,
  priority: Schema.Literal("low", "medium", "high"),
  estimatedHours: Schema.optional(
    Schema.NullOr(Schema.Number.pipe(Schema.positive(), Schema.finite())).pipe(
      Schema.transform(Schema.UndefinedOr(Schema.Number.pipe(Schema.positive(), Schema.finite())), {
        strict: false,
        decode: (nullOrNum) => (nullOrNum === null ? undefined : nullOrNum),
        encode: (undefinedOrNum) => (undefinedOrNum === undefined ? null : undefinedOrNum),
      }),
    ),
  ),
  actualHours: Schema.optional(
    Schema.NullOr(Schema.Number.pipe(Schema.nonNegative(), Schema.finite())).pipe(
      Schema.transform(
        Schema.UndefinedOr(Schema.Number.pipe(Schema.nonNegative(), Schema.finite())),
        {
          strict: false,
          decode: (nullOrNum) => (nullOrNum === null ? undefined : nullOrNum),
          encode: (undefinedOrNum) => (undefinedOrNum === undefined ? null : undefinedOrNum),
        },
      ),
    ),
  ),
  orderIndex: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  createdAt: DateTimeInsertWithOpenApi,
  updatedAt: DateTimeUpdateWithOpenApi,
}) {}
