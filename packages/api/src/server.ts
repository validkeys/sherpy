/**
 * HTTP server bootstrap using @effect/platform-node
 * Defines the HttpApi with groups and initializes the server
 */

import { createServer } from "node:http";
import type { IncomingMessage } from "node:http";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiMiddleware,
  HttpApiSchema,
  HttpApiSecurity,
  HttpMiddleware,
  HttpServer,
} from "@effect/platform";
import { FetchHttpClient } from "@effect/platform";
import { NodeFileSystem, NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { SqlClient } from "@effect/sql";
import { LibsqlClient } from "@effect/sql-libsql";
import { ValidationError } from "@sherpy/shared";
import { Config, Context, Effect, Layer, Redacted, Schema } from "effect";
import { WebSocket, WebSocketServer } from "ws";
import {
  AssignmentsApi,
  AssignRequest,
  AssignResponse,
  ListAssignmentsByPersonResponse,
  ListAssignmentsByProjectResponse,
  ListAssignmentsByTaskResponse,
  UnassignResponse,
  UpdateAllocationResponse,
} from "./api/routes/assignmentsApi.js";
import {
  AvailabilityApi,
  CreateAvailabilityResponse,
  ListAvailabilityByPersonResponse,
  ListOverlappingAvailabilityResponse,
  RemoveAvailabilityResponse,
  UpdateAvailabilityResponse,
} from "./api/routes/availabilityApi.js";
import {
  ChatApi,
  CreateChatSessionResponse,
  DeleteChatSessionResponse,
  GetChatHistoryResponse,
  ListChatSessionsResponse,
  SendMessageResponse,
} from "./api/routes/chat.js";
import { ConflictsApi, DetectConflictsResponse } from "./api/routes/conflictsApi.js";
import {
  DocumentsApi,
  GenerateDocumentResponse,
  GetDocumentResponse,
  GetDocumentVersionResponse,
  ListDocumentsResponse,
} from "./api/routes/documents.js";
import {
  CreateMilestoneResponse,
  GetMilestoneResponse,
  ListMilestonesResponse,
  MilestonesApi,
  ReorderMilestonesResponse,
  UpdateMilestoneResponse,
} from "./api/routes/milestones.js";
import {
  CreatePersonResponse,
  GetPersonResponse,
  ListPeopleResponse,
  PeopleApi,
  UpdatePersonResponse,
} from "./api/routes/peopleApi.js";
import {
  CreateProjectResponse,
  GetProjectResponse,
  ListProjectsResponse,
  ProjectsApi,
  UpdateProjectResponse,
} from "./api/routes/projects.js";
import {
  AllocationByPersonResponse,
  AllocationByProjectResponse,
  PersonAllocationByProjectResponse,
  ResourceAllocationApi,
} from "./api/routes/resourceAllocationApi.js";
import {
  AddPersonSkillResponse,
  CreateSkillResponse,
  GetSkillResponse,
  ListPersonSkillsResponse,
  ListSkillsResponse,
  RemovePersonSkillResponse,
  RemoveSkillResponse,
  SkillsApi,
  UpdateSkillResponse,
} from "./api/routes/skillsApi.js";
import {
  BulkUpdateTaskStatusResponse,
  CreateTaskResponse,
  GetTaskResponse,
  ListTasksByMilestoneResponse,
  ListTasksByProjectResponse,
  ReorderTasksResponse,
  TasksApi,
  UpdateTaskResponse,
  UpdateTaskStatusResponse,
} from "./api/routes/tasks.js";
import { wrapWithStaticFiles } from "./api/static-server.js";
import { EventBroadcaster, type WebSocketConnection, WebSocketService } from "./api/websocket.js";
import { AuthService } from "./auth/jwks-cache.js";
import { type OktaClaims, validateJwt } from "./auth/okta-jwt.js";
import { runMigrations } from "./db/migration-runner.js";
import { UnauthorizedError } from "./errors/auth.js";
import { ChatSessionService, ChatSessionServiceLive } from "./services/chat-session-service.js";
import { DocumentService, DocumentServiceLive } from "./services/document-service.js";
import { MilestoneService, MilestoneServiceLive } from "./services/milestone-service.js";
import {
  AssignmentService,
  AssignmentServiceLive,
} from "./services/people/AssignmentService.js";
import {
  AvailabilityService,
  AvailabilityServiceLive,
} from "./services/people/AvailabilityService.js";
import { ConflictService, ConflictServiceLive } from "./services/people/ConflictService.js";
import { PersonService, PersonServiceLive } from "./services/people/PersonService.js";
import {
  PersonSkillService,
  PersonSkillServiceLive,
} from "./services/people/PersonSkillService.js";
import {
  ResourceAllocationService,
  ResourceAllocationServiceLive,
} from "./services/people/ResourceAllocationService.js";
import { SkillService, SkillServiceLive } from "./services/people/SkillService.js";
import { ProjectService, ProjectServiceLive } from "./services/project-service.js";
import { TaskService, TaskServiceLive } from "./services/task-service.js";

/**
 * Health check response schema
 */
class HealthResponse extends Schema.Class<HealthResponse>("HealthResponse")({
  status: Schema.Literal("ok"),
  db: Schema.Literal("connected"),
  uptime: Schema.Number,
  timestamp: Schema.String,
}) {}

/**
 * CurrentUser context tag
 * Provides authenticated user claims to request handlers
 */
export class CurrentUser extends Context.Tag("CurrentUser")<CurrentUser, OktaClaims>() {}

/**
 * Authentication middleware
 * Validates JWT bearer tokens and provides CurrentUser to handlers
 */
export class Authentication extends HttpApiMiddleware.Tag<Authentication>()("Authentication", {
  failure: UnauthorizedError,
  provides: CurrentUser,
  security: {
    bearer: HttpApiSecurity.bearer,
  },
}) {}

/**
 * Health API group - no authentication required
 */
class HealthApi extends HttpApiGroup.make("health")
  .add(HttpApiEndpoint.get("health", "/api/health").addSuccess(HealthResponse))
  .prefix("/api") {}

/**
 * Main API composition
 */
export class SherryApi extends HttpApi.make("api")
  .add(HealthApi)
  .add(ProjectsApi)
  .add(MilestonesApi)
  .add(TasksApi)
  .add(DocumentsApi)
  .add(ChatApi)
  .add(PeopleApi)
  .add(SkillsApi)
  .add(AssignmentsApi)
  .add(AvailabilityApi)
  .add(ConflictsApi)
  .add(ResourceAllocationApi) {}

/**
 * Health check handler implementation
 */
const HealthApiLive = HttpApiBuilder.group(SherryApi, "health", (handlers) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const startTime = Date.now();

    return handlers.handle("health", () =>
      Effect.gen(function* () {
        // Verify database connectivity
        yield* sql.unsafe("SELECT 1").pipe(Effect.orDie);

        return new HealthResponse({
          status: "ok",
          db: "connected",
          uptime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        });
      }),
    );
  }),
);

