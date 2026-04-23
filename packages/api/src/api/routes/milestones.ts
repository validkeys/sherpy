/**
 * Milestone RPC endpoint handlers
 * Implements CRUD operations for milestones with schema validation
 */

import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { ConflictError, Milestone, NotFoundError, ValidationError } from "@sherpy/shared";
import { Schema } from "effect";

/**
 * Request/Response schemas for milestone endpoints
 */

// POST /api/projects/:projectId/milestones - Create milestone
export class CreateMilestoneParams extends Schema.Class<CreateMilestoneParams>(
  "CreateMilestoneParams",
)({
  projectId: Schema.String,
}) {}

export class CreateMilestoneRequest extends Schema.Class<CreateMilestoneRequest>(
  "CreateMilestoneRequest",
)({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)),
  description: Schema.optional(Schema.String),
  estimatedDays: Schema.optional(Schema.Number.pipe(Schema.positive())),
  acceptanceCriteria: Schema.optional(Schema.String),
}) {}

export class CreateMilestoneResponse extends Schema.Class<CreateMilestoneResponse>(
  "CreateMilestoneResponse",
)({
  milestone: Schema.typeSchema(Milestone),
}) {}

// GET /api/projects/:projectId/milestones - List milestones
export class ListMilestonesParams extends Schema.Class<ListMilestonesParams>(
  "ListMilestonesParams",
)({
  projectId: Schema.String,
}) {}

export class ListMilestonesResponse extends Schema.Class<ListMilestonesResponse>(
  "ListMilestonesResponse",
)({
  milestones: Schema.Array(Schema.typeSchema(Milestone)),
}) {}

// GET /api/milestones/:milestoneId - Get milestone
export class GetMilestoneParams extends Schema.Class<GetMilestoneParams>("GetMilestoneParams")({
  milestoneId: Schema.String,
}) {}

export class GetMilestoneResponse extends Schema.Class<GetMilestoneResponse>(
  "GetMilestoneResponse",
)({
  milestone: Schema.typeSchema(Milestone),
}) {}

// PATCH /api/milestones/:milestoneId - Update milestone
export class UpdateMilestoneParams extends Schema.Class<UpdateMilestoneParams>(
  "UpdateMilestoneParams",
)({
  milestoneId: Schema.String,
}) {}

export class UpdateMilestoneRequest extends Schema.Class<UpdateMilestoneRequest>(
  "UpdateMilestoneRequest",
)({
  name: Schema.optional(Schema.String.pipe(Schema.minLength(1))),
  description: Schema.optional(Schema.String),
  status: Schema.optional(Schema.Literal("pending", "in-progress", "blocked", "complete")),
  estimatedDays: Schema.optional(Schema.Number.pipe(Schema.positive())),
  acceptanceCriteria: Schema.optional(Schema.String),
}) {}

export class UpdateMilestoneResponse extends Schema.Class<UpdateMilestoneResponse>(
  "UpdateMilestoneResponse",
)({
  milestone: Schema.typeSchema(Milestone),
}) {}

// PUT /api/projects/:projectId/milestones/reorder - Reorder milestones
export class ReorderMilestonesParams extends Schema.Class<ReorderMilestonesParams>(
  "ReorderMilestonesParams",
)({
  projectId: Schema.String,
}) {}

export class ReorderMilestonesRequest extends Schema.Class<ReorderMilestonesRequest>(
  "ReorderMilestonesRequest",
)({
  milestoneIds: Schema.Array(Schema.String),
}) {}

export class ReorderMilestonesResponse extends Schema.Class<ReorderMilestonesResponse>(
  "ReorderMilestonesResponse",
)({
  success: Schema.Literal(true),
}) {}

/**
 * Milestones API Group - defines all milestone endpoints
 * All endpoints require Authentication middleware
 */
export class MilestonesApi extends HttpApiGroup.make("milestones")
  .add(
    HttpApiEndpoint.post("createMilestone", "/projects/:projectId/milestones")
      .addSuccess(CreateMilestoneResponse)
      .addError(NotFoundError)
      .addError(ValidationError)
      .addError(ConflictError)
      .setPath(CreateMilestoneParams)
      .setPayload(CreateMilestoneRequest),
  )
  .add(
    HttpApiEndpoint.get("listMilestones", "/projects/:projectId/milestones")
      .addSuccess(ListMilestonesResponse)
      .addError(ValidationError)
      .setPath(ListMilestonesParams),
  )
  .add(
    HttpApiEndpoint.get("getMilestone", "/milestones/:milestoneId")
      .addSuccess(GetMilestoneResponse)
      .addError(NotFoundError)
      .setPath(GetMilestoneParams),
  )
  .add(
    HttpApiEndpoint.patch("updateMilestone", "/milestones/:milestoneId")
      .addSuccess(UpdateMilestoneResponse)
      .addError(NotFoundError)
      .addError(ValidationError)
      .setPath(UpdateMilestoneParams)
      .setPayload(UpdateMilestoneRequest),
  )
  .add(
    HttpApiEndpoint.put("reorderMilestones", "/projects/:projectId/milestones/reorder")
      .addSuccess(ReorderMilestonesResponse)
      .addError(NotFoundError)
      .addError(ValidationError)
      .setPath(ReorderMilestonesParams)
      .setPayload(ReorderMilestonesRequest),
  )
  .prefix("/api") {}
