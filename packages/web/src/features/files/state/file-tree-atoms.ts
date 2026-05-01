/**
 * File Tree State Atoms
 *
 * Jotai atoms for managing file tree UI state including:
 * - Expanded folders (which folders are open/closed)
 * - Selected file (which file is currently selected for preview)
 * - File tree structure (derived from documents)
 */

import { atom } from 'jotai';
import type { Document, FileTreeNode } from '../types';

/**
 * Atom: Set of folder IDs that are currently expanded
 */
export const expandedFoldersAtom = atom<Set<string>>(new Set());

/**
 * Atom: ID of the currently selected file (null if none selected)
 */
export const selectedFileAtom = atom<string | null>(null);

/**
 * Folder mapping: Maps document types to their folder paths
 * Uses string keys to match backend DocumentType schema values
 */
const DOCUMENT_FOLDER_MAP: Record<string, string> = {
  // Requirements
  'business-requirements': 'requirements',
  'technical-requirements': 'requirements',

  // Implementation
  'implementation-plan': 'implementation',

  // Delivery
  'delivery-timeline': 'delivery',
  'qa-test-plan': 'delivery',

  // Architecture
  'architecture-decision-record': 'architecture',

  // Summaries
  'executive-summary': 'summaries',
  'developer-summary': 'summaries',
};

/**
 * Builds file tree structure from flat document list
 * Organizes documents into folders based on their type
 * Unknown document types are placed in an 'other' folder
 */
export function buildFileTree(documents: Document[]): FileTreeNode[] {
  const folderMap = new Map<string, FileTreeNode>();

  documents.forEach((doc) => {
    // Use fallback 'other' folder for unknown document types
    const folderName = DOCUMENT_FOLDER_MAP[doc.documentType] ?? 'other';

    if (!folderMap.has(folderName)) {
      folderMap.set(folderName, {
        id: folderName,
        name: folderName,
        type: 'folder',
        children: [],
      });
    }

    const folder = folderMap.get(folderName)!;
    const fileName = `${doc.documentType}.${doc.format}`;

    folder.children!.push({
      id: doc.id,
      name: fileName,
      type: 'file',
      document: doc,
    });
  });

  const tree = Array.from(folderMap.values());

  tree.forEach((folder) => {
    folder.children!.sort((a, b) => a.name.localeCompare(b.name));
  });

  tree.sort((a, b) => a.name.localeCompare(b.name));

  return tree;
}

/**
 * Derived atom: File tree structure built from documents
 * This would typically be connected to document state via another atom
 * For now, it's a placeholder that can be composed with document data
 */
export const fileTreeAtom = atom<FileTreeNode[]>([]);
