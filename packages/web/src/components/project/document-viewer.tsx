/**
 * DocumentViewer Component
 * Displays document content with syntax highlighting and controls
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Copy, FileText, Check, Hash } from "lucide-react";
import { Highlight, themes } from "prism-react-renderer";
import type { Document } from "@sherpy/shared";
import { cn } from "@/lib/utils";
import { DocumentPdfExport } from "./document-pdf-export";

interface DocumentViewerProps {
  document: Document | null;
  projectName?: string;
}

/**
 * Format document type to human-readable label
 */
function formatDocumentType(type: string): string {
  return type
    .split("-")
    .map((word) => {
      if (word === "qa") return "QA";
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/**
 * Get Prism language identifier from document format
 */
function getLanguage(format: string): string {
  switch (format) {
    case "yaml":
    case "yml":
      return "yaml";
    case "markdown":
    case "md":
      return "markdown";
    case "json":
      return "json";
    case "typescript":
    case "ts":
      return "typescript";
    case "tsx":
      return "tsx";
    default:
      return "text";
  }
}

export function DocumentViewer({ document, projectName = "Project" }: DocumentViewerProps) {
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!document) return;
    try {
      await navigator.clipboard.writeText(document.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (!document) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center space-y-2">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="text-lg font-medium text-muted-foreground">
            Select a document to view
          </p>
          <p className="text-sm text-muted-foreground">
            Choose a document from the list to see its contents
          </p>
        </div>
      </div>
    );
  }

  const language = getLanguage(document.format);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <h2 className="text-lg font-semibold truncate">
            {formatDocumentType(document.documentType)}
          </h2>
          <Badge variant="secondary" className="text-xs">
            v{document.version}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {document.format}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLineNumbers(!showLineNumbers)}
                  aria-label="Toggle line numbers"
                >
                  <Hash className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle line numbers</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  aria-label="Copy to clipboard"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{copied ? "Copied!" : "Copy to clipboard"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DocumentPdfExport document={document} projectName={projectName} />
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {document.content ? (
            <Highlight
              theme={themes.github}
              code={document.content}
              language={language}
            >
              {({ className, style, tokens, getLineProps, getTokenProps }) => (
                <pre
                  className={cn(
                    className,
                    "text-sm font-mono p-4 rounded-lg border bg-muted/50 overflow-x-auto"
                  )}
                  style={style}
                >
                  {tokens.map((line, i) => (
                    <div key={i} {...getLineProps({ line })} className="table-row">
                      {showLineNumbers && (
                        <span className="line-number table-cell pr-4 text-right select-none text-muted-foreground opacity-50">
                          {i + 1}
                        </span>
                      )}
                      <span className="table-cell">
                        {line.map((token, key) => (
                          <span key={key} {...getTokenProps({ token })} />
                        ))}
                      </span>
                    </div>
                  ))}
                </pre>
              )}
            </Highlight>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No content available
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
