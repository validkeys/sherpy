/**
 * HTTP server bootstrap using @effect/platform-node
 * Defines the HttpApi with groups and initializes the server
 */

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
} from "@effect/platform"
import { NodeHttpServer, NodeRuntime, NodeFileSystem } from "@effect/platform-node"
import { FetchHttpClient } from "@effect/platform"
import { SqlClient } from "@effect/sql"
import { LibsqlClient } from "@effect/sql-libsql"
import { Config, Context, Effect, Layer, Redacted, Schema } from "effect"
import { createServer } from "node:http"
import { homedir } from "node:os"
import { join } from "node:path"
import { WebSocketServer, WebSocket } from "ws"
import { IncomingMessage } from "node:http"
import { runMigrations } from "./db/migration-runner.js"
import { OktaClaims, validateJwt } from "./auth/okta-jwt.js"
import { UnauthorizedError } from "./errors/auth.js"
import { AuthService } from "./auth/jwks-cache.js"
import {
  EventBroadcaster,
  WebSocketService,
  WebSocketConnection,
} from "./api/websocket.js"
import { wrapWithStaticFiles } from "./api/static-server.js"
import {
  ProjectsApi,
  CreateProjectResponse,
  ListProjectsResponse,
  GetProjectResponse,
  UpdateProjectResponse,
} from "./api/routes/projects.js"
import {
  MilestonesApi,
  CreateMilestoneResponse,
  ListMilestonesResponse,
  GetMilestoneResponse,
  UpdateMilestoneResponse,
  ReorderMilestonesResponse,
} from "./api/routes/milestones.js"
import {
  TasksApi,
  CreateTaskResponse,
  ListTasksByMilestoneResponse,
  ListTasksByProjectResponse,
  GetTaskResponse,
  UpdateTaskResponse,
  UpdateTaskStatusResponse,
  ReorderTasksResponse,
  BulkUpdateTaskStatusResponse,
} from "./api/routes/tasks.js"
import {
  DocumentsApi,
  GenerateDocumentResponse,
  ListDocumentsResponse,
  GetDocumentResponse,
  GetDocumentVersionResponse,
} from "./api/routes/documents.js"
import {
  ChatApi,
  CreateChatSessionResponse,
  ListChatSessionsResponse,
  GetChatHistoryResponse,
  SendMessageResponse,
  DeleteChatSessionResponse,
} from "./api/routes/chat.js"
import { ProjectService, ProjectServiceLive } from "./services/project-service.js"
import { MilestoneService, MilestoneServiceLive } from "./services/milestone-service.js"
import { TaskService, TaskServiceLive } from "./services/task-service.js"
import { DocumentService, DocumentServiceLive } from "./services/document-service.js"
import { ChatSessionService, ChatSessionServiceLive } from "./services/chat-session-service.js"
import { ValidationError } from "@sherpy/shared"

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
export class CurrentUser extends Context.Tag("CurrentUser")<
  CurrentUser,
  OktaClaims
>() {}

/**
 * Authentication middleware
 * Validates JWT bearer tokens and provides CurrentUser to handlers
 */
export class Authentication extends HttpApiMiddleware.Tag<Authentication>()(
  "Authentication",
  {
    failure: UnauthorizedError,
    provides: CurrentUser,
    security: {
      bearer: HttpApiSecurity.bearer,
    },
  }
) {}

/**
 * Health API group - no authentication required
 */
class HealthApi extends HttpApiGroup.make("health").add(
  HttpApiEndpoint.get("health", "/api/health").addSuccess(HealthResponse)
).prefix("/api") {}

/**
 * Main API composition
 */
export class SherryApi extends HttpApi.make("api").add(HealthApi).add(ProjectsApi).add(MilestonesApi).add(TasksApi).add(DocumentsApi).add(ChatApi) {}

/**
 * Health check handler implementation
 */
const HealthApiLive = HttpApiBuilder.group(SherryApi, "health", (handlers) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const startTime = Date.now()

    return handlers.handle("health", () =>
      Effect.gen(function* () {
        // Verify database connectivity
        yield* sql.unsafe("SELECT 1").pipe(Effect.orDie)

        return new HealthResponse({
          status: "ok",
          db: "connected",
          uptime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        })
      })
    )
  })
)

/**
 * Projects API handler implementation
 * Delegates to ProjectService for all business logic
 */
