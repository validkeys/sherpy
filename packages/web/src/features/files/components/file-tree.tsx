/**
 * FileTree Component
 *
 * Main tree view component that fetches documents, builds tree structure,
 * and recursively renders folders and files. Entry point for files tab content.
 */

import { useMemo } from 'react';
import { useDocuments } from '../api/get-documents';
import { buildFileTree } from '../state/file-tree-atoms';
import { FileTreeFolder } from './file-tree-folder';
import { FileTreeItem } from './file-tree-item';
import type { FileTreeNode } from '../types';

export interface FileTreeProps {
  projectId: string;
}

export function FileTree({ projectId }: FileTreeProps) {
  const { data: documents, isLoading, error } = useDocuments({ projectId });

  const tree = useMemo(() => {
    return documents ? buildFileTree(documents) : [];
  }, [documents]);

  const renderNode = (node: FileTreeNode, depth: number): React.ReactNode => {
    if (node.type === 'folder') {
      return <FileTreeFolder key={node.id} folder={node} depth={depth} renderNode={renderNode} />;
    }

    return <FileTreeItem key={node.id} file={node} depth={depth} />;
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-sm text-destructive">Failed to load documents. Please try again.</div>
      </div>
    );
  }

  if (tree.length === 0) {
    return (
      <div className="p-4">
        <div className="text-sm text-muted-foreground">No documents available yet.</div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-auto">
      <div className="p-2">{tree.map((node) => renderNode(node, 0))}</div>
    </div>
  );
}
