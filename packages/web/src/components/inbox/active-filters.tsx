/**
 * Active Filters - Display and manage active filter badges
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface ActiveFiltersProps {
  searchQuery?: string;
  statusFilters?: string[];
  tagFilters?: string[];
  assignedToMe?: boolean;
  onRemoveSearch?: () => void;
  onRemoveStatus?: (status: string) => void;
  onRemoveTag?: (tag: string) => void;
  onRemoveAssignedToMe?: () => void;
  onClearAll?: () => void;
}

// Map pipeline status codes to readable labels
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

export function ActiveFilters({
  searchQuery,
  statusFilters = [],
  tagFilters = [],
  assignedToMe,
  onRemoveSearch,
  onRemoveStatus,
  onRemoveTag,
  onRemoveAssignedToMe,
  onClearAll,
}: ActiveFiltersProps) {
  const hasFilters =
    (searchQuery?.length ?? 0) > 0 ||
    statusFilters.length > 0 ||
    tagFilters.length > 0 ||
    assignedToMe;

  if (!hasFilters) {
    return null;
  }

  const filterCount =
    (searchQuery ? 1 : 0) + statusFilters.length + tagFilters.length + (assignedToMe ? 1 : 0);

  return (
    <div className="px-4 py-2 border-b bg-muted/30 flex items-center gap-2 flex-wrap">
      <span className="text-xs text-muted-foreground">Filters:</span>

      {/* Search filter */}
      {searchQuery && (
        <Badge variant="secondary" className="gap-1">
          Search: {searchQuery.length > 20 ? searchQuery.slice(0, 20) + "..." : searchQuery}
          <button onClick={onRemoveSearch} className="ml-1 hover:bg-muted rounded-full p-0.5">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {/* Status filters */}
      {statusFilters.map((status) => (
        <Badge key={status} variant="secondary" className="gap-1">
          {STATUS_LABELS[status] || status}
          <button
            onClick={() => onRemoveStatus?.(status)}
            className="ml-1 hover:bg-muted rounded-full p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {/* Tag filters */}
      {tagFilters.map((tag) => (
        <Badge key={tag} variant="secondary" className="gap-1">
          tag:{tag}
          <button
            onClick={() => onRemoveTag?.(tag)}
            className="ml-1 hover:bg-muted rounded-full p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {/* Assigned to me filter */}
      {assignedToMe && (
        <Badge variant="secondary" className="gap-1">
          My Projects
          <button onClick={onRemoveAssignedToMe} className="ml-1 hover:bg-muted rounded-full p-0.5">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {/* Clear all button (show when 2+ filters) */}
      {filterCount >= 2 && (
        <Button variant="ghost" size="sm" onClick={onClearAll} className="h-6 text-xs">
          Clear all
        </Button>
      )}
    </div>
  );
}