const ProjectsApiLive = HttpApiBuilder.group(SherryApi, "projects", (handlers) =>
  Effect.gen(function* () {
    const projectService = yield* ProjectService

    return handlers
      .handle("createProject", ({ payload }) =>
        Effect.gen(function* () {
          const project = yield* projectService.create({
            name: payload.name,
            description: payload.description,
            slug: payload.slug,
            tags: payload.tags,
            priority: payload.priority,
          })

          return new CreateProjectResponse({ project })
        })
      )
      .handle("listProjects", ({ urlParams }) =>
        Effect.gen(function* () {
          const projects = yield* projectService.list({
            pipelineStatus: urlParams.pipelineStatus,
            priority: urlParams.priority,
            search: urlParams.search,
            limit: urlParams.limit,
            offset: urlParams.offset,
          }).pipe(
            Effect.catchTag("SqlError", (error) =>
              Effect.fail(
                new ValidationError({
                  message: `Database error: ${error.message ?? "Unknown error"}`,
                })
              )
            )
          )

          return new ListProjectsResponse({ projects })
        })
      )
      .handle("getProject", ({ path }) =>
        Effect.gen(function* () {
          const project = yield* projectService.get(path.projectId)

          return new GetProjectResponse({ project })
        })
      )
      .handle("updateProject", ({ path, payload }) =>
        Effect.gen(function* () {
          const project = yield* projectService.update(path.projectId, {
            name: payload.name,
            description: payload.description,
            pipelineStatus: payload.pipelineStatus,
            tags: payload.tags,
            priority: payload.priority,
          })

          return new UpdateProjectResponse({ project })
        })
      )
  })
)

/**
 * Milestones API handler implementation
 * Delegates to MilestoneService for all business logic
 */
const MilestonesApiLive = HttpApiBuilder.group(SherryApi, "milestones", (handlers) =>
  Effect.gen(function* () {
    const milestoneService = yield* MilestoneService

    return handlers
      .handle("createMilestone", ({ path, payload }) =>
        Effect.gen(function* () {
          const milestone = yield* milestoneService.create({
            projectId: path.projectId,
            name: payload.name,
            description: payload.description,
            estimatedDays: payload.estimatedDays,
            acceptanceCriteria: payload.acceptanceCriteria,
          })

          return new CreateMilestoneResponse({ milestone })
        })
      )
      .handle("listMilestones", ({ path }) =>
        Effect.gen(function* () {
          const milestones = yield* milestoneService.listByProject(path.projectId)

          return new ListMilestonesResponse({ milestones })
        })
      )
      .handle("getMilestone", ({ path }) =>
        Effect.gen(function* () {
          const milestone = yield* milestoneService.get(path.milestoneId)

          return new GetMilestoneResponse({ milestone })
        })
      )
      .handle("updateMilestone", ({ path, payload }) =>
        Effect.gen(function* () {
          const milestone = yield* milestoneService.update(path.milestoneId, {
            name: payload.name,
            description: payload.description,
            status: payload.status,
            estimatedDays: payload.estimatedDays,
            acceptanceCriteria: payload.acceptanceCriteria,
          })

          return new UpdateMilestoneResponse({ milestone })
        })
      )
      .handle("reorderMilestones", ({ path, payload }) =>
        Effect.gen(function* () {
          yield* milestoneService.reorder(path.projectId, {
            milestoneIds: payload.milestoneIds,
          })

          return new ReorderMilestonesResponse({ success: true })
        })
      )
  })
)

/**
 * Tasks API handler implementation
 * Delegates to TaskService for all business logic
 */
const TasksApiLive = HttpApiBuilder.group(SherryApi, "tasks", (handlers) =>
  Effect.gen(function* () {
    const taskService = yield* TaskService

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
          })

          return new CreateTaskResponse({ task })
        })
      )
      .handle("listTasksByMilestone", ({ path }) =>
        Effect.gen(function* () {
          const tasks = yield* taskService.listByMilestone(path.milestoneId)

          return new ListTasksByMilestoneResponse({ tasks })
        })
      )
      .handle("listTasksByProject", ({ path, urlParams }) =>
        Effect.gen(function* () {
          const tasks = yield* taskService.listByProject(path.projectId, {
            status: urlParams.status,
            priority: urlParams.priority,
          })

          return new ListTasksByProjectResponse({ tasks })
        })
      )
      .handle("getTask", ({ path }) =>
        Effect.gen(function* () {
          const task = yield* taskService.get(path.taskId)

          return new GetTaskResponse({ task })
        })
      )
      .handle("updateTask", ({ path, payload }) =>
        Effect.gen(function* () {
          const task = yield* taskService.update(path.taskId, {
            name: payload.name,
            description: payload.description,
            priority: payload.priority,
            estimatedHours: payload.estimatedHours,
            actualHours: payload.actualHours,
          })

          return new UpdateTaskResponse({ task })
        })
      )
      .handle("updateTaskStatus", ({ path, payload }) =>
        Effect.gen(function* () {
          const task = yield* taskService.updateStatus(path.taskId, {
            status: payload.status,
          })

          return new UpdateTaskStatusResponse({ task })
        })
      )
      .handle("reorderTasks", ({ path, payload }) =>
        Effect.gen(function* () {
          yield* taskService.reorder(path.milestoneId, {
            taskIds: payload.taskIds,
          })

          return new ReorderTasksResponse({ success: true })
        })
      )
      .handle("bulkUpdateTaskStatus", ({ payload }) =>
        Effect.gen(function* () {
          const tasks = yield* taskService.bulkUpdateStatus({
            taskIds: payload.taskIds,
            status: payload.status,
          })

          return new BulkUpdateTaskStatusResponse({ tasks })
        })
      )
  })
)

