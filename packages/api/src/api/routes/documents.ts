/**
 * Document RPC endpoint handlers
 * Implements document generation and retrieval operations
 */

import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Document, NotFoundError, ValidationError } from "@sherpy/shared";
import { Schema } from "effect";

/**
 * Request/Response schemas for document endpoints
 */

// POST /api/projects/:projectId/documents/generate - Generate document
export class GenerateDocumentParams extends Schema.Class<GenerateDocumentParams>(
  "GenerateDocumentParams",
)({
  projectId: Schema.String,
}) {}

export class GenerateDocumentRequest extends Schema.Class<GenerateDocumentRequest>(
  "GenerateDocumentRequest",
)({
  documentType: Schema.Literal("implementation-plan"),
  format: Schema.Literal("yaml", "markdown", "json"),
}) {}

export class GenerateDocumentResponse extends Schema.Class<GenerateDocumentResponse>(
  "GenerateDocumentResponse",
)({
  document: Schema.typeSchema(Document),
}) {}

// GET /api/projects/:projectId/documents - List documents
export class ListDocumentsParams extends Schema.Class<ListDocumentsParams>("ListDocumentsParams")({
  projectId: Schema.String,
}) {}

export class ListDocumentsResponse extends Schema.Class<ListDocumentsResponse>(
  "ListDocumentsResponse",
)({
  documents: Schema.Array(Schema.typeSchema(Document)),
}) {}

// GET /api/projects/:projectId/documents/:documentType - Get latest document
export class GetDocumentParams extends Schema.Class<GetDocumentParams>("GetDocumentParams")({
  projectId: Schema.String,
  documentType: Schema.Literal("implementation-plan"),
}) {}

export class GetDocumentResponse extends Schema.Class<GetDocumentResponse>("GetDocumentResponse")({
  document: Schema.typeSchema(Document),
}) {}

// GET /api/projects/:projectId/documents/:documentType/versions/:version - Get document version
export class GetDocumentVersionParams extends Schema.Class<GetDocumentVersionParams>(
  "GetDocumentVersionParams",
)({
  projectId: Schema.String,
  documentType: Schema.Literal("implementation-plan"),
  version: Schema.NumberFromString,
}) {}

export class GetDocumentVersionResponse extends Schema.Class<GetDocumentVersionResponse>(
  "GetDocumentVersionResponse",
)({
  document: Schema.typeSchema(Document),
}) {}

/**
 * Documents API Group - defines all document endpoints
 * All endpoints require Authentication middleware
 */
export class DocumentsApi extends HttpApiGroup.make("documents")
  .add(
    HttpApiEndpoint.post("generateDocument", "/projects/:projectId/documents/generate")
      .addSuccess(GenerateDocumentResponse)
      .addError(NotFoundError)
      .addError(ValidationError)
      .setPath(GenerateDocumentParams)
      .setPayload(GenerateDocumentRequest),
  )
  .add(
    HttpApiEndpoint.get("listDocuments", "/projects/:projectId/documents")
      .addSuccess(ListDocumentsResponse)
      .addError(ValidationError)
      .setPath(ListDocumentsParams),
  )
  .add(
    HttpApiEndpoint.get("getDocument", "/projects/:projectId/documents/:documentType")
      .addSuccess(GetDocumentResponse)
      .addError(NotFoundError)
      .addError(ValidationError)
      .setPath(GetDocumentParams),
  )
  .add(
    HttpApiEndpoint.get(
      "getDocumentVersion",
      "/projects/:projectId/documents/:documentType/versions/:version",
    )
      .addSuccess(GetDocumentVersionResponse)
      .addError(NotFoundError)
      .addError(ValidationError)
      .setPath(GetDocumentVersionParams),
  )
  .prefix("/api") {}
