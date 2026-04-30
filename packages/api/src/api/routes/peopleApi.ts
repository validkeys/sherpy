/**
 * People RPC endpoint handlers
 * Implements CRUD operations for people (team members) with schema validation
 */

import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { NotFoundError, Person, ValidationError } from "@sherpy/shared";
import { Schema } from "effect";

/**
 * Request/Response schemas for people endpoints
 */

// POST /api/people - Create person
export class CreatePersonRequest extends Schema.Class<CreatePersonRequest>("CreatePersonRequest")({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)),
  email: Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
  oktaUserId: Schema.optional(Schema.String),
  capacityHoursPerWeek: Schema.Number.pipe(
    Schema.positive(),
    Schema.finite(),
    Schema.lessThanOrEqualTo(168),
  ),
}) {}

export class CreatePersonResponse extends Schema.Class<CreatePersonResponse>(
  "CreatePersonResponse",
)({
  person: Person,
}) {}

// GET /api/people - List people
export class ListPeopleResponse extends Schema.Class<ListPeopleResponse>("ListPeopleResponse")({
  people: Schema.Array(Person),
}) {}

// GET /api/people/:personId - Get person
export class GetPersonParams extends Schema.Class<GetPersonParams>("GetPersonParams")({
  personId: Schema.String,
}) {}

export class GetPersonResponse extends Schema.Class<GetPersonResponse>("GetPersonResponse")({
  person: Person,
}) {}

// PUT /api/people/:personId - Update person
export class UpdatePersonParams extends Schema.Class<UpdatePersonParams>("UpdatePersonParams")({
  personId: Schema.String,
}) {}

export class UpdatePersonRequest extends Schema.Class<UpdatePersonRequest>("UpdatePersonRequest")({
  name: Schema.optional(Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255))),
  email: Schema.optional(Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))),
  oktaUserId: Schema.optional(Schema.String),
  capacityHoursPerWeek: Schema.optional(
    Schema.Number.pipe(Schema.positive(), Schema.finite(), Schema.lessThanOrEqualTo(168)),
  ),
}) {}

export class UpdatePersonResponse extends Schema.Class<UpdatePersonResponse>(
  "UpdatePersonResponse",
)({
  person: Person,
}) {}

/**
 * People API Group - defines all people endpoints
 */
export class PeopleApi extends HttpApiGroup.make("people")
  .add(
    HttpApiEndpoint.post("createPerson", "/people")
      .addSuccess(CreatePersonResponse)
      .addError(NotFoundError)
      .addError(ValidationError)
      .setPayload(CreatePersonRequest),
  )
  .add(
    HttpApiEndpoint.get("listPeople", "/people")
      .addSuccess(ListPeopleResponse)
      .addError(ValidationError),
  )
  .add(
    HttpApiEndpoint.get("getPerson", "/people/:personId")
      .addSuccess(GetPersonResponse)
      .addError(NotFoundError)
      .setPath(GetPersonParams),
  )
  .add(
    HttpApiEndpoint.put("updatePerson", "/people/:personId")
      .addSuccess(UpdatePersonResponse)
      .addError(NotFoundError)
      .addError(ValidationError)
      .setPath(UpdatePersonParams)
      .setPayload(UpdatePersonRequest),
  )
  .prefix("/api") {}
