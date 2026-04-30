/**
 * Assignments RPC endpoint handlers
 * Implements operations for task-person assignments with allocation tracking
 */

import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Assignment, ConflictError, NotFoundError, ValidationError } from "@sherpy/shared";
import { Schema } from "effect";

/**
 * Request/Response schemas for assignments endpoints
 */

// POST /api/assignments - Assign person to task
export class AssignRequest extends Schema.Class<AssignRequest>("AssignRequest")({
  taskId: Schema.String,
  personId: Schema.String,
  allocationPercentage: Schema.Number.pipe(
    Schema.int(),
    Schema.greaterThanOrEqualTo(1),
    Schema.lessThanOrEqualTo(100),
  ),
  startDate: Schema.optional(Schema.String),
  endDate: Schema.optional(Schema.String),
}) {}

export class AssignResponse extends Schema.Class<AssignResponse>("AssignResponse")({
  assignment: Assignment,
}) {}

// DELETE /api/assignments/:assignmentId - Unassign person from task
export class UnassignParams extends Schema.Class<UnassignParams>("UnassignParams")({
  assignmentId: Schema.String,
}) {}

export class UnassignResponse extends Schema.Class<UnassignResponse>("UnassignResponse")({
  success: Schema.Boolean,
}) {}

// PATCH /api/assignments/:assignmentId - Update assignment allocation
export class UpdateAllocationParams extends Schema.Class<UpdateAllocationParams>(
  "UpdateAllocationParams",
)({
  assignmentId: Schema.String,
}) {}

export class UpdateAllocationRequest extends Schema.Class<UpdateAllocationRequest>(
  "UpdateAllocationRequest",
)({
  allocationPercentage: Schema.Number.pipe(
    Schema.int(),
    Schema.greaterThanOrEqualTo(1),
    Schema.lessThanOrEqualTo(100),
  ),
  startDate: Schema.optional(Schema.String),
  endDate: Schema.optional(Schema.String),
}) {}

export class UpdateAllocationResponse extends Schema.Class<UpdateAllocationResponse>(
  "UpdateAllocationResponse",
)({
  assignment: Assignment,
}) {}

// GET /api/people/:personId/assignments - List assignments for person
export class ListAssignmentsByPersonParams extends Schema.Class<ListAssignmentsByPersonParams>(
  "ListAssignmentsByPersonParams",
)({
  personId: Schema.String,
}) {}

export class ListAssignmentsByPersonResponse extends Schema.Class<ListAssignmentsByPersonResponse>(
  "ListAssignmentsByPersonResponse",
)({
  assignments: Schema.Array(Assignment),
}) {}

// GET /api/tasks/:taskId/assignments - List assignments for task
export class ListAssignmentsByTaskParams extends Schema.Class<ListAssignmentsByTaskParams>(
  "ListAssignmentsByTaskParams",
)({
  taskId: Schema.String,
}) {}

export class ListAssignmentsByTaskResponse extends Schema.Class<ListAssignmentsByTaskResponse>(
  "ListAssignmentsByTaskResponse",
)({
  assignments: Schema.Array(Assignment),
}) {}

// GET /api/projects/:projectId/assignments - List assignments for project
export class ListAssignmentsByProjectParams extends Schema.Class<ListAssignmentsByProjectParams>(
  "ListAssignmentsByProjectParams",
)({
  projectId: Schema.String,
}) {}

export class ListAssignmentsByProjectResponse extends Schema.Class<ListAssignmentsByProjectResponse>(
  "ListAssignmentsByProjectResponse",
)({
  assignments: Schema.Array(Assignment),
}) {}

/**
 * Assignments API Group - defines all assignment endpoints
 */
export class AssignmentsApi extends HttpApiGroup.make("assignments")
  .add(
    HttpApiEndpoint.post("assign", "/assignments")
      .addSuccess(AssignResponse)
      .addError(NotFoundError)
      .addError(ValidationError)
      .addError(ConflictError)
      .setPayload(AssignRequest),
  )
  .add(
    HttpApiEndpoint.del("unassign", "/assignments/:assignmentId")
      .addSuccess(UnassignResponse)
      .addError(NotFoundError)
      .addError(ValidationError)
      .setPath(UnassignParams),
  )
  .add(
    HttpApiEndpoint.patch("updateAllocation", "/assignments/:assignmentId")
      .addSuccess(UpdateAllocationResponse)
      .addError(NotFoundError)
      .addError(ValidationError)
      .addError(ConflictError)
      .setPath(UpdateAllocationParams)
      .setPayload(UpdateAllocationRequest),
  )
  .add(
    HttpApiEndpoint.get("listAssignmentsByPerson", "/people/:personId/assignments")
      .addSuccess(ListAssignmentsByPersonResponse)
      .addError(NotFoundError)
      .addError(ValidationError)
      .setPath(ListAssignmentsByPersonParams),
  )
  .add(
    HttpApiEndpoint.get("listAssignmentsByTask", "/tasks/:taskId/assignments")
      .addSuccess(ListAssignmentsByTaskResponse)
      .addError(NotFoundError)
      .addError(ValidationError)
      .setPath(ListAssignmentsByTaskParams),
  )
  .add(
    HttpApiEndpoint.get("listAssignmentsByProject", "/projects/:projectId/assignments")
      .addSuccess(ListAssignmentsByProjectResponse)
      .addError(ValidationError)
      .setPath(ListAssignmentsByProjectParams),
  )
  .prefix("/api") {}
