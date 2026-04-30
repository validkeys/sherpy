/**
 * FileTreeFolder Component
 *
 * Expandable folder component for the file tree. Displays folder name with expand/collapse
 * icon and recursively renders children when expanded. Uses jotai for expanded state tracking.
 */

import { useAtom } from 'jotai';
import { ChevronRight, Folder, FolderOpen } from 'lucide-react';
import type { FileTreeNode } from '../types';
import { expandedFoldersAtom } from '../state/file-tree-atoms';

export interface FileTreeFolderProps {
  folder: FileTreeNode;
  depth: number;
  renderNode: (node: FileTreeNode, depth: number) => React.ReactNode;
}

export function FileTreeFolder({ folder, depth, renderNode }: FileTreeFolderProps) {
  const [expandedFolders, setExpandedFolders] = useAtom(expandedFoldersAtom);
  const isExpanded = expandedFolders.has(folder.id);

  const toggleFolder = () => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folder.id)) {
        next.delete(folder.id);
      } else {
        next.add(folder.id);
      }
      return next;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleFolder();
    }
  };

  const FolderIcon = isExpanded ? FolderOpen : Folder;

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={toggleFolder}
        onKeyDown={handleKeyDown}
        className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded hover:bg-accent transition-colors ${depth > 0 ? `pl-${depth * 4 + 2}` : ''}`}
        style={{ paddingLeft: depth > 0 ? `${depth * 1 + 0.5}rem` : undefined }}
      >
        <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        <FolderIcon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium capitalize">{folder.name}</span>
      </div>

      {isExpanded && folder.children && (
        <div>
          {folder.children.map((child) => (
            <div key={child.id}>{renderNode(child, depth + 1)}</div>
          ))}
        </div>
      )}
    </div>
  );
}
