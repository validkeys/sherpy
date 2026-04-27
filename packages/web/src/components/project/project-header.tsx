/**
 * Project Header Component
 * Displays project name, description, status, and breadcrumb navigation
 */

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  formatPipelineStatus,
  getPipelineStatusVariant,
} from "@/lib/pipeline-status-utils";
import type { PipelineStatus } from "@sherpy/shared";
import { ChevronRight, Home } from "lucide-react";
import { Link } from "react-router-dom";

interface ProjectHeaderProps {
  name: string;
  description?: string;
  pipelineStatus: PipelineStatus;
  createdAt: string | Date;
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
      {/* Breadcrumb navigation with proper ARIA markup */}
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <ol className="flex items-center space-x-2">
          <li>
            <Link to="/" className="hover:text-foreground transition-colors">
              <Home className="h-4 w-4" aria-label="Home" />
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="h-4 w-4" />
          </li>
          <li>
            <Link to="/projects" className="hover:text-foreground transition-colors">
              Projects
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="h-4 w-4" />
          </li>
          <li aria-current="page">
            <span className="text-foreground">{name}</span>
          </li>
        </ol>
      </nav>

      {/* Project header card */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <h1 className="text-3xl font-bold tracking-tight">{name}</h1>
            {description && <p className="text-muted-foreground">{description}</p>}
            <p className="text-sm text-muted-foreground">Created on {formattedDate}</p>
          </div>
          <Badge variant={getPipelineStatusVariant(pipelineStatus)}>
            {formatPipelineStatus(pipelineStatus)}
          </Badge>
        </div>
      </Card>
    </div>
  );
}