/**
 * Projects API handler implementation
 * Delegates to ProjectService for all business logic
 */
const ProjectsApiLive = HttpApiBuilder.group(SherryApi, "projects", (handlers) =>
  Effect.gen(function* () {
    const projectService = yield* ProjectService;

    return handlers
      .handle("createProject", ({ payload }) =>
        Effect.gen(function* () {
          const project = yield* projectService.create({
            name: payload.name,
            description: payload.description,
            slug: payload.slug,
            tags: payload.tags,
            priority: payload.priority,
          });

          return new CreateProjectResponse({ project });
        }),
      )
      .handle("listProjects", ({ urlParams }) =>
        Effect.gen(function* () {
          const projects = yield* projectService.list({
            pipelineStatus: urlParams.pipelineStatus,
            priority: urlParams.priority,
            search: urlParams.search,
            limit: urlParams.limit,
            offset: urlParams.offset,
          });

          return new ListProjectsResponse({ projects });
        }),
      )
      .handle("getProject", ({ path }) =>
        Effect.gen(function* () {
          const project = yield* projectService.get(path.projectId);

          return new GetProjectResponse({ project });
        }),
      )
      .handle("updateProject", ({ path, payload }) =>
        Effect.gen(function* () {
          const project = yield* projectService.update(path.projectId, {
            name: payload.name,
            description: payload.description,
            pipelineStatus: payload.pipelineStatus,
            tags: payload.tags,
            priority: payload.priority,
          });

          return new UpdateProjectResponse({ project });
        }),
      );
  }),
);

