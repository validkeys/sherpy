/**
 * Resource Allocation RPC endpoint handlers
 * Implements operations for viewing aggregated resource allocation across people and projects
 */

import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { NotFoundError, ValidationError } from "@sherpy/shared";
import { Schema } from "effect";
import {
  PersonAllocation,
  PersonProjectAllocation,
  ProjectAllocation,
} from "../../services/people/ResourceAllocationService.js";

/**
 * Request/Response schemas for resource allocation endpoints
 */

// GET /api/allocations/by-person - Get allocation by person
export class AllocationByPersonResponse extends Schema.Class<AllocationByPersonResponse>(
  "AllocationByPersonResponse",
)({
  allocations: Schema.Array(Schema.typeSchema(PersonAllocation)),
}) {}

// GET /api/allocations/by-project - Get allocation by project
export class AllocationByProjectResponse extends Schema.Class<AllocationByProjectResponse>(
  "AllocationByProjectResponse",
)({
  allocations: Schema.Array(Schema.typeSchema(ProjectAllocation)),
}) {}

// GET /api/people/:personId/allocations/by-project - Get person's allocation breakdown by project
export class PersonAllocationByProjectParams extends Schema.Class<PersonAllocationByProjectParams>(
  "PersonAllocationByProjectParams",
)({
  personId: Schema.String,
}) {}

export class PersonAllocationByProjectResponse extends Schema.Class<
  PersonAllocationByProjectResponse
>("PersonAllocationByProjectResponse")({
  allocations: Schema.Array(Schema.typeSchema(PersonProjectAllocation)),
}) {}

/**
 * Resource Allocation API Group - defines all resource allocation endpoints
 */
export class ResourceAllocationApi extends HttpApiGroup.make("resourceAllocation")
  .add(
    HttpApiEndpoint.get("allocationByPerson", "/allocations/by-person")
      .addSuccess(AllocationByPersonResponse)
      .addError(ValidationError),
  )
  .add(
    HttpApiEndpoint.get("allocationByProject", "/allocations/by-project")
      .addSuccess(AllocationByProjectResponse)
      .addError(ValidationError),
  )
  .add(
    HttpApiEndpoint.get(
      "personAllocationByProject",
      "/people/:personId/allocations/by-project",
    )
      .addSuccess(PersonAllocationByProjectResponse)
      .addError(NotFoundError)
      .addError(ValidationError)
      .setPath(PersonAllocationByProjectParams),
  )
  .prefix("/api") {}
