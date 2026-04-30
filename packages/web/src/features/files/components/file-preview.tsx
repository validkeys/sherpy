/**
 * FilePreview Component
 *
 * Preview pane component that displays selected file content with syntax highlighting
 * for YAML and formatted rendering for Markdown. Read-only view.
 */

import { useAtom } from 'jotai';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { selectedFileAtom } from '../state/file-tree-atoms';
import { useDocuments } from '../api/get-documents';
import { FileText } from 'lucide-react';

export interface FilePreviewProps {
  projectId: string;
}

export function FilePreview({ projectId }: FilePreviewProps) {
  const [selectedFile] = useAtom(selectedFileAtom);

  // Fetch all documents to find the selected one
  const { data: documents, isLoading, error } = useDocuments({ projectId });

  const document = documents?.find((doc) => doc.id === selectedFile);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="space-y-3">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="h-4 bg-muted animate-pulse rounded"
              style={{ width: `${Math.random() * 40 + 60}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-sm text-destructive">Failed to load documents. Please try again.</div>
      </div>
    );
  }

  if (!selectedFile) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <FileText className="h-16 w-16 mb-4 opacity-20" />
        <p className="text-sm">Select a file to preview</p>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="p-6">
        <div className="text-sm text-muted-foreground">Document not found.</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-auto">
      <div className="p-6">
        {/* File header */}
        <div className="mb-4 pb-4 border-b">
          <h2 className="text-lg font-semibold capitalize">
            {document.documentType.replace(/-/g, ' ')}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Last updated: {new Date(document.updatedAt).toLocaleString()}
          </p>
        </div>

        {/* Content rendering based on format */}
        {document.format === 'yaml' ? (
          <SyntaxHighlighter
            language="yaml"
            style={oneDark}
            customStyle={{
              margin: 0,
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
            }}
            showLineNumbers
          >
            {document.content}
          </SyntaxHighlighter>
        ) : (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{document.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
