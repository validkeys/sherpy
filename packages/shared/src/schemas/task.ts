/**
 * Task domain schema using @effect/sql Model.Class
 * Represents individual tasks within a milestone
 */

import { Model } from "@effect/sql"
import { Schema } from "effect"

/**
 * Task status enum
 */
export const TaskStatus = Schema.Literal(
  "pending",
  "in-progress",
  "blocked",
  "complete",
)

export type TaskStatus = typeof TaskStatus.Type

/**
 * Task entity - represents a discrete unit of work within a milestone
 */
export class Task extends Model.Class<Task>("Task")({
  id: Model.Generated(Schema.String),
  milestoneId: Schema.String,
  projectId: Schema.String,
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)),
  description: Schema.optional(Schema.String),
  status: TaskStatus,
  priority: Schema.Literal("low", "medium", "high"),
  estimatedHours: Schema.optional(
    Schema.Number.pipe(Schema.positive(), Schema.finite()),
  ),
  actualHours: Schema.optional(
    Schema.Number.pipe(Schema.nonNegative(), Schema.finite()),
  ),
  orderIndex: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  createdAt: Model.DateTimeInsert,
  updatedAt: Model.DateTimeUpdate,
}) {}
