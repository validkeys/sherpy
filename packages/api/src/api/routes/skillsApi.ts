/**
 * Skills RPC endpoint handlers
 * Implements CRUD operations for skills and person-skill associations
 */

import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import {
  ConflictError,
  NotFoundError,
  PersonSkill,
  Skill,
  SkillProficiency,
  ValidationError,
} from "@sherpy/shared";
import { Schema } from "effect";

/**
 * Request/Response schemas for skills endpoints
 */

// POST /api/skills - Create skill
export class CreateSkillRequest extends Schema.Class<CreateSkillRequest>("CreateSkillRequest")({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)),
  category: Schema.optional(Schema.String.pipe(Schema.maxLength(100))),
}) {}

export class CreateSkillResponse extends Schema.Class<CreateSkillResponse>("CreateSkillResponse")({
  skill: Schema.typeSchema(Skill),
}) {}

// GET /api/skills - List skills
export class ListSkillsResponse extends Schema.Class<ListSkillsResponse>("ListSkillsResponse")({
  skills: Schema.Array(Schema.typeSchema(Skill)),
}) {}

// GET /api/skills/:skillId - Get skill
export class GetSkillParams extends Schema.Class<GetSkillParams>("GetSkillParams")({
  skillId: Schema.String,
}) {}

export class GetSkillResponse extends Schema.Class<GetSkillResponse>("GetSkillResponse")({
  skill: Schema.typeSchema(Skill),
}) {}

// PUT /api/skills/:skillId - Update skill
export class UpdateSkillParams extends Schema.Class<UpdateSkillParams>("UpdateSkillParams")({
  skillId: Schema.String,
}) {}

export class UpdateSkillRequest extends Schema.Class<UpdateSkillRequest>("UpdateSkillRequest")({
  name: Schema.optional(Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255))),
  category: Schema.optional(Schema.String.pipe(Schema.maxLength(100))),
}) {}

export class UpdateSkillResponse extends Schema.Class<UpdateSkillResponse>("UpdateSkillResponse")({
  skill: Schema.typeSchema(Skill),
}) {}

// DELETE /api/skills/:skillId - Remove skill
export class RemoveSkillParams extends Schema.Class<RemoveSkillParams>("RemoveSkillParams")({
  skillId: Schema.String,
}) {}

export class RemoveSkillResponse extends Schema.Class<RemoveSkillResponse>("RemoveSkillResponse")({
  success: Schema.Boolean,
}) {}

/**
 * Person-Skill association endpoints
 */

// POST /api/people/:personId/skills - Add skill to person
export class AddPersonSkillParams extends Schema.Class<AddPersonSkillParams>(
  "AddPersonSkillParams",
)({
  personId: Schema.String,
}) {}

export class AddPersonSkillRequest extends Schema.Class<AddPersonSkillRequest>(
  "AddPersonSkillRequest",
)({
  skillId: Schema.String,
  proficiency: SkillProficiency,
}) {}

export class AddPersonSkillResponse extends Schema.Class<AddPersonSkillResponse>(
  "AddPersonSkillResponse",
)({
  personSkill: Schema.typeSchema(PersonSkill),
}) {}

// DELETE /api/people/:personId/skills/:skillId - Remove skill from person
export class RemovePersonSkillParams extends Schema.Class<RemovePersonSkillParams>(
  "RemovePersonSkillParams",
)({
  personId: Schema.String,
  skillId: Schema.String,
}) {}

export class RemovePersonSkillResponse extends Schema.Class<RemovePersonSkillResponse>(
  "RemovePersonSkillResponse",
)({
  success: Schema.Boolean,
}) {}

// GET /api/people/:personId/skills - List skills for person
export class ListPersonSkillsParams extends Schema.Class<ListPersonSkillsParams>(
  "ListPersonSkillsParams",
)({
  personId: Schema.String,
}) {}

export class ListPersonSkillsResponse extends Schema.Class<ListPersonSkillsResponse>(
  "ListPersonSkillsResponse",
)({
  skills: Schema.Array(Schema.typeSchema(PersonSkill)),
}) {}

/**
 * Skills API Group - defines all skill endpoints
 */
export class SkillsApi extends HttpApiGroup.make("skills")
  // Skill CRUD
  .add(
    HttpApiEndpoint.post("createSkill", "/skills")
      .addSuccess(CreateSkillResponse)
      .addError(ValidationError)
      .addError(ConflictError)
      .setPayload(CreateSkillRequest),
  )
  .add(
    HttpApiEndpoint.get("listSkills", "/skills")
      .addSuccess(ListSkillsResponse)
      .addError(ValidationError),
  )
  .add(
    HttpApiEndpoint.get("getSkill", "/skills/:skillId")
      .addSuccess(GetSkillResponse)
      .addError(NotFoundError)
      .addError(ValidationError)
      .setPath(GetSkillParams),
  )
  .add(
    HttpApiEndpoint.put("updateSkill", "/skills/:skillId")
      .addSuccess(UpdateSkillResponse)
      .addError(NotFoundError)
      .addError(ValidationError)
      .addError(ConflictError)
      .setPath(UpdateSkillParams)
      .setPayload(UpdateSkillRequest),
  )
  .add(
    HttpApiEndpoint.del("removeSkill", "/skills/:skillId")
      .addSuccess(RemoveSkillResponse)
      .addError(NotFoundError)
      .addError(ValidationError)
      .setPath(RemoveSkillParams),
  )
  // Person-Skill associations
  .add(
    HttpApiEndpoint.post("addPersonSkill", "/people/:personId/skills")
      .addSuccess(AddPersonSkillResponse)
      .addError(NotFoundError)
      .addError(ValidationError)
      .addError(ConflictError)
      .setPath(AddPersonSkillParams)
      .setPayload(AddPersonSkillRequest),
  )
  .add(
    HttpApiEndpoint.del("removePersonSkill", "/people/:personId/skills/:skillId")
      .addSuccess(RemovePersonSkillResponse)
      .addError(NotFoundError)
      .addError(ValidationError)
      .setPath(RemovePersonSkillParams),
  )
  .add(
    HttpApiEndpoint.get("listPersonSkills", "/people/:personId/skills")
      .addSuccess(ListPersonSkillsResponse)
      .addError(NotFoundError)
      .addError(ValidationError)
      .setPath(ListPersonSkillsParams),
  )
  .prefix("/api") {}
