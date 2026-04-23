/**
 * Inbox Sidebar - Navigation and filters
 */

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNewProject?: () => void;
}

export function Sidebar({ collapsed, onToggleCollapse, onNewProject }: SidebarProps) {
  if (collapsed) {
    return (
      <div className="w-12 border-r bg-card flex flex-col items-center py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="mb-4"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onNewProject}
          className="mb-4"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    );
  }

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
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
        <Button
          onClick={onNewProject}
          className="w-full"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Pipeline Status Filters */}
          <div>
            <h3 className="text-sm font-medium mb-2 text-muted-foreground">
              Status
            </h3>
            <div className="space-y-1">
              <button className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-accent flex items-center justify-between">
                <span>All Projects</span>
                <Badge variant="secondary">0</Badge>
              </button>
              <button className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-accent flex items-center justify-between">
                <span>Active</span>
                <Badge variant="secondary">0</Badge>
              </button>
              <button className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-accent flex items-center justify-between">
                <span>Planning</span>
                <Badge variant="secondary">0</Badge>
              </button>
            </div>
          </div>

          {/* Tag Filters */}
          <div>
            <h3 className="text-sm font-medium mb-2 text-muted-foreground">
              Tags
            </h3>
            <p className="text-xs text-muted-foreground">No tags yet</p>
          </div>

          {/* My Projects */}
          <div>
            <button className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-accent flex items-center justify-between">
              <span>My Projects</span>
              <Badge variant="secondary">0</Badge>
            </button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
