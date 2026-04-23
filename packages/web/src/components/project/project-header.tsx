/**
 * Project Header Component
 * Displays project name, description, status, and breadcrumb navigation
 */

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { PipelineStatus } from "@sherpy/shared";
import { ChevronRight, Home } from "lucide-react";
import { Link } from "react-router-dom";

interface ProjectHeaderProps {
  name: string;
  description?: string;
  pipelineStatus: PipelineStatus;
  createdAt: string | Date;
}

/**
 * Maps pipeline status to badge variant colors
 */
function getPipelineStatusVariant(status: PipelineStatus): string {
  const variantMap: Record<PipelineStatus, string> = {
    intake: "secondary",
    "gap-analysis": "default",
    "business-requirements": "default",
    "technical-requirements": "default",
    "style-anchors": "default",
    "implementation-planning": "default",
    "plan-review": "default",
    "architecture-decisions": "default",
    "delivery-timeline": "default",
    "qa-test-plan": "default",
    summaries: "default",
    "active-development": "default",
    completed: "default",
    archived: "secondary",
  };

  return variantMap[status] || "default";
}

/**
 * Formats pipeline status for display
 */
function formatPipelineStatus(status: PipelineStatus): string {
  const statusMap: Record<PipelineStatus, string> = {
    intake: "Intake",
    "gap-analysis": "Gap Analysis",
    "business-requirements": "Business Requirements",
    "technical-requirements": "Technical Requirements",
    "style-anchors": "Style Anchors",
    "implementation-planning": "Implementation Planning",
    "plan-review": "Plan Review",
    "architecture-decisions": "Architecture Decisions",
    "delivery-timeline": "Delivery Timeline",
    "qa-test-plan": "QA Test Plan",
    summaries: "Summaries",
    "active-development": "Active Development",
    completed: "Completed",
    archived: "Archived",
  };

  return statusMap[status] || status;
}

export function ProjectHeader({
  name,
  description,
  pipelineStatus,
  createdAt,
}: ProjectHeaderProps) {
  const formattedDate = new Date(createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-4">
      {/* Breadcrumb navigation */}
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground transition-colors">
          <Home className="h-4 w-4" />
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link to="/" className="hover:text-foreground transition-colors">
          Projects
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{name}</span>
      </nav>

      {/* Project header card */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <h1 className="text-3xl font-bold tracking-tight">{name}</h1>
            {description && <p className="text-muted-foreground">{description}</p>}
            <p className="text-sm text-muted-foreground">Created on {formattedDate}</p>
          </div>
          <Badge variant={getPipelineStatusVariant(pipelineStatus) as "default" | "secondary"}>
            {formatPipelineStatus(pipelineStatus)}
          </Badge>
        </div>
      </Card>
    </div>
  );
}
