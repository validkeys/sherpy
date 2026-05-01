/**
 * Import DocumentType and DocumentFormat from shared package (single source of truth)
 */
import type { DocumentType, DocumentFormat } from '@sherpy/shared';

export type { DocumentType, DocumentFormat };

/**
 * Document entity returned from API
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

/**
 * Node in the file tree structure (folder or file)
 */
export interface FileTreeNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  children?: FileTreeNode[];
  document?: Document;
}
