/**
 * TaskStatusBar - Horizontal stacked bar showing task status breakdown
 * Shows color-coded segments for complete, in-progress, blocked, and todo tasks
 */

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TaskStatusCounts {
  complete: number;
  inProgress: number;
  blocked: number;
  pending: number;
}

interface TaskStatusBarProps {
  counts: TaskStatusCounts;
  className?: string;
}

export function TaskStatusBar({ counts, className = "" }: TaskStatusBarProps) {
  const total = counts.complete + counts.inProgress + counts.blocked + counts.pending;

  if (total === 0) {
    return (
      <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
        <div className="h-2 flex-1 rounded-full bg-muted" />
        <span>0/0 tasks</span>
      </div>
    );
  }

  const completePercent = (counts.complete / total) * 100;
  const inProgressPercent = (counts.inProgress / total) * 100;
  const blockedPercent = (counts.blocked / total) * 100;
  const pendingPercent = (counts.pending / total) * 100;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-muted">
              {counts.complete > 0 && (
                <div
                  className="bg-green-500"
                  style={{ width: `${completePercent}%` }}
                  aria-label={`${counts.complete} complete`}
                />
              )}
              {counts.inProgress > 0 && (
                <div
                  className="bg-blue-500"
                  style={{ width: `${inProgressPercent}%` }}
                  aria-label={`${counts.inProgress} in progress`}
                />
              )}
              {counts.blocked > 0 && (
                <div
                  className="bg-red-500"
                  style={{ width: `${blockedPercent}%` }}
                  aria-label={`${counts.blocked} blocked`}
                />
              )}
              {counts.pending > 0 && (
                <div
                  className="bg-gray-300 dark:bg-gray-600"
                  style={{ width: `${pendingPercent}%` }}
                  aria-label={`${counts.pending} pending`}
                />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span>Complete: {counts.complete}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span>In Progress: {counts.inProgress}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <span>Blocked: {counts.blocked}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                <span>Pending: {counts.pending}</span>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <span className="text-sm text-muted-foreground">
        {counts.complete}/{total} tasks
      </span>
    </div>
  );
}
