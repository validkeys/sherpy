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

// Hooks
export { useGenerateDocument, generateDocument } from './generate-document';
export { useDocuments, getDocuments, getDocumentsQueryOptions } from './get-documents';
export { useDocument, getDocument, getDocumentQueryOptions } from './get-document';
