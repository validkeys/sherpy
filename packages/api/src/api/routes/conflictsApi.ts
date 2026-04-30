/**
 * Conflicts RPC endpoint handlers
 * Implements operations for detecting scheduling conflicts (over-allocation and availability conflicts)
 */

import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { NotFoundError, ValidationError } from "@sherpy/shared";
import { Schema } from "effect";
import { Conflict } from "../../services/people/ConflictService.js";

/**
 * Request/Response schemas for conflicts endpoints
 */

// GET /api/people/:personId/conflicts - Detect all conflicts for a person
export class DetectConflictsParams extends Schema.Class<DetectConflictsParams>(
  "DetectConflictsParams",
)({
  personId: Schema.String,
}) {}

export class DetectConflictsQueryParams extends Schema.Class<DetectConflictsQueryParams>(
  "DetectConflictsQueryParams",
)({
  startDate: Schema.String,
  endDate: Schema.String,
}) {}

export class DetectConflictsResponse extends Schema.Class<DetectConflictsResponse>(
  "DetectConflictsResponse",
)({
  conflicts: Schema.Array(Conflict),
}) {}

/**
 * Conflicts API Group - defines all conflict detection endpoints
 */
export class ConflictsApi extends HttpApiGroup.make("conflicts")
  .add(
    HttpApiEndpoint.get("detectConflicts", "/people/:personId/conflicts")
      .addSuccess(DetectConflictsResponse)
      .addError(NotFoundError)
      .addError(ValidationError)
      .setPath(DetectConflictsParams)
      .setUrlParams(DetectConflictsQueryParams),
  )
  .prefix("/api") {}