/**
 * Milestones API handler implementation
 * Delegates to MilestoneService for all business logic
 */
const MilestonesApiLive = HttpApiBuilder.group(SherryApi, "milestones", (handlers) =>
  Effect.gen(function* () {
    const milestoneService = yield* MilestoneService;

    return handlers
      .handle("createMilestone", ({ path, payload }) =>
        Effect.gen(function* () {
          const milestone = yield* milestoneService.create({
            projectId: path.projectId,
            name: payload.name,
            description: payload.description,
            estimatedDays: payload.estimatedDays,
            acceptanceCriteria: payload.acceptanceCriteria,
          });

          return new CreateMilestoneResponse({ milestone });
        }),
      )
      .handle("listMilestones", ({ path }) =>
        Effect.gen(function* () {
          const milestones = yield* milestoneService.listByProject(path.projectId);

          return new ListMilestonesResponse({ milestones });
        }),
      )
      .handle("getMilestone", ({ path }) =>
        Effect.gen(function* () {
          const milestone = yield* milestoneService.get(path.milestoneId);

          return new GetMilestoneResponse({ milestone });
        }),
      )
      .handle("updateMilestone", ({ path, payload }) =>
        Effect.gen(function* () {
          const milestone = yield* milestoneService.update(path.milestoneId, {
            name: payload.name,
            description: payload.description,
            status: payload.status,
            estimatedDays: payload.estimatedDays,
            acceptanceCriteria: payload.acceptanceCriteria,
          });

          return new UpdateMilestoneResponse({ milestone });
        }),
      )
      .handle("reorderMilestones", ({ path, payload }) =>
        Effect.gen(function* () {
          yield* milestoneService.reorder(path.projectId, {
            milestoneIds: payload.milestoneIds,
          });

          return new ReorderMilestonesResponse({ success: true });
        }),
      );
  }),
);

/**
 * Tasks API handler implementation
 * Delegates to TaskService for all business logic
 */
const TasksApiLive = HttpApiBuilder.group(SherryApi, "tasks", (handlers) =>
  Effect.gen(function* () {
    const taskService = yield* TaskService;

    return handlers
      .handle("createTask", ({ path, payload }) =>
        Effect.gen(function* () {
          const task = yield* taskService.create({
            milestoneId: path.milestoneId,
            projectId: payload.projectId,
            name: payload.name,
            description: payload.description,
            priority: payload.priority,
            estimatedHours: payload.estimatedHours,
          });

          return new CreateTaskResponse({ task });
        }),
      )
      .handle("listTasksByMilestone", ({ path }) =>
        Effect.gen(function* () {
          const tasks = yield* taskService.listByMilestone(path.milestoneId);

          return new ListTasksByMilestoneResponse({ tasks });
        }),
      )
      .handle("listTasksByProject", ({ path, urlParams }) =>
        Effect.gen(function* () {
          const tasks = yield* taskService.listByProject(path.projectId, {
            status: urlParams.status,
            priority: urlParams.priority,
          });

          return new ListTasksByProjectResponse({ tasks });
        }),
      )
      .handle("getTask", ({ path }) =>
        Effect.gen(function* () {
          const task = yield* taskService.get(path.taskId);

          return new GetTaskResponse({ task });
        }),
      )
      .handle("updateTask", ({ path, payload }) =>
        Effect.gen(function* () {
          const task = yield* taskService.update(path.taskId, {
            name: payload.name,
            description: payload.description,
            priority: payload.priority,
            estimatedHours: payload.estimatedHours,
            actualHours: payload.actualHours,
          });

          return new UpdateTaskResponse({ task });
        }),
      )
      .handle("updateTaskStatus", ({ path, payload }) =>
        Effect.gen(function* () {
          const task = yield* taskService.updateStatus(path.taskId, {
            status: payload.status,
          });

          return new UpdateTaskStatusResponse({ task });
        }),
      )
      .handle("reorderTasks", ({ path, payload }) =>
        Effect.gen(function* () {
          yield* taskService.reorder(path.milestoneId, {
            taskIds: payload.taskIds,
          });

          return new ReorderTasksResponse({ success: true });
        }),
      )
      .handle("bulkUpdateTaskStatus", ({ payload }) =>
        Effect.gen(function* () {
          const tasks = yield* taskService.bulkUpdateStatus({
            taskIds: payload.taskIds,
            status: payload.status,
          });

          return new BulkUpdateTaskStatusResponse({ tasks });
        }),
      );
  }),
);