/**
 * Documents API handler implementation
 * Delegates to DocumentService for document generation and retrieval
 */
const DocumentsApiLive = HttpApiBuilder.group(SherryApi, "documents", (handlers) =>
  Effect.gen(function* () {
    const documentService = yield* DocumentService

    return handlers
      .handle("generateDocument", ({ path, payload }) =>
        Effect.gen(function* () {
          const document = yield* documentService.generateProjectPlan({
            projectId: path.projectId,
            format: payload.format,
          })

          return new GenerateDocumentResponse({ document })
        })
      )
      .handle("listDocuments", ({ path }) =>
        Effect.gen(function* () {
          const documents = yield* documentService.listDocuments(path.projectId)

          return new ListDocumentsResponse({ documents: Array.from(documents) })
        })
      )
      .handle("getDocument", ({ path }) =>
        Effect.gen(function* () {
          const document = yield* documentService.getDocument(
            path.projectId,
            path.documentType
          )

          return new GetDocumentResponse({ document })
        })
      )
      .handle("getDocumentVersion", ({ path }) =>
        Effect.gen(function* () {
          const document = yield* documentService.getDocumentVersion(
            path.projectId,
            path.documentType,
            path.version
          )

          return new GetDocumentVersionResponse({ document })
        })
      )
  })
)

/**
 * Chat API handler implementation
 * Delegates to ChatSessionService for chat operations
 */
const ChatApiLive = HttpApiBuilder.group(SherryApi, "chat", (handlers) =>
  Effect.gen(function* () {
    const chatService = yield* ChatSessionService

    return handlers
      .handle("createChatSession", ({ path, payload }) =>
        Effect.gen(function* () {
          const session = yield* chatService.create({
            projectId: path.projectId,
            contextType: payload.contextType,
          })

          return new CreateChatSessionResponse({ session })
        })
      )
      .handle("listChatSessions", ({ path }) =>
        Effect.gen(function* () {
          const sessions = yield* chatService.listByProject(path.projectId)

          return new ListChatSessionsResponse({ sessions: Array.from(sessions) })
        })
      )
      .handle("getChatHistory", ({ path }) =>
        Effect.gen(function* () {
          const session = yield* chatService.getHistory(path.sessionId)

          return new GetChatHistoryResponse({ session })
        })
      )
      .handle("sendMessage", ({ path, payload }) =>
        Effect.gen(function* () {
          const session = yield* chatService.addMessage({
            sessionId: path.sessionId,
            role: payload.role,
            content: payload.content,
          })

          return new SendMessageResponse({ session })
        })
      )
      .handle("deleteChatSession", ({ path }) =>
        Effect.gen(function* () {
          yield* chatService.delete(path.sessionId)

          return new DeleteChatSessionResponse({ success: true })
        })
      )
  })
)

/**
 * Authentication middleware implementation
 * Validates Bearer tokens via Okta JWT validation
 */
const AuthenticationLive = Layer.effect(
  Authentication,
  Effect.gen(function* () {
    const authService = yield* AuthService

    return Authentication.of({
      bearer: (token) =>
        Effect.gen(function* () {
          const claims = yield* authService.validateToken(Redacted.value(token))
          return claims
        }),
    })
  })
)

/**
 * Migration runner service
 * Runs database migrations before the server starts
 */
const MigrationRunnerLive = Layer.effectDiscard(
  Effect.gen(function* () {
    yield* Effect.log("Running database migrations")
    yield* runMigrations
    yield* Effect.log("Migrations completed")
  })
)

