/**
 * Availability domain schema using @effect/sql Model.Class
 * Represents time windows when a person is unavailable for work
 */

import { Model } from "@effect/sql";
import { Schema } from "effect";
import { DateTimeInsertWithOpenApi, GeneratedUuidWithOpenApi } from "./openapi-helpers.js";

/**
 * Availability window type enum
 */
export const AvailabilityType = Schema.Literal("pto", "other-project", "training", "unavailable");

export type AvailabilityType = typeof AvailabilityType.Type;

/**
 * AvailabilityWindow entity - tracks when people are unavailable
 */
export class AvailabilityWindow extends Model.Class<AvailabilityWindow>("AvailabilityWindow")({
  id: GeneratedUuidWithOpenApi,
  personId: Schema.String,
  startDate: Schema.String, // ISO 8601 date
  endDate: Schema.String, // ISO 8601 date
  type: AvailabilityType,
  description: Schema.optional(Schema.String),
  createdAt: DateTimeInsertWithOpenApi,
}) {}