/**
 * Documents API handler implementation
 * Delegates to DocumentService for document generation and retrieval
 */
const DocumentsApiLive = HttpApiBuilder.group(SherryApi, "documents", (handlers) =>
  Effect.gen(function* () {
    const documentService = yield* DocumentService;

    return handlers
      .handle("generateDocument", ({ path, payload }) =>
        Effect.gen(function* () {
          const document = yield* documentService.generateProjectPlan({
            projectId: path.projectId,
            format: payload.format,
          });

          return new GenerateDocumentResponse({ document });
        }),
      )
      .handle("listDocuments", ({ path }) =>
        Effect.gen(function* () {
          const documents = yield* documentService.listDocuments(path.projectId);

          return new ListDocumentsResponse({ documents: Array.from(documents) });
        }),
      )
      .handle("getDocument", ({ path }) =>
        Effect.gen(function* () {
          const document = yield* documentService.getDocument(path.projectId, path.documentType);

          return new GetDocumentResponse({ document });
        }),
      )
      .handle("getDocumentVersion", ({ path }) =>
        Effect.gen(function* () {
          const document = yield* documentService.getDocumentVersion(
            path.projectId,
            path.documentType,
            path.version,
          );

          return new GetDocumentVersionResponse({ document });
        }),
      );
  }),
);

/**
 * Chat API handler implementation
 * Delegates to ChatSessionService for chat operations
 */
const ChatApiLive = HttpApiBuilder.group(SherryApi, "chat", (handlers) =>
  Effect.gen(function* () {
    const chatService = yield* ChatSessionService;

    return handlers
      .handle("createChatSession", ({ path, payload }) =>
        Effect.gen(function* () {
          const session = yield* chatService.create({
            projectId: path.projectId,
            contextType: payload.contextType,
          });

          return new CreateChatSessionResponse({ session });
        }),
      )
      .handle("listChatSessions", ({ path }) =>
        Effect.gen(function* () {
          const sessions = yield* chatService.listByProject(path.projectId);

          return new ListChatSessionsResponse({ sessions: Array.from(sessions) });
        }),
      )
      .handle("getChatHistory", ({ path }) =>
        Effect.gen(function* () {
          const session = yield* chatService.getHistory(path.sessionId);

          return new GetChatHistoryResponse({ session });
        }),
      )
      .handle("sendMessage", ({ path, payload }) =>
        Effect.gen(function* () {
          const session = yield* chatService.addMessage({
            sessionId: path.sessionId,
            role: payload.role,
            content: payload.content,
          });

          return new SendMessageResponse({ session });
        }),
      )
      .handle("deleteChatSession", ({ path }) =>
        Effect.gen(function* () {
          yield* chatService.delete(path.sessionId);

          return new DeleteChatSessionResponse({ success: true });
        }),
      );
  }),
);

/**
 * People API handler implementation
 * Delegates to PersonService for all business logic
 */
