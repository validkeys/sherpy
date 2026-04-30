/**
 * Files feature public API
 *
 * This module provides file tree viewing and document preview functionality.
 */

// Types
export * from './types';

// API hooks
export { getDocuments, getDocumentsQueryOptions, useDocuments } from './api/get-documents';
export { getDocument, getDocumentQueryOptions, useDocument } from './api/get-document';

// State atoms
export {
  buildFileTree,
  expandedFoldersAtom,
  fileTreeAtom,
  selectedFileAtom,
} from './state/file-tree-atoms';

// Components
export { FilesContainer } from './components/files-container';
export { FileTree } from './components/file-tree';
export { FileTreeFolder } from './components/file-tree-folder';
export { FileTreeItem } from './components/file-tree-item';
export { FilePreview } from './components/file-preview';
export { FilesErrorBoundary } from './components/files-error-boundary';
