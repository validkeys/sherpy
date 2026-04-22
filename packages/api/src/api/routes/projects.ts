/**
 * Project RPC endpoint handlers
 * Implements CRUD operations for projects with schema validation
 */

import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiMiddleware,
} from "@effect/platform"
import { Schema } from "effect"
import { Project, NotFoundError, ValidationError, ConflictError } from "@sherpy/shared"

/**
 * Request/Response schemas for project endpoints
 */

// POST /api/projects - Create project
export class CreateProjectRequest extends Schema.Class<CreateProjectRequest>(
  "CreateProjectRequest"
)({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)),
  description: Schema.optional(Schema.String),
  slug: Schema.optional(
    Schema.String.pipe(
      Schema.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      Schema.minLength(1),
      Schema.maxLength(100)
    )
  ),
  tags: Schema.optional(Schema.Array(Schema.String)),
  priority: Schema.optional(Schema.Literal("low", "medium", "high", "critical")),
}) {}

export class CreateProjectResponse extends Schema.Class<CreateProjectResponse>(
  "CreateProjectResponse"
)({
  project: Schema.typeSchema(Project),
}) {}

// GET /api/projects - List projects
export class ListProjectsQueryParams extends Schema.Class<ListProjectsQueryParams>(
  "ListProjectsQueryParams"
)({
  pipelineStatus: Schema.optional(Schema.Array(Schema.String)),
  priority: Schema.optional(Schema.Array(Schema.String)),
  search: Schema.optional(Schema.String),
  limit: Schema.optional(Schema.NumberFromString),
  offset: Schema.optional(Schema.NumberFromString),
}) {}

export class ListProjectsResponse extends Schema.Class<ListProjectsResponse>(
  "ListProjectsResponse"
)({
  projects: Schema.Array(Schema.typeSchema(Project)),
}) {}

// GET /api/projects/:projectId - Get project
export class GetProjectParams extends Schema.Class<GetProjectParams>(
  "GetProjectParams"
)({
  projectId: Schema.String,
}) {}

export class GetProjectResponse extends Schema.Class<GetProjectResponse>(
  "GetProjectResponse"
)({
  project: Schema.typeSchema(Project),
}) {}

// PATCH /api/projects/:projectId - Update project
export class UpdateProjectParams extends Schema.Class<UpdateProjectParams>(
  "UpdateProjectParams"
)({
  projectId: Schema.String,
}) {}

export class UpdateProjectRequest extends Schema.Class<UpdateProjectRequest>(
  "UpdateProjectRequest"
)({
  name: Schema.optional(Schema.String.pipe(Schema.minLength(1))),
  description: Schema.optional(Schema.String),
  pipelineStatus: Schema.optional(Schema.String),
  tags: Schema.optional(Schema.Array(Schema.String)),
  priority: Schema.optional(Schema.Literal("low", "medium", "high", "critical")),
}) {}

export class UpdateProjectResponse extends Schema.Class<UpdateProjectResponse>(
  "UpdateProjectResponse"
)({
  project: Schema.typeSchema(Project),
}) {}

/**
 * Projects API Group - defines all project endpoints
 * All endpoints require Authentication middleware
 */
export class ProjectsApi extends HttpApiGroup.make("projects")
  .add(
    HttpApiEndpoint.post("createProject", "/projects")
      .addSuccess(CreateProjectResponse)
      .addError(NotFoundError)
      .addError(ValidationError)
      .addError(ConflictError)
      .setPayload(CreateProjectRequest)
  )
  .add(
    HttpApiEndpoint.get("listProjects", "/projects")
      .addSuccess(ListProjectsResponse)
      .addError(ValidationError)
      .setUrlParams(ListProjectsQueryParams)
  )
  .add(
    HttpApiEndpoint.get("getProject", "/projects/:projectId")
      .addSuccess(GetProjectResponse)
      .addError(NotFoundError)
      .setPath(GetProjectParams)
  )
  .add(
    HttpApiEndpoint.patch("updateProject", "/projects/:projectId")
      .addSuccess(UpdateProjectResponse)
      .addError(NotFoundError)
      .addError(ValidationError)
      .setPath(UpdateProjectParams)
      .setPayload(UpdateProjectRequest)
  )
  .prefix("/api") {}
