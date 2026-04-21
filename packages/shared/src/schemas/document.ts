/**
 * Document domain schema using @effect/sql Model.Class
 * Represents generated documents stored in the database
 */

import { Model } from "@effect/sql"
import { Schema } from "effect"

/**
 * Document format enum
 */
export const DocumentFormat = Schema.Literal("yaml", "markdown", "json")

export type DocumentFormat = typeof DocumentFormat.Type

/**
 * Document type identifier
 */
export const DocumentType = Schema.Literal(
  "business-requirements",
  "technical-requirements",
  "implementation-plan",
  "qa-test-plan",
  "delivery-timeline",
  "executive-summary",
  "developer-summary",
  "architecture-decision-record",
)

export type DocumentType = typeof DocumentType.Type

/**
 * Document entity - stores generated planning artifacts
 * UNIQUE constraint on (projectId, documentType, version)
 */
export class Document extends Model.Class<Document>("Document")({
  id: Model.Generated(Schema.String),
  projectId: Schema.String,
  documentType: DocumentType,
  format: DocumentFormat,
  content: Schema.String, // Raw text content (YAML, markdown, or JSON)
  version: Schema.Number.pipe(Schema.int(), Schema.positive()),
  createdAt: Model.DateTimeInsert,
  updatedAt: Model.DateTimeUpdate,
}) {}
