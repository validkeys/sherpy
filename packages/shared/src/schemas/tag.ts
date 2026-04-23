/**
 * Tag domain schema using @effect/sql Model.Class
 * Represents tags for categorizing projects
 */

import { Model } from "@effect/sql";
import { Schema } from "effect";

/**
 * Tag entity - represents a tag for project categorization
 * UNIQUE constraint on name
 */
export class Tag extends Model.Class<Tag>("Tag")({
  id: Model.Generated(Schema.String),
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
  color: Schema.optional(Schema.NullOr(Schema.String.pipe(Schema.pattern(/^#[0-9a-fA-F]{6}$/)))),
}) {}
