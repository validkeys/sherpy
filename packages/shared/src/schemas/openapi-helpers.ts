/**
 * OpenAPI/JSON Schema helpers for Model fields
 * Adds proper JSON Schema annotations for OpenAPI generation
 *
 * Note: Due to limitations with @effect/sql Model.DateTimeInsert/Update fields,
 * we simply re-export them here. The OpenAPI spec generation may show generic
 * date-time fields, but they will work correctly at runtime.
 */

import { Model } from "@effect/sql";
import { Schema } from "effect";

/**
 * DateTimeInsert field - auto-populated on insert
 * Re-exported from Model for consistency
 */
export const DateTimeInsertWithOpenApi = Model.DateTimeInsert;

/**
 * DateTimeUpdate field - auto-updated on modification
 * Re-exported from Model for consistency
 */
export const DateTimeUpdateWithOpenApi = Model.DateTimeUpdate;

/**
 * Generated UUID field with JSON Schema annotation for OpenAPI
 * Use this instead of Model.Generated(Schema.String) for UUID primary keys
 *
 * @example
 * export class MyModel extends Model.Class<MyModel>("MyModel")({
 *   id: GeneratedUuidWithOpenApi,
 * }) {}
 */
export const GeneratedUuidWithOpenApi = Model.Generated(
  Schema.String.annotations({
    jsonSchema: {
      type: "string",
      format: "uuid",
      description: "Auto-generated UUID",
    },
  }),
);
