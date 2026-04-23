/**
 * DocumentList Component
 * Displays a sidebar list of project documents with type icons and selection state
 */

import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Document } from "@sherpy/shared";
import { FileText, FileCode, FileJson } from "lucide-react";

interface DocumentListProps {
  documents: Document[];
  selectedDocumentId: string | null;
  onSelectDocument: (documentId: string) => void;
}

/**
 * Format document type to human-readable label
 */
function formatDocumentType(type: string): string {
  return type
    .split("-")
    .map((word) => {
      // Special case for acronyms
      if (word === "qa") return "QA";
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/**
 * Get icon for document format
 */
function getFormatIcon(format: string) {
  switch (format) {
    case "yaml":
    case "yml":
      return <FileCode className="h-4 w-4" />;
    case "json":
      return <FileJson className="h-4 w-4" />;
    case "markdown":
    case "md":
      return <FileText className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
}

/**
 * Format date to relative time
 */
function formatRelativeTime(date: Date | string | number): string {
  const now = new Date();
  const targetDate = new Date(date);
  const diffMs = now.getTime() - targetDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return targetDate.toLocaleDateString();
}

export function DocumentList({
  documents,
  selectedDocumentId,
  onSelectDocument,
}: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No documents available
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        {documents.map((doc) => {
          const isSelected = doc.id === selectedDocumentId;
          return (
            <button
              key={doc.id}
              onClick={() => onSelectDocument(doc.id)}
              data-selected={isSelected}
              className={cn(
                "w-full text-left rounded-lg p-3 transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                isSelected && "bg-accent text-accent-foreground"
              )}
            >
              <div className="flex items-start gap-2">
                <div className="mt-0.5">{getFormatIcon(doc.format)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">
                      {formatDocumentType(doc.documentType)}
                    </span>
                    <Badge variant="secondary" className="text-xs h-5 px-1.5">
                      v{doc.version}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs h-5 px-1.5">
                      {doc.format}
                    </Badge>
                    <span>{formatRelativeTime(String(doc.createdAt))}</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
