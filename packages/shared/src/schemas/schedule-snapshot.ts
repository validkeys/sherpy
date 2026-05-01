/**
 * ScheduleSnapshot domain schema using @effect/sql Model.Class
 * Represents AI-generated schedules and scenario analyses
 */

import { Model } from "@effect/sql";
import { Schema } from "effect";
import { DateTimeInsertWithOpenApi, GeneratedUuidWithOpenApi } from "./openapi-helpers.js";

/**
 * Schedule snapshot type enum
 */
export const ScheduleSnapshotType = Schema.Literal("full", "scenario", "what-if");

export type ScheduleSnapshotType = typeof ScheduleSnapshotType.Type;

/**
 * ScheduleSnapshot entity - stores AI scheduling results
 */
export class ScheduleSnapshot extends Model.Class<ScheduleSnapshot>("ScheduleSnapshot")({
  id: GeneratedUuidWithOpenApi,
  projectId: Schema.String,
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)),
  type: ScheduleSnapshotType,
  parameters: Model.JsonFromString(
    Schema.Record({
      key: Schema.String,
      value: Schema.Unknown,
    }),
  ),
  result: Model.JsonFromString(
    Schema.Record({
      key: Schema.String,
      value: Schema.Unknown,
    }),
  ),
  reasoning: Schema.optional(Schema.String), // AI-generated explanation
  createdAt: DateTimeInsertWithOpenApi,
}) {}
