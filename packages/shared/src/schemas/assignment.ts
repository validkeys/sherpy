/**
 * Assignment domain schema using @effect/sql Model.Class
 * Represents assignment of a person to a task with allocation percentage
 */

import { Model } from "@effect/sql";
import { Schema } from "effect";
import { DateTimeInsertWithOpenApi, DateTimeUpdateWithOpenApi, GeneratedUuidWithOpenApi } from "./openapi-helpers.js";

/**
 * Assignment status enum
 */
export const AssignmentStatus = Schema.Literal("planned", "active", "completed", "cancelled");

export type AssignmentStatus = typeof AssignmentStatus.Type;

/**
 * Assignment entity - links people to tasks with time allocation
 */
export class Assignment extends Model.Class<Assignment>("Assignment")({
  id: GeneratedUuidWithOpenApi,
  taskId: Schema.String,
  personId: Schema.String,
  allocationPercentage: Schema.Number.pipe(
    Schema.int(),
    Schema.greaterThanOrEqualTo(0),
    Schema.lessThanOrEqualTo(100),
  ),
  startDate: Schema.optional(Schema.String),
  endDate: Schema.optional(Schema.String),
  status: AssignmentStatus,
  createdAt: DateTimeInsertWithOpenApi,
  updatedAt: DateTimeUpdateWithOpenApi,
}) {}
