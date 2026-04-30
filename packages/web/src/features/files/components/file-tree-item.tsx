/**
 * FileTreeItem Component
 *
 * Clickable file item component for the file tree. Displays file name and icon with
 * visual feedback for selected state. Uses jotai for selection state tracking.
 */

import { useAtom } from 'jotai';
import { FileCode, FileText } from 'lucide-react';
import type { FileTreeNode } from '../types';
import { selectedFileAtom } from '../state/file-tree-atoms';

export interface FileTreeItemProps {
  file: FileTreeNode;
  depth: number;
}

export function FileTreeItem({ file, depth }: FileTreeItemProps) {
  const [selectedFile, setSelectedFile] = useAtom(selectedFileAtom);
  const isSelected = selectedFile === file.id;

  const handleClick = () => {
    setSelectedFile(file.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  // Determine icon based on file format
  const FileIcon = file.document?.format === 'md' ? FileCode : FileText;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded transition-colors ${
        isSelected ? 'bg-accent border-l-2 border-primary' : 'hover:bg-accent/50'
      }`}
      style={{ paddingLeft: depth > 0 ? `${depth * 1 + 0.5}rem` : undefined }}
    >
      <FileIcon className="h-4 w-4 text-muted-foreground" />
      <span className={`text-sm ${isSelected ? 'font-medium' : ''}`}>{file.name}</span>
    </div>
  );
}
