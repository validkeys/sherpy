/**
 * Pipeline Status Badge - Colored badges for project pipeline stages
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type PipelineStatus =
  | "intake"
  | "gap-analysis"
  | "business-requirements"
  | "technical-requirements"
  | "style-anchors"
  | "implementation-planning"
  | "plan-review"
  | "architecture-decisions"
  | "delivery-timeline"
  | "qa-test-plan"
  | "summaries"
  | "active-development"
  | "completed"
  | "archived";

interface PipelineStatusBadgeProps {
  status: string;
  size?: "sm" | "md" | "lg";
}

const statusConfig: Record<string, { label: string; className: string }> = {
  intake: { label: "Intake", className: "bg-slate-500 text-white" },
  "gap-analysis": { label: "Gap Analysis", className: "bg-amber-500 text-white" },
  "business-requirements": { label: "Business Req", className: "bg-blue-500 text-white" },
  "technical-requirements": { label: "Technical Req", className: "bg-blue-600 text-white" },
  "style-anchors": { label: "Style Anchors", className: "bg-purple-500 text-white" },
  "implementation-planning": { label: "Planning", className: "bg-purple-600 text-white" },
  "plan-review": { label: "Review", className: "bg-purple-700 text-white" },
  "architecture-decisions": { label: "Architecture", className: "bg-indigo-500 text-white" },
  "delivery-timeline": { label: "Timeline", className: "bg-indigo-600 text-white" },
  "qa-test-plan": { label: "QA Plan", className: "bg-teal-500 text-white" },
  summaries: { label: "Summaries", className: "bg-teal-600 text-white" },
  "active-development": { label: "Active", className: "bg-green-500 text-white" },
  completed: { label: "Complete", className: "bg-emerald-600 text-white" },
  archived: { label: "Archived", className: "bg-gray-400 text-white" },
};

export function PipelineStatusBadge({ status, size = "md" }: PipelineStatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    className: "bg-gray-500 text-white",
  };

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-xs px-2 py-1",
    lg: "text-sm px-3 py-1.5",
  };

  return (
    <Badge className={cn(config.className, sizeClasses[size], "transition-all hover:scale-105")}>
      {config.label}
    </Badge>
  );
}
