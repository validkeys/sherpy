/**
 * Domain services barrel export
 * Services: project, milestone, task, person, schedule, ai
 */

export {
  ProjectService,
  ProjectServiceLive,
  type CreateProjectInput,
  type UpdateProjectInput,
  type ProjectFilters,
} from "./project-service.js";
export {
  MilestoneService,
  MilestoneServiceLive,
  type CreateMilestoneInput,
  type UpdateMilestoneInput,
  type ReorderMilestonesInput,
} from "./milestone-service.js";
export {
  TaskService,
  TaskServiceLive,
  type CreateTaskInput,
  type UpdateTaskInput,
  type ReorderTasksInput,
  type BulkUpdateStatusInput,
  type ListTaskFilters,
} from "./task-service.js";
export {
  TagService,
  TagServiceLive,
  type CreateTagInput,
  type UpdateTagInput,
} from "./tag-service.js";
export {
  DocumentService,
  DocumentServiceLive,
  type GenerateProjectPlanInput,
} from "./document-service.js";
export {
  ChatSessionService,
  ChatSessionServiceLive,
  type CreateChatSessionInput,
  type AddMessageInput,
} from "./chat-session-service.js";
