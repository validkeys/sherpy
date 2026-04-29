/**
 * Inbox Detail Panel - Selected project preview
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DetailPanelProps {
  projectId?: string;
}

export function DetailPanel({ projectId }: DetailPanelProps) {
  if (!projectId) {
    return (
      <div className="w-96 border-l bg-card hidden lg:flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-muted-foreground">Select a project to view details</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-96 border-l bg-card hidden lg:flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-2">Project Name</h2>
        <Badge className="mb-2">Active Development</Badge>
        <p className="text-sm text-muted-foreground">Project description goes here...</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Milestones Progress */}
          <div>
            <h3 className="text-sm font-medium mb-2">Milestones</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Completed</span>
                <span className="text-muted-foreground">0 / 0</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: "0%" }} />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <h3 className="text-sm font-medium mb-2">Tags</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">tag1</Badge>
              <Badge variant="outline">tag2</Badge>
            </div>
          </div>

          {/* Assigned People */}
          <div>
            <h3 className="text-sm font-medium mb-2">Team</h3>
            <p className="text-sm text-muted-foreground">No team members assigned</p>
          </div>
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <Button className="w-full">Open Project</Button>
      </div>
    </div>
  );
}
