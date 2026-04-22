/**
 * Domain services barrel export
 * Services: project, milestone, task, person, schedule, ai
 */

export { ProjectService, ProjectServiceLive, type CreateProjectInput, type UpdateProjectInput, type ProjectFilters } from "./project-service.js"
export { MilestoneService, MilestoneServiceLive, type CreateMilestoneInput, type UpdateMilestoneInput, type ReorderMilestonesInput } from "./milestone-service.js"
export { TaskService, TaskServiceLive, type CreateTaskInput, type UpdateTaskInput, type ReorderTasksInput, type BulkUpdateStatusInput, type ListTaskFilters } from "./task-service.js"
