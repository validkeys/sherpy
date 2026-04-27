/**
 * Hook for subscribing to project-specific WebSocket events
 * Filters events by project ID and provides latest event state
 */

import { useEffect, useRef, useState } from "react";
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
  debounceMs?: number;
}

let peInstanceCounter = 0;

export function useProjectEvents({ projectId, debounceMs = 300 }: UseProjectEventsOptions) {
  const instanceId = useRef(++peInstanceCounter).current;
  const renderCount = useRef(0);
  renderCount.current++;

  const { connectionState, subscribe } = useWebSocket();
  const [latestEvent, setLatestEvent] = useState<ProjectEvent | null>(null);
  const [debounceTimeout, setDebounceTimeout] = useState<number | null>(null);

  console.log(
    `[DIAG] useProjectEvents #${instanceId} render #${renderCount.current}:`,
    `projectId=${projectId}, connectionState=${connectionState}, latestEvent=${latestEvent ? latestEvent.type : "null"}, debounceTimeout=${debounceTimeout}`,
  );

  useEffect(() => {
    console.log(`[DIAG] useProjectEvents #${instanceId}: subscription effect RUNNING`);

    const handlePipelineStatusChanged = (payload: unknown) => {
      const event = payload as PipelineStatusChangedEventPayload;

      if (event.projectId !== projectId) {
        return;
      }

      if (debounceTimeout !== null) {
        clearTimeout(debounceTimeout);
      }

      const timeout = window.setTimeout(() => {
        console.log(`[DIAG] useProjectEvents #${instanceId}: setting latestEvent (pipeline-status-changed)`);
        setLatestEvent({
          type: "pipeline-status-changed",
          projectId: event.projectId,
          timestamp: event.timestamp || new Date().toISOString(),
          payload: event,
        });
      }, debounceMs);

      setDebounceTimeout(timeout);
    };

    const handleTaskStatusChanged = (payload: unknown) => {
      const event = payload as TaskStatusChangedEventPayload;

      if (event.projectId !== projectId) {
        return;
      }

      if (debounceTimeout !== null) {
        clearTimeout(debounceTimeout);
      }

      const timeout = window.setTimeout(() => {
        console.log(`[DIAG] useProjectEvents #${instanceId}: setting latestEvent (task-status-changed)`);
        setLatestEvent({
          type: "task-status-changed",
          projectId: event.projectId,
          timestamp: event.timestamp || new Date().toISOString(),
          payload: event,
        });
      }, debounceMs);

      setDebounceTimeout(timeout);
    };

    const unsubscribePipelineStatus = subscribe(
      "project:pipelineStatusChanged",
      handlePipelineStatusChanged,
    );
    const unsubscribeTaskStatus = subscribe("task:statusChanged", handleTaskStatusChanged);

    return () => {
      console.log(`[DIAG] useProjectEvents #${instanceId}: subscription effect CLEANUP`);
      if (debounceTimeout !== null) {
        clearTimeout(debounceTimeout);
      }
      unsubscribePipelineStatus();
      unsubscribeTaskStatus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, subscribe, debounceMs]);

  return {
    latestEvent,
    connectionState,
  };
}
