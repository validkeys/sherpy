/**
 * Person API request/response schemas using Schema.Class
 */

import { Schema } from "effect"
import { Person } from "../person.js"
import { Assignment } from "../assignment.js"

/**
 * Create Person Request
 */
export class CreatePersonRequest extends Schema.Class<CreatePersonRequest>(
  "CreatePersonRequest",
)({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)),
  email: Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
  oktaUserId: Schema.optional(Schema.String),
  capacityHoursPerWeek: Schema.Number.pipe(
    Schema.positive(),
    Schema.lessThanOrEqualTo(168),
  ),
}) {}

/**
 * Create Person Response
 */
export class CreatePersonResponse extends Schema.Class<CreatePersonResponse>(
  "CreatePersonResponse",
)({
  person: Schema.typeSchema(Person),
}) {}

/**
 * List People Request
 */
export class ListPeopleRequest extends Schema.Class<ListPeopleRequest>(
  "ListPeopleRequest",
)({
  limit: Schema.optional(Schema.Number.pipe(Schema.int(), Schema.positive())),
  offset: Schema.optional(
    Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  ),
}) {}

/**
 * List People Response
 */
export class ListPeopleResponse extends Schema.Class<ListPeopleResponse>(
  "ListPeopleResponse",
)({
  people: Schema.Array(Schema.typeSchema(Person)),
  total: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
}) {}

/**
 * Update Person Request
 */
export class UpdatePersonRequest extends Schema.Class<UpdatePersonRequest>(
  "UpdatePersonRequest",
)({
  id: Schema.String,
  name: Schema.optional(Schema.String.pipe(Schema.minLength(1))),
  email: Schema.optional(Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))),
  capacityHoursPerWeek: Schema.optional(
    Schema.Number.pipe(Schema.positive(), Schema.lessThanOrEqualTo(168)),
  ),
}) {}

/**
 * Update Person Response
 */
export class UpdatePersonResponse extends Schema.Class<UpdatePersonResponse>(
  "UpdatePersonResponse",
)({
  person: Schema.typeSchema(Person),
}) {}

/**
 * Assign Person to Task Request
 */
export class AssignPersonRequest extends Schema.Class<AssignPersonRequest>(
  "AssignPersonRequest",
)({
  taskId: Schema.String,
  personId: Schema.String,
  allocationPercentage: Schema.Number.pipe(
    Schema.int(),
    Schema.greaterThanOrEqualTo(0),
    Schema.lessThanOrEqualTo(100),
  ),
  startDate: Schema.optional(Schema.String),
  endDate: Schema.optional(Schema.String),
}) {}

/**
 * Assign Person Response
 */
export class AssignPersonResponse extends Schema.Class<AssignPersonResponse>(
  "AssignPersonResponse",
)({
  assignment: Schema.typeSchema(Assignment),
}) {}

/**
 * Unassign Person from Task Request
 */
export class UnassignPersonRequest extends Schema.Class<UnassignPersonRequest>(
  "UnassignPersonRequest",
)({
  assignmentId: Schema.String,
}) {}

/**
 * Unassign Person Response
 */
export class UnassignPersonResponse extends Schema.Class<
  UnassignPersonResponse
>("UnassignPersonResponse")({
  success: Schema.Boolean,
}) {}
