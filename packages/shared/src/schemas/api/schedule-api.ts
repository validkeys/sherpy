/**
 * Schedule API request/response schemas using Schema.Class
 */

import { Schema } from "effect"
import { ScheduleSnapshot } from "../schedule-snapshot.js"

/**
 * Generate Schedule Request
 */
export class GenerateScheduleRequest extends Schema.Class<
  GenerateScheduleRequest
>("GenerateScheduleRequest")({
  projectId: Schema.String,
  constraints: Schema.optional(
    Schema.Record({
      key: Schema.String,
      value: Schema.Unknown,
    }),
  ),
}) {}

/**
 * Generate Schedule Response
 */
export class GenerateScheduleResponse extends Schema.Class<
  GenerateScheduleResponse
>("GenerateScheduleResponse")({
  snapshot: Schema.typeSchema(ScheduleSnapshot),
  warnings: Schema.optional(Schema.Array(Schema.String)),
}) {}

/**
 * Create Scenario Request
 */
export class CreateScenarioRequest extends Schema.Class<CreateScenarioRequest>(
  "CreateScenarioRequest",
)({
  projectId: Schema.String,
  scenarioName: Schema.String.pipe(Schema.minLength(1)),
  parameters: Schema.Record({
    key: Schema.String,
    value: Schema.Unknown,
  }),
}) {}

/**
 * Create Scenario Response
 */
export class CreateScenarioResponse extends Schema.Class<
  CreateScenarioResponse
>("CreateScenarioResponse")({
  snapshot: Schema.typeSchema(ScheduleSnapshot),
}) {}

/**
 * What-If Reschedule Request
 */
export class WhatIfRescheduleRequest extends Schema.Class<
  WhatIfRescheduleRequest
>("WhatIfRescheduleRequest")({
  projectId: Schema.String,
  disruptions: Schema.Array(
    Schema.Struct({
      type: Schema.Literal("delay", "unavailability", "resource-change"),
      impact: Schema.String,
      parameters: Schema.Record({
        key: Schema.String,
        value: Schema.Unknown,
      }),
    }),
  ),
}) {}

/**
 * What-If Reschedule Response
 */
export class WhatIfRescheduleResponse extends Schema.Class<
  WhatIfRescheduleResponse
>("WhatIfRescheduleResponse")({
  snapshot: Schema.typeSchema(ScheduleSnapshot),
  comparison: Schema.optional(
    Schema.Struct({
      originalEndDate: Schema.String,
      newEndDate: Schema.String,
      delayDays: Schema.Number,
    }),
  ),
}) {}

/**
 * List Schedule Snapshots Request
 */
export class ListScheduleSnapshotsRequest extends Schema.Class<
  ListScheduleSnapshotsRequest
>("ListScheduleSnapshotsRequest")({
  projectId: Schema.String,
  limit: Schema.optional(Schema.Number.pipe(Schema.int(), Schema.positive())),
}) {}

/**
 * List Schedule Snapshots Response
 */
export class ListScheduleSnapshotsResponse extends Schema.Class<
  ListScheduleSnapshotsResponse
>("ListScheduleSnapshotsResponse")({
  snapshots: Schema.Array(Schema.typeSchema(ScheduleSnapshot)),
  total: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
}) {}
