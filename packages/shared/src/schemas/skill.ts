/**
 * Skill domain schemas using @effect/sql Model.Class
 * Represents skills and person-skill associations
 */

import { Model } from "@effect/sql";
import { Schema } from "effect";

/**
 * Skill proficiency levels
 */
export const SkillProficiency = Schema.Literal("beginner", "intermediate", "advanced", "expert");

export type SkillProficiency = typeof SkillProficiency.Type;

/**
 * Skill entity - represents a named skill that can be associated with people
 */
export class Skill extends Model.Class<Skill>("Skill")({
  id: Model.Generated(Schema.String),
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)),
  category: Schema.optional(Schema.String.pipe(Schema.maxLength(100))),
}) {}

/**
 * PersonSkill junction entity - associates a person with a skill and proficiency
 * Composite primary key: (personId, skillId)
 */
export class PersonSkill extends Model.Class<PersonSkill>("PersonSkill")({
  personId: Schema.String,
  skillId: Schema.String,
  proficiency: SkillProficiency,
}) {}
