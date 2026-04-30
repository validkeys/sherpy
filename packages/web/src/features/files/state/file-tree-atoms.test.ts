/**
 * Tests for File Tree State Atoms
 */

import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Document } from '../types';
import { DocumentType } from '../types';
import {
  buildFileTree,
  expandedFoldersAtom,
  fileTreeAtom,
  selectedFileAtom,
} from './file-tree-atoms';

const mockDocuments: Document[] = [
  {
    id: 'doc-1',
    projectId: 'project-1',
    documentType: DocumentType.BUSINESS_REQUIREMENTS,
    format: 'yaml',
    content: 'content',
    version: 1,
    createdAt: '2026-04-30T00:00:00Z',
    updatedAt: '2026-04-30T00:00:00Z',
  },
  {
    id: 'doc-2',
    projectId: 'project-1',
    documentType: DocumentType.TECHNICAL_REQUIREMENTS,
    format: 'yaml',
    content: 'content',
    version: 1,
    createdAt: '2026-04-30T00:00:00Z',
    updatedAt: '2026-04-30T00:00:00Z',
  },
  {
    id: 'doc-3',
    projectId: 'project-1',
    documentType: DocumentType.MILESTONES,
    format: 'yaml',
    content: 'content',
    version: 1,
    createdAt: '2026-04-30T00:00:00Z',
    updatedAt: '2026-04-30T00:00:00Z',
  },
  {
    id: 'doc-4',
    projectId: 'project-1',
    documentType: DocumentType.EXECUTIVE_SUMMARY,
    format: 'md',
    content: 'content',
    version: 1,
    createdAt: '2026-04-30T00:00:00Z',
    updatedAt: '2026-04-30T00:00:00Z',
  },
];

describe('buildFileTree', () => {
  it('should return empty array for empty documents', () => {
    const tree = buildFileTree([]);
    expect(tree).toEqual([]);
  });

  it('should group documents into correct folders', () => {
    const tree = buildFileTree(mockDocuments);

    expect(tree).toHaveLength(3);

    const implementationFolder = tree.find((node) => node.name === 'implementation');
    expect(implementationFolder).toBeDefined();
    expect(implementationFolder!.type).toBe('folder');
    expect(implementationFolder!.children).toHaveLength(1);
    expect(implementationFolder!.children![0].name).toBe('milestones.yaml');

    const requirementsFolder = tree.find((node) => node.name === 'requirements');
    expect(requirementsFolder).toBeDefined();
    expect(requirementsFolder!.type).toBe('folder');
    expect(requirementsFolder!.children).toHaveLength(2);

    const summariesFolder = tree.find((node) => node.name === 'summaries');
    expect(summariesFolder).toBeDefined();
    expect(summariesFolder!.type).toBe('folder');
    expect(summariesFolder!.children).toHaveLength(1);
    expect(summariesFolder!.children![0].name).toBe('executive-summary.md');
  });

  it('should sort files alphabetically within folders', () => {
    const tree = buildFileTree(mockDocuments);
    const requirementsFolder = tree.find((node) => node.name === 'requirements');

    expect(requirementsFolder!.children![0].name).toBe('business-requirements.yaml');
    expect(requirementsFolder!.children![1].name).toBe('technical-requirements.yaml');
  });

  it('should sort folders alphabetically', () => {
    const tree = buildFileTree(mockDocuments);

    expect(tree[0].name).toBe('implementation');
    expect(tree[1].name).toBe('requirements');
    expect(tree[2].name).toBe('summaries');
  });

  it('should attach document to file nodes', () => {
    const tree = buildFileTree(mockDocuments);
    const requirementsFolder = tree.find((node) => node.name === 'requirements');
    const businessReqFile = requirementsFolder!.children![0];

    expect(businessReqFile.document).toBeDefined();
    expect(businessReqFile.document!.id).toBe('doc-1');
    expect(businessReqFile.document!.documentType).toBe(DocumentType.BUSINESS_REQUIREMENTS);
  });

  it('should handle all document types correctly', () => {
    const allTypeDocs: Document[] = [
      DocumentType.BUSINESS_REQUIREMENTS,
      DocumentType.TECHNICAL_REQUIREMENTS,
      DocumentType.GAP_ANALYSIS,
      DocumentType.MILESTONES,
      DocumentType.MILESTONE_TASKS,
      DocumentType.STYLE_ANCHORS,
      DocumentType.DELIVERY_TIMELINE,
      DocumentType.ARCHITECTURE_DECISION_RECORDS,
      DocumentType.EXECUTIVE_SUMMARY,
      DocumentType.DEVELOPER_SUMMARY,
      DocumentType.QA_TEST_PLAN,
    ].map((type, index) => ({
      id: `doc-${index}`,
      projectId: 'project-1',
      documentType: type,
      format: 'yaml' as const,
      content: 'content',
      version: 1,
      createdAt: '2026-04-30T00:00:00Z',
      updatedAt: '2026-04-30T00:00:00Z',
    }));

    const tree = buildFileTree(allTypeDocs);

    expect(tree.find((node) => node.name === 'requirements')).toBeDefined();
    expect(tree.find((node) => node.name === 'implementation')).toBeDefined();
    expect(tree.find((node) => node.name === 'delivery')).toBeDefined();
    expect(tree.find((node) => node.name === 'architecture')).toBeDefined();
    expect(tree.find((node) => node.name === 'summaries')).toBeDefined();
  });
});

