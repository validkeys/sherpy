/**
 * Hook for subscribing to project-specific WebSocket events
 * Filters events by project ID and provides latest event state
 */

import { useEffect, useState } from "react";
import type {
  PipelineStatusChangedEventPayload,
  TaskStatusChangedEventPayload,
} from "@sherpy/shared";
import { useWebSocket } from "./use-websocket";

export type ProjectEventType = "pipeline-status-changed" | "task-status-changed" | "milestone-completed";

export interface ProjectEvent {
  type: ProjectEventType;
  projectId: string;
  timestamp: string;
  payload: unknown;
}

export interface UseProjectEventsOptions {
  projectId: string;
  /**
   * Debounce multiple rapid events to prevent excessive re-renders
   * Default: 300ms
   */
  debounceMs?: number;
}

/**
 * Subscribe to WebSocket events for a specific project
 * Returns the latest event, or null if no events have been received
 */
export function useProjectEvents({ projectId, debounceMs = 300 }: UseProjectEventsOptions) {
  const { connectionState, subscribe } = useWebSocket();
  const [latestEvent, setLatestEvent] = useState<ProjectEvent | null>(null);
  const [debounceTimeout, setDebounceTimeout] = useState<number | null>(null);

  useEffect(() => {
    // Handler for pipeline status changes
    const handlePipelineStatusChanged = (payload: unknown) => {
      const event = payload as PipelineStatusChangedEventPayload;

      // Filter by project ID
      if (event.projectId !== projectId) {
        return;
      }

      // Debounce updates
      if (debounceTimeout !== null) {
        clearTimeout(debounceTimeout);
      }

      const timeout = window.setTimeout(() => {
        setLatestEvent({
          type: "pipeline-status-changed",
          projectId: event.projectId,
          timestamp: event.timestamp || new Date().toISOString(),
          payload: event,
        });
      }, debounceMs);

      setDebounceTimeout(timeout);
    };

    // Handler for task status changes
    const handleTaskStatusChanged = (payload: unknown) => {
      const event = payload as TaskStatusChangedEventPayload;

      // Filter by project ID
      if (event.projectId !== projectId) {
        return;
      }

      // Debounce updates
      if (debounceTimeout !== null) {
        clearTimeout(debounceTimeout);
      }

      const timeout = window.setTimeout(() => {
        setLatestEvent({
          type: "task-status-changed",
          projectId: event.projectId,
          timestamp: event.timestamp || new Date().toISOString(),
          payload: event,
        });
      }, debounceMs);

      setDebounceTimeout(timeout);
    };

    // Subscribe to WebSocket events
    const unsubscribePipelineStatus = subscribe(
      "project:pipelineStatusChanged",
      handlePipelineStatusChanged,
    );
    const unsubscribeTaskStatus = subscribe("task:statusChanged", handleTaskStatusChanged);

    // Cleanup
    return () => {
      if (debounceTimeout !== null) {
        clearTimeout(debounceTimeout);
      }
      unsubscribePipelineStatus();
      unsubscribeTaskStatus();
    };
  }, [projectId, subscribe, debounceMs, debounceTimeout]);

  return {
    latestEvent,
    connectionState,
  };
}
