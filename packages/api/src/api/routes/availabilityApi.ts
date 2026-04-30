/**
 * Availability RPC endpoint handlers
 * Implements operations for tracking person availability windows
 */

import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import {
  AvailabilityType,
  AvailabilityWindow,
  NotFoundError,
  ValidationError,
} from "@sherpy/shared";
import { Schema } from "effect";

/**
 * Request/Response schemas for availability endpoints
 */

// POST /api/people/:personId/availability - Create availability window
export class CreateAvailabilityParams extends Schema.Class<CreateAvailabilityParams>(
  "CreateAvailabilityParams",
)({
  personId: Schema.String,
}) {}

export class CreateAvailabilityRequest extends Schema.Class<CreateAvailabilityRequest>(
  "CreateAvailabilityRequest",
)({
  startDate: Schema.String, // ISO 8601 date
  endDate: Schema.String, // ISO 8601 date
  type: AvailabilityType,
  description: Schema.optional(Schema.String),
}) {}

export class CreateAvailabilityResponse extends Schema.Class<CreateAvailabilityResponse>(
  "CreateAvailabilityResponse",
)({
  availabilityWindow: AvailabilityWindow,
}) {}

// PATCH /api/availability/:availabilityId - Update availability window
export class UpdateAvailabilityParams extends Schema.Class<UpdateAvailabilityParams>(
  "UpdateAvailabilityParams",
)({
  availabilityId: Schema.String,
}) {}

export class UpdateAvailabilityRequest extends Schema.Class<UpdateAvailabilityRequest>(
  "UpdateAvailabilityRequest",
)({
  startDate: Schema.optional(Schema.String),
  endDate: Schema.optional(Schema.String),
  type: Schema.optional(AvailabilityType),
  description: Schema.optional(Schema.String),
}) {}

export class UpdateAvailabilityResponse extends Schema.Class<UpdateAvailabilityResponse>(
  "UpdateAvailabilityResponse",
)({
  availabilityWindow: AvailabilityWindow,
}) {}

// DELETE /api/availability/:availabilityId - Remove availability window
export class RemoveAvailabilityParams extends Schema.Class<RemoveAvailabilityParams>(
  "RemoveAvailabilityParams",
)({
  availabilityId: Schema.String,
}) {}

export class RemoveAvailabilityResponse extends Schema.Class<RemoveAvailabilityResponse>(
  "RemoveAvailabilityResponse",
)({
  success: Schema.Boolean,
}) {}

// GET /api/people/:personId/availability - List availability windows for person
export class ListAvailabilityByPersonParams extends Schema.Class<ListAvailabilityByPersonParams>(
  "ListAvailabilityByPersonParams",
)({
  personId: Schema.String,
}) {}

export class ListAvailabilityByPersonResponse extends Schema.Class<ListAvailabilityByPersonResponse>(
  "ListAvailabilityByPersonResponse",
)({
  availabilityWindows: Schema.Array(AvailabilityWindow),
}) {}

// GET /api/people/:personId/availability/overlapping - List overlapping availability windows
export class ListOverlappingAvailabilityParams extends Schema.Class<ListOverlappingAvailabilityParams>(
  "ListOverlappingAvailabilityParams",
)({
  personId: Schema.String,
}) {}

export class ListOverlappingAvailabilityQueryParams extends Schema.Class<ListOverlappingAvailabilityQueryParams>(
  "ListOverlappingAvailabilityQueryParams",
)({
  startDate: Schema.String,
  endDate: Schema.String,
}) {}

export class ListOverlappingAvailabilityResponse extends Schema.Class<ListOverlappingAvailabilityResponse>(
  "ListOverlappingAvailabilityResponse",
)({
  availabilityWindows: Schema.Array(AvailabilityWindow),
}) {}

/**
 * Availability API Group - defines all availability endpoints
 */
export class AvailabilityApi extends HttpApiGroup.make("availability")
  .add(
    HttpApiEndpoint.post("createAvailability", "/people/:personId/availability")
      .addSuccess(CreateAvailabilityResponse)
      .addError(NotFoundError)
      .addError(ValidationError)
      .setPath(CreateAvailabilityParams)
      .setPayload(CreateAvailabilityRequest),
  )
  .add(
    HttpApiEndpoint.patch("updateAvailability", "/availability/:availabilityId")
      .addSuccess(UpdateAvailabilityResponse)
      .addError(NotFoundError)
      .addError(ValidationError)
      .setPath(UpdateAvailabilityParams)
      .setPayload(UpdateAvailabilityRequest),
  )
  .add(
    HttpApiEndpoint.del("removeAvailability", "/availability/:availabilityId")
      .addSuccess(RemoveAvailabilityResponse)
      .addError(NotFoundError)
      .addError(ValidationError)
      .setPath(RemoveAvailabilityParams),
  )
  .add(
    HttpApiEndpoint.get("listAvailabilityByPerson", "/people/:personId/availability")
      .addSuccess(ListAvailabilityByPersonResponse)
      .addError(NotFoundError)
      .addError(ValidationError)
      .setPath(ListAvailabilityByPersonParams),
  )
  .add(
    HttpApiEndpoint.get("listOverlappingAvailability", "/people/:personId/availability/overlapping")
      .addSuccess(ListOverlappingAvailabilityResponse)
      .addError(NotFoundError)
      .addError(ValidationError)
      .setPath(ListOverlappingAvailabilityParams)
      .setUrlParams(ListOverlappingAvailabilityQueryParams),
  )
  .prefix("/api") {}
