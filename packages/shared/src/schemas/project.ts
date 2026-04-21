/**
 * Project domain schema using @effect/sql Model.Class
 * Represents the main project entity with pipeline status tracking
 */

import { Model } from "@effect/sql"
import { Schema } from "effect"

/**
 * Pipeline status enum - tracks project progression through Sherpy workflow
 */
export const PipelineStatus = Schema.Literal(
  "intake",
  "gap-analysis",
  "business-requirements",
  "technical-requirements",
  "style-anchors",
  "implementation-planning",
  "plan-review",
  "architecture-decisions",
  "delivery-timeline",
  "qa-test-plan",
  "summaries",
  "active-development",
  "completed",
  "archived",
)

export type PipelineStatus = typeof PipelineStatus.Type

/**
 * Project priority levels
 */
export const Priority = Schema.Literal("low", "medium", "high", "critical")

export type Priority = typeof Priority.Type

/**
 * Project entity - represents a planning/development project in Sherpy PM
 */
export class Project extends Model.Class<Project>("Project")({
  id: Model.Generated(Schema.String),
  slug: Schema.String.pipe(
    Schema.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    Schema.minLength(1),
    Schema.maxLength(100),
  ),
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)),
  description: Schema.optional(Schema.String),
  pipelineStatus: PipelineStatus,
  assignedPeople: Model.JsonFromString(Schema.Array(Schema.String)),
  tags: Model.JsonFromString(Schema.Array(Schema.String)),
  priority: Priority,
  createdAt: Model.DateTimeInsert,
  updatedAt: Model.DateTimeUpdate,
}) {}