const PeopleApiLive = HttpApiBuilder.group(SherryApi, "people", (handlers) =>
  Effect.gen(function* () {
    const personService = yield* PersonService;

    return handlers
      .handle("createPerson", ({ payload }) =>
        Effect.gen(function* () {
          const person = yield* personService.create({
            name: payload.name,
            email: payload.email,
            oktaUserId: payload.oktaUserId,
            capacityHoursPerWeek: payload.capacityHoursPerWeek,
          });

          return new CreatePersonResponse({ person });
        }),
      )
      .handle("listPeople", () =>
        Effect.gen(function* () {
          const people = yield* personService.list();

          return new ListPeopleResponse({ people: Array.from(people) });
        }),
      )
      .handle("getPerson", ({ path }) =>
        Effect.gen(function* () {
          const person = yield* personService.get(path.personId);

          return new GetPersonResponse({ person });
        }),
      )
      .handle("updatePerson", ({ path, payload }) =>
        Effect.gen(function* () {
          const person = yield* personService.update(path.personId, {
            name: payload.name,
            email: payload.email,
            oktaUserId: payload.oktaUserId,
            capacityHoursPerWeek: payload.capacityHoursPerWeek,
          });

          return new UpdatePersonResponse({ person });
        }),
      );
  }),
);

/**
 * Skills API handler implementation
 * Delegates to SkillService and PersonSkillService for all business logic
 */
const SkillsApiLive = HttpApiBuilder.group(SherryApi, "skills", (handlers) =>
  Effect.gen(function* () {
    const skillService = yield* SkillService;
    const personSkillService = yield* PersonSkillService;

    return handlers
      .handle("createSkill", ({ payload }) =>
        Effect.gen(function* () {
          const skill = yield* skillService.create({
            name: payload.name,
            category: payload.category,
          });

          return new CreateSkillResponse({ skill });
        }),
      )
      .handle("listSkills", () =>
        Effect.gen(function* () {
          const skills = yield* skillService.list();

          return new ListSkillsResponse({ skills: Array.from(skills) });
        }),
      )
      .handle("getSkill", ({ path }) =>
        Effect.gen(function* () {
          const skill = yield* skillService.get(path.skillId);

          return new GetSkillResponse({ skill });
        }),
      )
      .handle("updateSkill", ({ path, payload }) =>
        Effect.gen(function* () {
          const skill = yield* skillService.update(path.skillId, {
            name: payload.name,
            category: payload.category,
          });

          return new UpdateSkillResponse({ skill });
        }),
      )
      .handle("removeSkill", ({ path }) =>
        Effect.gen(function* () {
          yield* skillService.remove(path.skillId);

          return new RemoveSkillResponse({ success: true });
        }),
      )
      .handle("addPersonSkill", ({ path, payload }) =>
        Effect.gen(function* () {
          const personSkill = yield* personSkillService.addSkill({
            personId: path.personId,
            skillId: payload.skillId,
            proficiency: payload.proficiency,
          });

          return new AddPersonSkillResponse({ personSkill });
        }),
      )
      .handle("removePersonSkill", ({ path }) =>
        Effect.gen(function* () {
          yield* personSkillService.removeSkill(path.personId, path.skillId);

          return new RemovePersonSkillResponse({ success: true });
        }),
      )
      .handle("listPersonSkills", ({ path }) =>
        Effect.gen(function* () {
          const personWithSkills = yield* personSkillService.listSkillsForPerson(path.personId);

          // Map PersonWithSkills to PersonSkill array for API response
          const skills = personWithSkills.skills.map((s) => ({
            personId: path.personId,
            skillId: s.skill.id,
            proficiency: s.proficiency,
          }));

          return new ListPersonSkillsResponse({ skills });
        }),
      );
  }),
);

/**
 * Assignments API handler implementation
 * Delegates to AssignmentService for all business logic
 */
