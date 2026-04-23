/**
 * Project API request/response schemas using Schema.Class
 */

import { Schema } from "effect";
import { type PipelineStatus, type Priority, Project } from "../project.js";

/**
 * Create Project Request
 */
export class CreateProjectRequest extends Schema.Class<CreateProjectRequest>(
  "CreateProjectRequest",
)({
  slug: Schema.String.pipe(
    Schema.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    Schema.minLength(1),
    Schema.maxLength(100),
  ),
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)),
  description: Schema.optional(Schema.String),
  tags: Schema.optional(Schema.Array(Schema.String)),
  priority: Schema.optional(Schema.Literal("low", "medium", "high", "critical")),
}) {}

/**
 * Create Project Response
 */
export class CreateProjectResponse extends Schema.Class<CreateProjectResponse>(
  "CreateProjectResponse",
)({
  project: Schema.typeSchema(Project),
}) {}

/**
 * List Projects Request
 */
export class ListProjectsRequest extends Schema.Class<ListProjectsRequest>("ListProjectsRequest")({
  tags: Schema.optional(Schema.Array(Schema.String)),
  pipelineStatus: Schema.optional(Schema.Array(Schema.String)),
  limit: Schema.optional(Schema.Number.pipe(Schema.int(), Schema.positive())),
  offset: Schema.optional(Schema.Number.pipe(Schema.int(), Schema.nonNegative())),
}) {}

/**
 * List Projects Response
 */
export class ListProjectsResponse extends Schema.Class<ListProjectsResponse>(
  "ListProjectsResponse",
)({
  projects: Schema.Array(Schema.typeSchema(Project)),
  total: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
}) {}

/**
 * Get Project Request
 */
export class GetProjectRequest extends Schema.Class<GetProjectRequest>("GetProjectRequest")({
  id: Schema.String,
}) {}

/**
 * Get Project Response
 */
export class GetProjectResponse extends Schema.Class<GetProjectResponse>("GetProjectResponse")({
  project: Schema.typeSchema(Project),
}) {}

/**
 * Update Project Request
 */
export class UpdateProjectRequest extends Schema.Class<UpdateProjectRequest>(
  "UpdateProjectRequest",
)({
  id: Schema.String,
  name: Schema.optional(Schema.String.pipe(Schema.minLength(1))),
  description: Schema.optional(Schema.String),
  pipelineStatus: Schema.optional(Schema.String),
  tags: Schema.optional(Schema.Array(Schema.String)),
  priority: Schema.optional(Schema.Literal("low", "medium", "high", "critical")),
}) {}

/**
 * Update Project Response
 */
export class UpdateProjectResponse extends Schema.Class<UpdateProjectResponse>(
  "UpdateProjectResponse",
)({
  project: Schema.typeSchema(Project),
}) {}
