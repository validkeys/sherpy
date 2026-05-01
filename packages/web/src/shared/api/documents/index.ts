/**
 * Documents API
 *
 * Centralized exports for Documents API integration.
 * Provides types, schemas, and hooks for document operations.
 */

// Types
export type {
  Document,
  DocumentFormat,
  DocumentType,
  DocumentListResponse,
  DocumentResponse,
  GenerateDocumentInput,
  ListDocumentsParams,
  GetDocumentParams,
} from './types';

// Schemas
export {
  documentTypeSchema,
  documentFormatSchema,
  generateDocumentInputSchema,
  documentSchema,
  documentListResponseSchema,
  documentResponseSchema,
} from './schemas';

// Hooks (to be added in subsequent tasks)
// export { useGenerateDocument } from './generate-document';
// export { useDocuments } from './get-documents';
// export { useDocument } from './get-document';
