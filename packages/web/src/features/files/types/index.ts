/**
 * Document types supported by the Sherpy planning workflow
 */
export enum DocumentType {
  BUSINESS_REQUIREMENTS = 'business-requirements',
  TECHNICAL_REQUIREMENTS = 'technical-requirements',
  MILESTONES = 'milestones',
  MILESTONE_TASKS = 'milestone-tasks',
  STYLE_ANCHORS = 'style-anchors',
  DELIVERY_TIMELINE = 'delivery-timeline',
  ARCHITECTURE_DECISION_RECORDS = 'architecture-decision-records',
  EXECUTIVE_SUMMARY = 'executive-summary',
  DEVELOPER_SUMMARY = 'developer-summary',
  QA_TEST_PLAN = 'qa-test-plan',
  GAP_ANALYSIS = 'gap-analysis',
}

/**
 * Document format (file extension)
 */
export type DocumentFormat = 'yaml' | 'md';

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
