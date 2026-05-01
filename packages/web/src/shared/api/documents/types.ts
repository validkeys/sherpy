/**
 * Documents API Types
 *
 * Type definitions for Documents API integration.
 * Imports base types from @sherpy/shared for single source of truth.
 */

import type { Document, DocumentFormat, DocumentType } from '@sherpy/shared';

/**
 * Re-export types from shared package
 */
export type { Document, DocumentFormat, DocumentType };

/**
 * Response type for list documents endpoint
 * GET /api/projects/:projectId/documents
 */
export interface DocumentListResponse {
  documents: Document[];
}

/**
 * Response type for get single document endpoint
 * GET /api/projects/:projectId/documents/:documentType
 */
export interface DocumentResponse {
  document: Document;
}

/**
 * Input for generating a new document
 * POST /api/projects/:projectId/documents/generate
 */
export interface GenerateDocumentInput {
  documentType: DocumentType;
  format?: DocumentFormat;
  metadata?: Record<string, unknown>;
}

/**
 * Query parameters for listing documents
 */
export interface ListDocumentsParams {
  projectId: string;
  documentType?: DocumentType;
}

/**
 * Query parameters for getting a specific document
 */
export interface GetDocumentParams {
  projectId: string;
  documentType: DocumentType;
  version?: number;
}
