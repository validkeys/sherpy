/**
 * DocumentPdfExport Component
 * Provides PDF export functionality for documents using browser print API
 */

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Document } from "@sherpy/shared";
import { Download } from "lucide-react";

interface DocumentPdfExportProps {
  document: Document | null;
  projectName: string;
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
 * Generate filename for PDF export
 */
function generateFilename(projectName: string, documentType: string): string {
  const sanitizedProject = projectName.replace(/[^a-z0-9]/gi, "-").toLowerCase();
  const sanitizedDoc = documentType.replace(/[^a-z0-9]/gi, "-").toLowerCase();
  return `${sanitizedProject}-${sanitizedDoc}.pdf`;
}

export function DocumentPdfExport({ document, projectName }: DocumentPdfExportProps) {
  const handleExport = () => {
    if (!document) return;

    try {
      // Create print-friendly content
      const printWindow = window.open("", "_blank");

      if (!printWindow) {
        console.error("Failed to open print window");
        return;
      }

      const documentTitle = formatDocumentType(document.documentType);
      const filename = generateFilename(projectName, document.documentType);

      // Create HTML for print
      const printContent = `
<!DOCTYPE html>
<html>
<head>
  <title>${filename}</title>
  <style>
    @page {
      margin: 1in;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #000;
      margin: 0;
      padding: 0;
    }
    .header {
      margin-bottom: 2em;
      padding-bottom: 1em;
      border-bottom: 2px solid #000;
    }
    .header h1 {
      margin: 0 0 0.5em 0;
      font-size: 18pt;
    }
    .header .meta {
      font-size: 10pt;
      color: #666;
    }
    .content {
      white-space: pre-wrap;
      font-family: "Courier New", monospace;
      font-size: 10pt;
      line-height: 1.4;
      overflow-wrap: break-word;
      word-wrap: break-word;
    }
    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${projectName} - ${documentTitle}</h1>
    <div class="meta">
      Format: ${document.format} | Version: ${document.version}
    </div>
  </div>
  <div class="content">${escapeHtml(document.content)}</div>
</body>
</html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();

      // Wait for content to load, then print
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      };
    } catch (err) {
      console.error("Failed to export PDF:", err);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={!document}
            aria-label="Export PDF"
          >
            <Download className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Export as PDF</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Escape HTML special characters for safe rendering
 */
function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
