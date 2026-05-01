/**
 * Document-related types
 * Shared between frontend and backend
 */

/**
 * Document type representing different planning artifacts
 */
export type DocumentType =
  | 'business-requirements'
  | 'technical-requirements'
  | 'implementation-plan'
  | 'style-anchors'
  | 'architecture-decisions'
  | 'delivery-timeline'
  | 'qa-test-plan'
  | 'executive-summary'
  | 'developer-summary';

/**
 * Document format
 */
export type DocumentFormat = 'yaml' | 'markdown' | 'json';

/**
 * Document entity
 */
export interface Document {
  id: string;
  projectId: string;
  documentType: DocumentType;
  format: DocumentFormat;
  content: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}