/**
 * Database layer with LibSQL (SQLite)
 * TODO: Make URL configurable via environment variable
 */
const DatabaseLayer = LibsqlClient.layer({
  url: `file:${join(homedir(), ".sherpy", "sherpy.db")}`,
})

/**
 * Full API implementation with all handlers
 */
export const SherryApiLive = HttpApiBuilder.api(SherryApi).pipe(
  Layer.provide(HealthApiLive),
  Layer.provide(ProjectsApiLive),
  Layer.provide(MilestonesApiLive),
  Layer.provide(TasksApiLive),
  Layer.provide(DocumentsApiLive),
  Layer.provide(ChatApiLive),
  Layer.provide(AuthenticationLive),
  Layer.provide(AuthService.Live),
  Layer.provide(ProjectServiceLive),
  Layer.provide(MilestoneServiceLive),
  Layer.provide(TaskServiceLive),
  Layer.provide(DocumentServiceLive),
  Layer.provide(ChatSessionServiceLive),
  Layer.provide(MigrationRunnerLive),
  Layer.provide(DatabaseLayer)
)

/**
 * WebSocket server layer
 * Sets up WebSocket server with JWT authentication
 */
const WebSocketServerLive = Layer.scopedDiscard(
  Effect.gen(function* () {
    yield* Effect.log("Initializing WebSocket server")

    const wsService = yield* WebSocketService
    const broadcaster = yield* EventBroadcaster

    // Create WebSocket server on port 3101 (separate from HTTP API)
    // In production, this would be proxied through a reverse proxy like Nginx
    const wss = new WebSocketServer({ port: 3101, host: "127.0.0.1" })

    // Track active connections
    let connectionId = 0

    wss.on("connection", (ws: WebSocket, request: IncomingMessage) => {
      const connId = `ws-${++connectionId}`

      // Extract JWT from query parameter
      const requestUrl = request.url || "/"
      const host = request.headers.host || "localhost"
      const url = new URL(requestUrl, `http://${host}`)
      const token = url.searchParams.get("token") || ""

      // Validate JWT asynchronously
      Effect.runPromise(
        Effect.gen(function* () {
          // Validate the token
          const result = yield* Effect.either(
            wsService.validateConnection(token)
          )

          if (result._tag === "Left") {
            yield* Effect.log(
              `WebSocket authentication failed for ${connId}: ${result.left.message}`
            )
            ws.close(1008, "Authentication failed")
            return
          }

          const claims = result.right
          yield* Effect.log(
            `WebSocket client authenticated: ${connId} (user: ${claims.email})`
          )

          // Create WebSocketConnection adapter
          const connection: WebSocketConnection = {
            id: connId,
            send: (data: string) =>
              Effect.sync(() => {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(data)
                }
              }),
            close: () =>
              Effect.sync(() => {
                ws.close()
              }),
          }

          // Add to broadcaster pool
          yield* broadcaster.addConnection(connection)

          // Send acknowledgment
          ws.send(JSON.stringify({ type: "connected", connectionId: connId }))

          // Handle disconnect
          ws.on("close", () => {
            Effect.runPromise(
              Effect.gen(function* () {
                yield* Effect.log(`WebSocket client disconnected: ${connId}`)
                yield* broadcaster.removeConnection(connection)
              })
            )
          })

          ws.on("error", (error) => {
            Effect.runPromise(
              Effect.gen(function* () {
                yield* Effect.logWarning(
                  `WebSocket error for ${connId}: ${String(error)}`
                )
                yield* broadcaster.removeConnection(connection)
              })
            )
          })
        })
      )
    })

    yield* Effect.addFinalizer(() =>
      Effect.gen(function* () {
        yield* Effect.log("Closing WebSocket server")
        yield* Effect.sync(() => wss.close())
      })
    )

    yield* Effect.log("WebSocket server listening on ws://127.0.0.1:3101")
  })
)

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
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3100, host: "127.0.0.1" }))
)

/**
 * Combined server layer with HTTP API and WebSocket server
 */
const ServerLive = Layer.mergeAll(HttpLive, WebSocketServerLive).pipe(
  Layer.provide(EventBroadcaster.Default),
  Layer.provide(WebSocketService.Default),
  Layer.provide(AuthService.Live),
  Layer.provide(FetchHttpClient.layer)
)

/**
 * Main server effect
 * Runs migrations, starts the HTTP server and WebSocket server, and keeps them running
 */
export const main = ServerLive.pipe(Layer.launch, Effect.scoped)

/**
 * Bootstrap and run the server
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  NodeRuntime.runMain(main)
}
