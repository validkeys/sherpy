/**
 * Milestone domain schema using @effect/sql Model.Class
 * Represents milestones within a project
 */

import { Model } from "@effect/sql";
import { Schema } from "effect";
import { DateTimeInsertWithOpenApi, DateTimeUpdateWithOpenApi, GeneratedUuidWithOpenApi } from "./openapi-helpers.js";

/**
 * Milestone status enum
 */
export const MilestoneStatus = Schema.Literal("pending", "in-progress", "blocked", "complete");

export type MilestoneStatus = typeof MilestoneStatus.Type;

/**
 * Milestone entity - represents a major deliverable phase in a project
 */
export class Milestone extends Model.Class<Milestone>("Milestone")({
  id: GeneratedUuidWithOpenApi,
  projectId: Schema.String,
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)),
  description: Schema.optional(Schema.String),
  status: MilestoneStatus,
  orderIndex: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  estimatedDays: Schema.optional(
    Schema.NullOr(Schema.Number.pipe(Schema.positive(), Schema.finite())).pipe(
      Schema.transform(Schema.UndefinedOr(Schema.Number.pipe(Schema.positive(), Schema.finite())), {
        strict: false,
        decode: (nullOrNum) => (nullOrNum === null ? undefined : nullOrNum),
        encode: (undefinedOrNum) => (undefinedOrNum === undefined ? null : undefinedOrNum),
      }),
    ),
  ),
  acceptanceCriteria: Schema.optional(
    Schema.NullOr(Schema.String).pipe(
      Schema.transform(Schema.UndefinedOr(Schema.String), {
        strict: false,
        decode: (nullOrStr) => (nullOrStr === null ? undefined : nullOrStr),
        encode: (undefinedOrStr) => (undefinedOrStr === undefined ? null : undefinedOrStr),
      }),
    ),
  ),
  createdAt: DateTimeInsertWithOpenApi,
  updatedAt: DateTimeUpdateWithOpenApi,
}) {}
