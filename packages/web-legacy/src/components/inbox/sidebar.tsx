/**
 * Inbox Sidebar - Navigation and filters
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNewProject?: () => void;
  availableStatuses?: string[];
  availableTags?: string[];
  statusFilters?: string[];
  tagFilters?: string[];
  assignedToMe?: boolean;
  onToggleStatus?: (status: string) => void;
  onToggleTag?: (tag: string) => void;
  onToggleAssignedToMe?: () => void;
  projectCounts?: {
    total: number;
    byStatus: Record<string, number>;
    byTag: Record<string, number>;
    assignedToMe: number;
  };
}

// Status labels for display
const STATUS_LABELS: Record<string, string> = {
  intake: "Intake",
  "gap-analysis": "Gap Analysis",
  "business-requirements": "Business Req",
  "technical-requirements": "Technical Req",
  "style-anchors": "Style Anchors",
  "implementation-planning": "Planning",
  "plan-review": "Review",
  "architecture-decisions": "Architecture",
  "delivery-timeline": "Timeline",
  "qa-test-plan": "QA Plan",
  summaries: "Summaries",
  "active-development": "Active",
  completed: "Complete",
  archived: "Archived",
};

export function Sidebar({
  collapsed,
  onToggleCollapse,
  onNewProject,
  availableStatuses = [],
  availableTags = [],
  statusFilters = [],
  tagFilters = [],
  assignedToMe = false,
  onToggleStatus,
  onToggleTag,
  onToggleAssignedToMe,
  projectCounts,
}: SidebarProps) {
  if (collapsed) {
    return (
      <div className="w-12 border-r bg-card flex flex-col items-center py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="mb-4"
          aria-label="Expand sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onNewProject}
          className="mb-4"
          aria-label="New project"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  const totalCount = projectCounts?.total ?? 0;
  const myProjectsCount = projectCounts?.assignedToMe ?? 0;

  return (
    <div className="w-60 border-r bg-card flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Sherpy PM</h2>
            {import.meta.env.VITE_DEV_MODE === "true" && (
              <span className="text-xs text-amber-600 font-medium">DEV MODE</span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={onNewProject} className="w-full" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Pipeline Status Filters */}
          <div>
            <h3 className="text-sm font-medium mb-2 text-muted-foreground">Status</h3>
            <div className="space-y-1">
              {availableStatuses.length > 0 ? (
                availableStatuses.map((status) => {
                  const isActive = statusFilters.includes(status);
                  const count = projectCounts?.byStatus[status] ?? 0;
                  const label = STATUS_LABELS[status] || status;

                  return (
                    <button
                      key={status}
                      onClick={() => onToggleStatus?.(status)}
                      className={cn(
                        "w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-accent flex items-center justify-between",
                        isActive && "bg-accent font-medium",
                      )}
                    >
                      <span>{label}</span>
                      <Badge variant={isActive ? "default" : "secondary"}>{count}</Badge>
                    </button>
                  );
                })
              ) : (
                <p className="text-xs text-muted-foreground px-2">No projects yet</p>
              )}
            </div>
          </div>

          {/* Tag Filters */}
          <div>
            <h3 className="text-sm font-medium mb-2 text-muted-foreground">Tags</h3>
            <div className="space-y-1">
              {availableTags.length > 0 ? (
                availableTags.map((tag) => {
                  const isActive = tagFilters.includes(tag);
                  const count = projectCounts?.byTag[tag] ?? 0;

                  return (
                    <button
                      key={tag}
                      onClick={() => onToggleTag?.(tag)}
                      className={cn(
                        "w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-accent flex items-center justify-between",
                        isActive && "bg-accent font-medium",
                      )}
                    >
                      <span className="truncate">{tag}</span>
                      <Badge variant={isActive ? "default" : "secondary"}>{count}</Badge>
                    </button>
                  );
                })
              ) : (
                <p className="text-xs text-muted-foreground px-2">No tags yet</p>
              )}
            </div>
          </div>

          {/* My Projects */}
          <div>
            <button
              onClick={onToggleAssignedToMe}
              className={cn(
                "w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-accent flex items-center justify-between",
                assignedToMe && "bg-accent font-medium",
              )}
            >
              <span>My Projects</span>
              <Badge variant={assignedToMe ? "default" : "secondary"}>{myProjectsCount}</Badge>
            </button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