const AssignmentsApiLive = HttpApiBuilder.group(SherryApi, "assignments", (handlers) =>
  Effect.gen(function* () {
    const assignmentService = yield* AssignmentService;

    return handlers
      .handle("assign", ({ payload }) =>
        Effect.gen(function* () {
          const assignment = yield* assignmentService.assign({
            taskId: payload.taskId,
            personId: payload.personId,
            allocationPercentage: payload.allocationPercentage,
            startDate: payload.startDate,
            endDate: payload.endDate,
          });

          return new AssignResponse({ assignment });
        }),
      )
      .handle("unassign", ({ path }) =>
        Effect.gen(function* () {
          yield* assignmentService.unassign(path.assignmentId);

          return new UnassignResponse({ success: true });
        }),
      )
      .handle("updateAllocation", ({ path, payload }) =>
        Effect.gen(function* () {
          const assignment = yield* assignmentService.updateAllocation(path.assignmentId, {
            allocationPercentage: payload.allocationPercentage,
          });

          return new UpdateAllocationResponse({ assignment });
        }),
      )
      .handle("listAssignmentsByPerson", ({ path }) =>
        Effect.gen(function* () {
          const assignmentsWithTask = yield* assignmentService.listByPerson(path.personId);

          // Map AssignmentWithTask to Assignment array for API response
          const assignments = assignmentsWithTask.map((a) => a.assignment);

          return new ListAssignmentsByPersonResponse({ assignments });
        }),
      )
      .handle("listAssignmentsByTask", ({ path }) =>
        Effect.gen(function* () {
          const assignmentsWithPerson = yield* assignmentService.listByTask(path.taskId);

          // Map AssignmentWithPerson to Assignment array for API response
          const assignments = assignmentsWithPerson.map((a) => a.assignment);

          return new ListAssignmentsByTaskResponse({ assignments });
        }),
      )
      .handle("listAssignmentsByProject", ({ path }) =>
        Effect.gen(function* () {
          const assignmentsWithDetails = yield* assignmentService.listByProject(path.projectId);

          // Map AssignmentWithDetails to Assignment array for API response
          const assignments = assignmentsWithDetails.map((a) => a.assignment);

          return new ListAssignmentsByProjectResponse({ assignments });
        }),
      );
  }),
);

/**
 * Availability API handler implementation
 * Delegates to AvailabilityService for all business logic
 */
const AvailabilityApiLive = HttpApiBuilder.group(SherryApi, "availability", (handlers) =>
  Effect.gen(function* () {
    const availabilityService = yield* AvailabilityService;

    return handlers
      .handle("createAvailability", ({ path, payload }) =>
        Effect.gen(function* () {
          const availabilityWindow = yield* availabilityService.create({
            personId: path.personId,
            startDate: payload.startDate,
            endDate: payload.endDate,
            type: payload.type,
            description: payload.description,
          });

          return new CreateAvailabilityResponse({ availabilityWindow });
        }),
      )
      .handle("updateAvailability", ({ path, payload }) =>
        Effect.gen(function* () {
          const availabilityWindow = yield* availabilityService.update(path.availabilityId, {
            startDate: payload.startDate,
            endDate: payload.endDate,
            type: payload.type,
            description: payload.description,
          });

          return new UpdateAvailabilityResponse({ availabilityWindow });
        }),
      )
      .handle("removeAvailability", ({ path }) =>
        Effect.gen(function* () {
          yield* availabilityService.remove(path.availabilityId);

          return new RemoveAvailabilityResponse({ success: true });
        }),
      )
      .handle("listAvailabilityByPerson", ({ path }) =>
        Effect.gen(function* () {
          const availabilityWindows = yield* availabilityService.listByPerson(path.personId);

          return new ListAvailabilityByPersonResponse({
            availabilityWindows: Array.from(availabilityWindows),
          });
        }),
      )
      .handle("listOverlappingAvailability", ({ path, urlParams }) =>
        Effect.gen(function* () {
          const availabilityWindows = yield* availabilityService.listOverlapping(
            urlParams.startDate,
            urlParams.endDate,
            path.personId,
          );

          return new ListOverlappingAvailabilityResponse({
            availabilityWindows: Array.from(availabilityWindows),
          });
        }),
      );
  }),
);

/**
 * Conflicts API handler implementation
 * Delegates to ConflictService for all business logic
 */
const ConflictsApiLive = HttpApiBuilder.group(SherryApi, "conflicts", (handlers) =>
  Effect.gen(function* () {
    const conflictService = yield* ConflictService;

    return handlers.handle("detectConflicts", ({ path, urlParams }) =>
      Effect.gen(function* () {
        const conflicts = yield* conflictService.detectAllConflictsForPerson(
          path.personId,
          urlParams.startDate,
          urlParams.endDate,
        );

        return new DetectConflictsResponse({ conflicts: Array.from(conflicts) });
      }),
    );
  }),
);

