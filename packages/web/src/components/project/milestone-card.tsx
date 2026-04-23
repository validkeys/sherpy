/**
 * MilestoneCard - Collapsible card displaying milestone with task status breakdown
 * Expands to show individual tasks
 */

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TaskStatusBar } from "./task-status-bar";
import type { Milestone, Task, MilestoneStatus, TaskStatus as TaskStatusType } from "@sherpy/shared";

interface MilestoneWithTasks extends Milestone {
  tasks: Task[];
}

interface MilestoneCardProps {
  milestone: MilestoneWithTasks;
}

const STATUS_COLORS = {
  pending: "bg-gray-500",
  "in-progress": "bg-blue-500",
  blocked: "bg-red-500",
  complete: "bg-green-500",
} as const;

const STATUS_LABELS = {
  pending: "Pending",
  "in-progress": "In Progress",
  blocked: "Blocked",
  complete: "Complete",
} as const;

const TASK_STATUS_ICONS = {
  pending: "○",
  "in-progress": "◐",
  blocked: "⊗",
  complete: "●",
} as const;

function getTaskStatusCounts(tasks: Task[]) {
  const counts = {
    complete: 0,
    inProgress: 0,
    blocked: 0,
    pending: 0,
  };

  tasks.forEach((task) => {
    if (task.status === "complete") {
      counts.complete++;
    } else if (task.status === "in-progress") {
      counts.inProgress++;
    } else if (task.status === "blocked") {
      counts.blocked++;
    } else if (task.status === "pending") {
      counts.pending++;
    }
  });

  return counts;
}

export function MilestoneCard({ milestone }: MilestoneCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const taskCounts = getTaskStatusCounts(milestone.tasks);
  const statusColorClass = STATUS_COLORS[milestone.status];
  const statusLabel = STATUS_LABELS[milestone.status];

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-accent/50">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{milestone.name}</h3>
                  <Badge variant="secondary" className={statusColorClass}>
                    {statusLabel}
                  </Badge>
                </div>
                {milestone.description && (
                  <p className="text-sm text-muted-foreground">{milestone.description}</p>
                )}
              </div>
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
                aria-hidden="true"
              />
            </div>
            <TaskStatusBar counts={taskCounts} className="mt-2" />
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent>
            {milestone.tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks in this milestone</p>
            ) : (
              <div className="space-y-2">
                {milestone.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 rounded-md border p-3 hover:bg-accent/50"
                  >
                    <span
                      className="text-xl"
                      aria-label={STATUS_LABELS[task.status]}
                      title={STATUS_LABELS[task.status]}
                    >
                      {TASK_STATUS_ICONS[task.status]}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{task.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {task.priority}
                        </Badge>
                      </div>
                      {task.description && (
                        <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className={STATUS_COLORS[task.status]}>
                      {STATUS_LABELS[task.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
