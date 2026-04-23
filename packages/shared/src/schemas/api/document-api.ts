/**
 * Document API request/response schemas using Schema.Class
 */

import { Schema } from "effect";
import { Document } from "../document.js";

/**
 * Get Documents Request
 */
export class GetDocumentsRequest extends Schema.Class<GetDocumentsRequest>("GetDocumentsRequest")({
  projectId: Schema.String,
  documentType: Schema.optional(Schema.String),
}) {}

/**
 * Get Documents Response
 */
export class GetDocumentsResponse extends Schema.Class<GetDocumentsResponse>(
  "GetDocumentsResponse",
)({
  documents: Schema.Array(Schema.typeSchema(Document)),
}) {}

/**
 * Get Document Request
 */
export class GetDocumentRequest extends Schema.Class<GetDocumentRequest>("GetDocumentRequest")({
  projectId: Schema.String,
  documentType: Schema.String,
  version: Schema.optional(Schema.Number.pipe(Schema.int(), Schema.positive())),
}) {}

/**
 * Get Document Response
 */
export class GetDocumentResponse extends Schema.Class<GetDocumentResponse>("GetDocumentResponse")({
  document: Schema.typeSchema(Document),
}) {}

/**
 * Export Document Request
 */
export class ExportDocumentRequest extends Schema.Class<ExportDocumentRequest>(
  "ExportDocumentRequest",
)({
  documentId: Schema.String,
  format: Schema.Literal("pdf", "markdown", "yaml", "json"),
}) {}

/**
 * Export Document Response
 */
export class ExportDocumentResponse extends Schema.Class<ExportDocumentResponse>(
  "ExportDocumentResponse",
)({
  downloadUrl: Schema.String,
  expiresAt: Schema.String,
}) {}