/**
 * Resource Allocation API handler implementation
 * Delegates to ResourceAllocationService for all business logic
 */
const ResourceAllocationApiLive = HttpApiBuilder.group(
  SherryApi,
  "resourceAllocation",
  (handlers) =>
    Effect.gen(function* () {
      const allocationService = yield* ResourceAllocationService;

      return handlers
        .handle("allocationByPerson", () =>
          Effect.gen(function* () {
            const allocations = yield* allocationService.allocationByPerson();

            return new AllocationByPersonResponse({ allocations: Array.from(allocations) });
          }),
        )
        .handle("allocationByProject", () =>
          Effect.gen(function* () {
            const allocations = yield* allocationService.allocationByProject();

            return new AllocationByProjectResponse({ allocations: Array.from(allocations) });
          }),
        )
        .handle("personAllocationByProject", ({ path }) =>
          Effect.gen(function* () {
            const allocations = yield* allocationService.personAllocationByProject(path.personId);

            return new PersonAllocationByProjectResponse({
              allocations: Array.from(allocations),
            });
          }),
        );
    }),
);

/**
 * Authentication middleware implementation
 * Validates Bearer tokens via Okta JWT validation
 */
const AuthenticationLive = Layer.effect(
  Authentication,
  Effect.gen(function* () {
    const authService = yield* AuthService;

    return Authentication.of({
      bearer: (token) =>
        Effect.gen(function* () {
          const claims = yield* authService.validateToken(Redacted.value(token));
          return claims;
        }),
    });
  }),
);

/**
 * Migration runner service
 * Runs database migrations before the server starts
 */
const MigrationRunnerLive = Layer.effectDiscard(
  Effect.gen(function* () {
    yield* Effect.log("Running database migrations");
    yield* runMigrations;
    yield* Effect.log("Migrations completed");
  }),
);

/**
 * Database layer with LibSQL (SQLite)
 * TODO: Make URL configurable via environment variable
 */
const DatabaseLayer = LibsqlClient.layer({
  url: `file:${join(homedir(), ".sherpy", "sherpy.db")}`,
});

/**
 * People services layer - merges all people-related services
 */
const PeopleServicesLive = Layer.mergeAll(
  PersonServiceLive,
  SkillServiceLive,
  PersonSkillServiceLive,
  AssignmentServiceLive,
  AvailabilityServiceLive,
  ConflictServiceLive,
  ResourceAllocationServiceLive,
);

/**
 * Core services layer - merges project/milestone/task services
 */
const CoreServicesLive = Layer.mergeAll(
  ProjectServiceLive,
  MilestoneServiceLive,
  TaskServiceLive,
  DocumentServiceLive,
  ChatSessionServiceLive,
);

/**
 * API handlers layer - merges all API handlers
 */
const ApiHandlersLive = Layer.mergeAll(
  HealthApiLive,
  ProjectsApiLive,
  MilestonesApiLive,
  TasksApiLive,
  DocumentsApiLive,
  ChatApiLive,
  PeopleApiLive,
  SkillsApiLive,
  AssignmentsApiLive,
  AvailabilityApiLive,
  ConflictsApiLive,
  ResourceAllocationApiLive,
);

/**
 * Full API implementation with all handlers
 */
export const SherryApiLive = HttpApiBuilder.api(SherryApi).pipe(
  Layer.provide(ApiHandlersLive),
  Layer.provide(AuthenticationLive),
  Layer.provide(AuthService.Live),
  Layer.provide(CoreServicesLive),
  Layer.provide(PeopleServicesLive),
  Layer.provide(MigrationRunnerLive),
  Layer.provide(DatabaseLayer),
);

/**
 * WebSocket server layer
 * Sets up WebSocket server with JWT authentication
 */
