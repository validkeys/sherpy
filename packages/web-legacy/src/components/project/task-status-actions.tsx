/**
 * TaskStatusActions - Dropdown menu for updating task status
 * Provides quick actions to change task status with optimistic updates
 */

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useApi } from "@/hooks/use-api";
import type { TaskStatus } from "@sherpy/shared";
import { Check, Circle, CircleDot, MoreHorizontal, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface TaskStatusActionsProps {
  taskId: string;
  currentStatus: TaskStatus;
  onStatusChange?: (newStatus: TaskStatus) => void;
}

const STATUS_OPTIONS = [
  {
    value: "pending" as const,
    label: "Mark Todo",
    icon: Circle,
    color: "text-gray-500",
  },
  {
    value: "in-progress" as const,
    label: "Mark In Progress",
    icon: CircleDot,
    color: "text-blue-500",
  },
  {
    value: "blocked" as const,
    label: "Mark Blocked",
    icon: XCircle,
    color: "text-red-500",
  },
  {
    value: "complete" as const,
    label: "Mark Complete",
    icon: Check,
    color: "text-green-500",
  },
] as const;

export function TaskStatusActions({
  taskId,
  currentStatus,
  onStatusChange,
}: TaskStatusActionsProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const api = useApi();

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (newStatus === currentStatus || isUpdating) {
      return;
    }

    setIsUpdating(true);

    // Optimistic update
    onStatusChange?.(newStatus);

    try {
      await api.updateTaskStatus(taskId, newStatus);
      toast.success(
        `Task status updated to ${STATUS_OPTIONS.find((s) => s.value === newStatus)?.label.replace("Mark ", "")}`,
      );
    } catch (error) {
      // Revert on error
      onStatusChange?.(currentStatus);
      toast.error(error instanceof Error ? error.message : "Failed to update task status");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={isUpdating}
          aria-label="Change task status"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {STATUS_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isCurrent = option.value === currentStatus;

          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handleStatusChange(option.value)}
              disabled={isCurrent}
              className="cursor-pointer"
            >
              <Icon className={`mr-2 h-4 w-4 ${option.color}`} />
              <span className={isCurrent ? "font-semibold" : ""}>{option.label}</span>
              {isCurrent && (
                <span className="ml-auto text-xs text-muted-foreground">(current)</span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