describe('expandedFoldersAtom', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
  });

  it('should have empty Set as initial state', () => {
    const value = store.get(expandedFoldersAtom);
    expect(value).toBeInstanceOf(Set);
    expect(value.size).toBe(0);
  });

  it('should allow adding folder IDs', () => {
    const expanded = new Set(['folder-1', 'folder-2']);
    store.set(expandedFoldersAtom, expanded);

    const value = store.get(expandedFoldersAtom);
    expect(value.has('folder-1')).toBe(true);
    expect(value.has('folder-2')).toBe(true);
    expect(value.size).toBe(2);
  });

  it('should allow removing folder IDs', () => {
    const expanded = new Set(['folder-1', 'folder-2']);
    store.set(expandedFoldersAtom, expanded);

    const updated = new Set(['folder-1']);
    store.set(expandedFoldersAtom, updated);

    const value = store.get(expandedFoldersAtom);
    expect(value.has('folder-1')).toBe(true);
    expect(value.has('folder-2')).toBe(false);
    expect(value.size).toBe(1);
  });
});

describe('selectedFileAtom', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
  });

  it('should have null as initial state', () => {
    const value = store.get(selectedFileAtom);
    expect(value).toBeNull();
  });

  it('should allow setting selected file ID', () => {
    store.set(selectedFileAtom, 'file-1');

    const value = store.get(selectedFileAtom);
    expect(value).toBe('file-1');
  });

  it('should allow clearing selected file', () => {
    store.set(selectedFileAtom, 'file-1');
    store.set(selectedFileAtom, null);

    const value = store.get(selectedFileAtom);
    expect(value).toBeNull();
  });

  it('should allow changing selected file', () => {
    store.set(selectedFileAtom, 'file-1');
    store.set(selectedFileAtom, 'file-2');

    const value = store.get(selectedFileAtom);
    expect(value).toBe('file-2');
  });
});

describe('fileTreeAtom', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
  });

  it('should have empty array as initial state', () => {
    const value = store.get(fileTreeAtom);
    expect(value).toEqual([]);
  });

  it('should allow setting file tree', () => {
    const tree = buildFileTree(mockDocuments);
    store.set(fileTreeAtom, tree);

    const value = store.get(fileTreeAtom);
    expect(value).toEqual(tree);
    expect(value.length).toBeGreaterThan(0);
  });
});