const WebSocketServerLive = Layer.scopedDiscard(
  Effect.gen(function* () {
    yield* Effect.log("Initializing WebSocket server");

    const wsService = yield* WebSocketService;
    const broadcaster = yield* EventBroadcaster;

    // Create WebSocket server on port 3101 (separate from HTTP API)
    // In production, this would be proxied through a reverse proxy like Nginx
    const wss = new WebSocketServer({ port: 3101, host: "127.0.0.1" });

    // Track active connections
    let connectionId = 0;

    wss.on("connection", (ws: WebSocket, request: IncomingMessage) => {
      const connId = `ws-${++connectionId}`;

      // Extract JWT from query parameter
      const requestUrl = request.url || "/";
      const host = request.headers.host || "localhost";
      const url = new URL(requestUrl, `http://${host}`);
      const token = url.searchParams.get("token") || "";

      // Validate JWT asynchronously
      Effect.runPromise(
        Effect.gen(function* () {
          // Validate the token
          const result = yield* Effect.either(wsService.validateConnection(token));

          if (result._tag === "Left") {
            yield* Effect.log(
              `WebSocket authentication failed for ${connId}: ${result.left.message}`,
            );
            ws.close(1008, "Authentication failed");
            return;
          }

          const claims = result.right;
          yield* Effect.log(`WebSocket client authenticated: ${connId} (user: ${claims.email})`);

          // Create WebSocketConnection adapter
          const connection: WebSocketConnection = {
            id: connId,
            send: (data: string) =>
              Effect.sync(() => {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(data);
                }
              }),
            close: () =>
              Effect.sync(() => {
                ws.close();
              }),
          };

          // Add to broadcaster pool
          yield* broadcaster.addConnection(connection);

          // Send acknowledgment
          ws.send(JSON.stringify({ type: "connected", connectionId: connId }));

          // Handle disconnect
          ws.on("close", () => {
            Effect.runPromise(
              Effect.gen(function* () {
                yield* Effect.log(`WebSocket client disconnected: ${connId}`);
                yield* broadcaster.removeConnection(connection);
              }),
            );
          });

          ws.on("error", (error) => {
            Effect.runPromise(
              Effect.gen(function* () {
                yield* Effect.logWarning(`WebSocket error for ${connId}: ${String(error)}`);
                yield* broadcaster.removeConnection(connection);
              }),
            );
          });
        }),
      );
    });

    yield* Effect.addFinalizer(() =>
      Effect.gen(function* () {
        yield* Effect.log("Closing WebSocket server");
        yield* Effect.sync(() => wss.close());
      }),
    );

    yield* Effect.log("WebSocket server listening on ws://127.0.0.1:3101");
  }),
);

/**
 * HTTP server layer with configuration
 * TODO: Integrate static file serving when web package is ready
 *
 * To add static serving:
 * 1. Wrap the HTTP app with wrapWithStaticFiles before serving
 * 2. Provide NodeFileSystem.layer for file system access
 * 3. Path: "../../../web/dist" (relative to dist/server.js)
 *
 * Example integration (requires @effect/platform updates):
 *   const apiApp = HttpApiBuilder.api(SherryApi)
 *   const wrappedApp = wrapWithStaticFiles(apiApp, "../../../web/dist")
 *   HttpApiBuilder.serve(wrappedApp, HttpMiddleware.logger)
 */
const HttpLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
  HttpServer.withLogAddress,
  Layer.provide(SherryApiLive),
  Layer.provide(FetchHttpClient.layer),
  Layer.provide(NodeFileSystem.layer),
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3100, host: "127.0.0.1" })),
);

/**
 * Combined server layer with HTTP API and WebSocket server
 */
const ServerLive = Layer.mergeAll(HttpLive, WebSocketServerLive).pipe(
  Layer.provide(EventBroadcaster.Default),
  Layer.provide(WebSocketService.Default),
  Layer.provide(AuthService.Live),
  Layer.provide(FetchHttpClient.layer),
);

/**
 * Main server effect
 * Runs migrations, starts the HTTP server and WebSocket server, and keeps them running
 */
export const main = ServerLive.pipe(Layer.launch, Effect.scoped);

/**
 * Bootstrap and run the server
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  NodeRuntime.runMain(main);
}
