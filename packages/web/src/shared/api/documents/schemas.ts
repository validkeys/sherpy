/**
 * Documents API Zod Schemas
 *
 * Runtime validation schemas for Documents API requests and responses.
 * Ensures type safety at runtime for all document-related operations.
 */

import { z } from 'zod';
import type { DocumentFormat, DocumentType } from './types';

/**
 * Document type enum schema
 * Must match backend DocumentType literal values
 */
export const documentTypeSchema = z.enum([
  'business-requirements',
  'technical-requirements',
  'implementation-plan',
  'qa-test-plan',
  'delivery-timeline',
  'executive-summary',
  'developer-summary',
  'architecture-decision-record',
]) satisfies z.ZodType<DocumentType>;

/**
 * Document format enum schema
 */
export const documentFormatSchema = z.enum([
  'yaml',
  'markdown',
  'json',
]) satisfies z.ZodType<DocumentFormat>;

/**
 * Schema for generating a new document
 * POST /api/projects/:projectId/documents/generate
 */
export const generateDocumentInputSchema = z.object({
  documentType: documentTypeSchema,
  format: documentFormatSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Inferred TypeScript types from Zod schemas
 */
export type GenerateDocumentInput = z.infer<typeof generateDocumentInputSchema>;

/**
 * Schema for document response validation
 */
export const documentSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  documentType: documentTypeSchema,
  format: documentFormatSchema,
  content: z.string(),
  version: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Schema for document list response validation
 */
export const documentListResponseSchema = z.object({
  documents: z.array(documentSchema),
});

/**
 * Schema for single document response validation
 */
export const documentResponseSchema = z.object({
  document: documentSchema,
});
