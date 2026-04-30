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
import { DocumentType } from '../types';

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
 */
const DOCUMENT_FOLDER_MAP: Record<DocumentType, string> = {
  [DocumentType.BUSINESS_REQUIREMENTS]: 'requirements',
  [DocumentType.TECHNICAL_REQUIREMENTS]: 'requirements',
  [DocumentType.GAP_ANALYSIS]: 'requirements',
  [DocumentType.MILESTONES]: 'implementation',
  [DocumentType.MILESTONE_TASKS]: 'implementation',
  [DocumentType.STYLE_ANCHORS]: 'implementation',
  [DocumentType.DELIVERY_TIMELINE]: 'delivery',
  [DocumentType.ARCHITECTURE_DECISION_RECORDS]: 'architecture',
  [DocumentType.EXECUTIVE_SUMMARY]: 'summaries',
  [DocumentType.DEVELOPER_SUMMARY]: 'summaries',
  [DocumentType.QA_TEST_PLAN]: 'delivery',
};

/**
 * Builds file tree structure from flat document list
 * Organizes documents into folders based on their type
 */
export function buildFileTree(documents: Document[]): FileTreeNode[] {
  const folderMap = new Map<string, FileTreeNode>();

  documents.forEach((doc) => {
    const folderName = DOCUMENT_FOLDER_MAP[doc.documentType];

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
