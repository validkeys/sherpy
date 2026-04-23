/**
 * Project Row - Individual project in the inbox list
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { HealthIndicator, type HealthStatus } from "./health-indicator";
import { PipelineStatusBadge } from "./pipeline-status-badge";

interface ProjectRowProps {
  project: {
    id: string;
    name: string;
    pipelineStatus: string;
    tags?: readonly string[];
    updatedAt: string;
    health?: HealthStatus;
  };
  selected?: boolean;
  onClick?: () => void;
}

export function ProjectRow({ project, selected, onClick }: ProjectRowProps) {
  const relativeTime = formatRelativeTime(project.updatedAt);
  const displayTags = project.tags?.slice(0, 3) || [];
  const overflowCount = (project.tags?.length || 0) - displayTags.length;

  return (
    <button
      className={cn(
        "w-full text-left p-3 border-b hover:bg-accent transition-colors",
        "focus:outline-none focus:bg-accent",
        selected && "bg-accent",
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Health Indicator */}
        <div className="mt-1.5">
          <HealthIndicator status={project.health || "healthy"} />
        </div>

        {/* Project Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-sm truncate">{project.name}</h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <PipelineStatusBadge status={project.pipelineStatus} size="sm" />

            {displayTags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}

            {overflowCount > 0 && (
              <Badge variant="outline" className="text-xs">
                +{overflowCount}
              </Badge>
            )}
          </div>
        </div>

        {/* Timestamp */}
        <div className="text-xs text-muted-foreground whitespace-nowrap mt-1">{relativeTime}</div>
      </div>
    </button>
  );
}

/**
 * Format timestamp as relative time
 */
function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
