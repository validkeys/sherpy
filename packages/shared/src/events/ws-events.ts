/**
 * WebSocket event types using Schema.Struct
 * Server-sent events for real-time dashboard updates
 */

import { Schema } from "effect";

/**
 * TypeScript interfaces for actual WebSocket event payloads
 * These match the runtime event structure used by the WebSocket client
 */

/**
 * Project data payload in update events
 */
export interface ProjectEventData {
  id: string;
  name: string;
  slug: string;
  description?: string;
  pipelineStatus: string;
  tags?: readonly string[];
  assignedPeople?: readonly string[];
  updatedAt?: string;
  priority?: string;
}

/**
 * Project updated event payload
 */
export interface ProjectUpdatedEventPayload {
  projectId: string;
  project: ProjectEventData;
}

/**
 * Pipeline status changed event payload
 */
export interface PipelineStatusChangedEventPayload {
  projectId: string;
  oldStatus: string;
  newStatus: string;
  timestamp?: string;
}

/**
 * Task status changed event payload
 */
export interface TaskStatusChangedEventPayload {
  projectId: string;
  taskId: string;
  oldStatus: string;
  newStatus: string;
  timestamp?: string;
}

/**
 * Assignment change event payload (created/updated)
 */
export interface AssignmentChangeEventPayload {
  projectId: string;
  personId: string;
  timestamp?: string;
}

/**
 * Project Updated Event
 */
export const ProjectUpdatedEvent = Schema.Struct({
  type: Schema.Literal("project.updated"),
  timestamp: Schema.String,
  projectId: Schema.String,
  fields: Schema.Array(Schema.String),
});

export type ProjectUpdatedEvent = typeof ProjectUpdatedEvent.Type;

/**
 * Project Pipeline Status Changed Event
 */
export const ProjectPipelineStatusChangedEvent = Schema.Struct({
  type: Schema.Literal("project.pipeline-status-changed"),
  timestamp: Schema.String,
  projectId: Schema.String,
  oldStatus: Schema.String,
  newStatus: Schema.String,
});

export type ProjectPipelineStatusChangedEvent = typeof ProjectPipelineStatusChangedEvent.Type;

/**
 * Task Status Changed Event
 */
export const TaskStatusChangedEvent = Schema.Struct({
  type: Schema.Literal("task.status-changed"),
  timestamp: Schema.String,
  projectId: Schema.String,
  taskId: Schema.String,
  oldStatus: Schema.String,
  newStatus: Schema.String,
});

export type TaskStatusChangedEvent = typeof TaskStatusChangedEvent.Type;

/**
 * Schedule Generated Event
 */
export const ScheduleGeneratedEvent = Schema.Struct({
  type: Schema.Literal("schedule.generated"),
  timestamp: Schema.String,
  projectId: Schema.String,
  snapshotId: Schema.String,
  scheduleType: Schema.Literal("full", "scenario", "what-if"),
});

export type ScheduleGeneratedEvent = typeof ScheduleGeneratedEvent.Type;

/**
 * Assignment Created Event
 */
export const AssignmentCreatedEvent = Schema.Struct({
  type: Schema.Literal("assignment.created"),
  timestamp: Schema.String,
  projectId: Schema.String,
  assignmentId: Schema.String,
  taskId: Schema.String,
  personId: Schema.String,
});

export type AssignmentCreatedEvent = typeof AssignmentCreatedEvent.Type;

/**
 * Assignment Updated Event
 */
export const AssignmentUpdatedEvent = Schema.Struct({
  type: Schema.Literal("assignment.updated"),
  timestamp: Schema.String,
  projectId: Schema.String,
  assignmentId: Schema.String,
  fields: Schema.Array(Schema.String),
});

export type AssignmentUpdatedEvent = typeof AssignmentUpdatedEvent.Type;

/**
 * Conflict Detected Event
 */
export const ConflictDetectedEvent = Schema.Struct({
  type: Schema.Literal("conflict.detected"),
  timestamp: Schema.String,
  projectId: Schema.String,
  conflictType: Schema.Literal("over-allocation", "resource-overlap"),
  personId: Schema.String,
  details: Schema.String,
});

export type ConflictDetectedEvent = typeof ConflictDetectedEvent.Type;

/**
 * Document Generated Event
 */
export const DocumentGeneratedEvent = Schema.Struct({
  type: Schema.Literal("document.generated"),
  timestamp: Schema.String,
  projectId: Schema.String,
  documentId: Schema.String,
  documentType: Schema.String,
});

export type DocumentGeneratedEvent = typeof DocumentGeneratedEvent.Type;

/**
 * Chat Message Event
 */
export const ChatMessageEvent = Schema.Struct({
  type: Schema.Literal("chat.message"),
  timestamp: Schema.String,
  projectId: Schema.String,
  sessionId: Schema.String,
  role: Schema.Literal("user", "assistant"),
  content: Schema.String,
});

export type ChatMessageEvent = typeof ChatMessageEvent.Type;

/**
 * Union of all WebSocket event types
 */
export const WsEvent = Schema.Union(
  ProjectUpdatedEvent,
  ProjectPipelineStatusChangedEvent,
  TaskStatusChangedEvent,
  ScheduleGeneratedEvent,
  AssignmentCreatedEvent,
  AssignmentUpdatedEvent,
  ConflictDetectedEvent,
  DocumentGeneratedEvent,
  ChatMessageEvent,
);

export type WsEvent = typeof WsEvent.Type;
