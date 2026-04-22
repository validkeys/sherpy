/**
 * ChatSessionService tests using @effect/vitest with real SQLite (SA-008, SA-009)
 */

import { Reactivity } from "@effect/experimental"
import { FileSystem } from "@effect/platform"
import { NodeFileSystem } from "@effect/platform-node"
import { SqlClient } from "@effect/sql"
import { LibsqlClient } from "@effect/sql-libsql"
import { assert, describe, expect, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { runMigrations } from "../db/migration-runner.js"
import {
  ChatSessionService,
  ChatSessionServiceLive,
  type CreateChatSessionInput,
  type AddMessageInput,
} from "./chat-session-service.js"
import {
  ProjectService,
  ProjectServiceLive,
} from "./project-service.js"
import { NotFoundError } from "@sherpy/shared"

/**
 * Create a temporary SQLite database for testing
 */
const makeTestDb = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const dir = yield* fs.makeTempDirectoryScoped()
  return yield* LibsqlClient.make({
    url: `file:${dir}/test.db`,
    transformQueryNames: (_str: string) => _str.replace(/([A-Z])/g, "_$1").toLowerCase(),
    transformResultNames: (_str: string) => _str.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
  })
}).pipe(Effect.provide(Layer.mergeAll(NodeFileSystem.layer, Reactivity.layer)))

describe("ChatSessionService", () => {
  describe("create", () => {
    it.scoped("creates a new chat session with empty messages", () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql))

        const testLayer = Layer.succeed(SqlClient.SqlClient, sql)
        const allServices = Layer.mergeAll(
          ProjectServiceLive,
          ChatSessionServiceLive,
        ).pipe(Layer.provide(testLayer))

        const projectService = yield* ProjectService.pipe(Effect.provide(allServices))
        const chatService = yield* ChatSessionService.pipe(Effect.provide(allServices))

        const project = yield* projectService.create({
          name: "Test Project",
          description: "For chat testing",
        })

        const session = yield* chatService.create({
          projectId: project.id,
          contextType: "sherpy-flow",
        })

        expect(session.projectId).toBe(project.id)
        expect(session.contextType).toBe("sherpy-flow")
        expect(session.messages).toEqual([])
        expect(session.id).toBeDefined()
      }) as Effect.Effect<void>,
    )

    it.scoped("fails when project does not exist", () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql))

        const testLayer = Layer.succeed(SqlClient.SqlClient, sql)
        const allServices = Layer.mergeAll(
          ProjectServiceLive,
          ChatSessionServiceLive,
        ).pipe(Layer.provide(testLayer))

        const chatService = yield* ChatSessionService.pipe(Effect.provide(allServices))

        const result = yield* chatService
          .create({
            projectId: "non-existent-project",
            contextType: "general",
          })
          .pipe(Effect.flip)

        expect(result).toBeInstanceOf(NotFoundError)
        if (result._tag === "NotFoundError") {
          expect(result.entity).toBe("Project")
        }
      }) as Effect.Effect<void>,
    )

    it.scoped("supports all context types", () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql))

        const testLayer = Layer.succeed(SqlClient.SqlClient, sql)
        const allServices = Layer.mergeAll(
          ProjectServiceLive,
          ChatSessionServiceLive,
        ).pipe(Layer.provide(testLayer))

        const projectService = yield* ProjectService.pipe(Effect.provide(allServices))
        const chatService = yield* ChatSessionService.pipe(Effect.provide(allServices))

        const project = yield* projectService.create({
          name: "Test Project",
        })

        const contextTypes = ["sherpy-flow", "general", "scheduling", "planning"] as const

        for (const contextType of contextTypes) {
          const session = yield* chatService.create({
            projectId: project.id,
            contextType,
          })

          expect(session.contextType).toBe(contextType)
        }
      }) as Effect.Effect<void>,
    )
  })

  describe("addMessage", () => {
    it.scoped("appends a message to an empty session", () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql))

        const testLayer = Layer.succeed(SqlClient.SqlClient, sql)
        const allServices = Layer.mergeAll(
          ProjectServiceLive,
          ChatSessionServiceLive,
        ).pipe(Layer.provide(testLayer))

        const projectService = yield* ProjectService.pipe(Effect.provide(allServices))
        const chatService = yield* ChatSessionService.pipe(Effect.provide(allServices))

        const project = yield* projectService.create({
          name: "Test Project",
        })

        const session = yield* chatService.create({
          projectId: project.id,
          contextType: "general",
        })

        const updated = yield* chatService.addMessage({
          sessionId: session.id,
          role: "user",
          content: "Hello, AI!",
        })

        expect(updated.messages).toHaveLength(1)
        expect(updated.messages[0]?.role).toBe("user")
        expect(updated.messages[0]?.content).toBe("Hello, AI!")
        expect(updated.messages[0]?.timestamp).toBeDefined()
      }) as Effect.Effect<void>,
    )

    it.scoped("appends multiple messages in sequence", () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql))

        const testLayer = Layer.succeed(SqlClient.SqlClient, sql)
        const allServices = Layer.mergeAll(
          ProjectServiceLive,
          ChatSessionServiceLive,
        ).pipe(Layer.provide(testLayer))

        const projectService = yield* ProjectService.pipe(Effect.provide(allServices))
        const chatService = yield* ChatSessionService.pipe(Effect.provide(allServices))

        const project = yield* projectService.create({
          name: "Test Project",
        })

        const session = yield* chatService.create({
          projectId: project.id,
          contextType: "general",
        })

        yield* chatService.addMessage({
          sessionId: session.id,
          role: "user",
          content: "First message",
        })

        yield* chatService.addMessage({
          sessionId: session.id,
          role: "assistant",
          content: "Second message",
        })

        const updated = yield* chatService.addMessage({
          sessionId: session.id,
          role: "user",
          content: "Third message",
        })

        expect(updated.messages).toHaveLength(3)
        expect(updated.messages[0]?.content).toBe("First message")
        expect(updated.messages[1]?.content).toBe("Second message")
        expect(updated.messages[2]?.content).toBe("Third message")
      }) as Effect.Effect<void>,
    )

    it.scoped("supports both user and assistant roles", () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql))

        const testLayer = Layer.succeed(SqlClient.SqlClient, sql)
        const allServices = Layer.mergeAll(
          ProjectServiceLive,
          ChatSessionServiceLive,
        ).pipe(Layer.provide(testLayer))

        const projectService = yield* ProjectService.pipe(Effect.provide(allServices))
        const chatService = yield* ChatSessionService.pipe(Effect.provide(allServices))

        const project = yield* projectService.create({
          name: "Test Project",
        })

        const session = yield* chatService.create({
          projectId: project.id,
          contextType: "general",
        })

        yield* chatService.addMessage({
          sessionId: session.id,
          role: "user",
          content: "User message",
        })

        const updated = yield* chatService.addMessage({
          sessionId: session.id,
          role: "assistant",
          content: "Assistant response",
        })

        expect(updated.messages[0]?.role).toBe("user")
        expect(updated.messages[1]?.role).toBe("assistant")
      }) as Effect.Effect<void>,
    )

    it.scoped("fails when session does not exist", () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql))

        const testLayer = Layer.succeed(SqlClient.SqlClient, sql)
        const allServices = Layer.mergeAll(
          ProjectServiceLive,
          ChatSessionServiceLive,
        ).pipe(Layer.provide(testLayer))

        const chatService = yield* ChatSessionService.pipe(Effect.provide(allServices))

        const result = yield* chatService
          .addMessage({
            sessionId: "non-existent-session",
            role: "user",
            content: "Test",
          })
          .pipe(Effect.flip)

        expect(result).toBeInstanceOf(NotFoundError)
        expect(result.entity).toBe("ChatSession")
      }) as Effect.Effect<void>,
    )

    it.scoped("includes ISO 8601 timestamp", () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql))

        const testLayer = Layer.succeed(SqlClient.SqlClient, sql)
        const allServices = Layer.mergeAll(
          ProjectServiceLive,
          ChatSessionServiceLive,
        ).pipe(Layer.provide(testLayer))

        const projectService = yield* ProjectService.pipe(Effect.provide(allServices))
        const chatService = yield* ChatSessionService.pipe(Effect.provide(allServices))

        const project = yield* projectService.create({
          name: "Test Project",
        })

        const session = yield* chatService.create({
          projectId: project.id,
          contextType: "general",
        })

        const updated = yield* chatService.addMessage({
          sessionId: session.id,
          role: "user",
          content: "Test",
        })

        const timestamp = updated.messages[0]?.timestamp
        expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
      }) as Effect.Effect<void>,
    )
  })

  describe("getHistory", () => {
    it.scoped("retrieves full session with messages", () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql))

        const testLayer = Layer.succeed(SqlClient.SqlClient, sql)
        const allServices = Layer.mergeAll(
          ProjectServiceLive,
          ChatSessionServiceLive,
        ).pipe(Layer.provide(testLayer))

        const projectService = yield* ProjectService.pipe(Effect.provide(allServices))
        const chatService = yield* ChatSessionService.pipe(Effect.provide(allServices))

        const project = yield* projectService.create({
          name: "Test Project",
        })

        const session = yield* chatService.create({
          projectId: project.id,
          contextType: "planning",
        })

        yield* chatService.addMessage({
          sessionId: session.id,
          role: "user",
          content: "Message 1",
        })

        yield* chatService.addMessage({
          sessionId: session.id,
          role: "assistant",
          content: "Message 2",
        })

        const history = yield* chatService.getHistory(session.id)

        expect(history.id).toBe(session.id)
        expect(history.projectId).toBe(project.id)
        expect(history.messages).toHaveLength(2)
        expect(history.contextType).toBe("planning")
      }) as Effect.Effect<void>,
    )

    it.scoped("fails when session does not exist", () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql))

        const testLayer = Layer.succeed(SqlClient.SqlClient, sql)
        const allServices = Layer.mergeAll(
          ProjectServiceLive,
          ChatSessionServiceLive,
        ).pipe(Layer.provide(testLayer))

        const chatService = yield* ChatSessionService.pipe(Effect.provide(allServices))

        const result = yield* chatService
          .getHistory("non-existent-session")
          .pipe(Effect.flip)

        expect(result).toBeInstanceOf(NotFoundError)
        expect(result.entity).toBe("ChatSession")
      }) as Effect.Effect<void>,
    )

    it.scoped("returns empty messages array for new session", () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql))

        const testLayer = Layer.succeed(SqlClient.SqlClient, sql)
        const allServices = Layer.mergeAll(
          ProjectServiceLive,
          ChatSessionServiceLive,
        ).pipe(Layer.provide(testLayer))

        const projectService = yield* ProjectService.pipe(Effect.provide(allServices))
        const chatService = yield* ChatSessionService.pipe(Effect.provide(allServices))

        const project = yield* projectService.create({
          name: "Test Project",
        })

        const session = yield* chatService.create({
          projectId: project.id,
          contextType: "general",
        })

        const history = yield* chatService.getHistory(session.id)

        expect(history.messages).toEqual([])
      }) as Effect.Effect<void>,
    )
  })

  describe("listByProject", () => {
    it.scoped("returns all sessions for a project", () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql))

        const testLayer = Layer.succeed(SqlClient.SqlClient, sql)
        const allServices = Layer.mergeAll(
          ProjectServiceLive,
          ChatSessionServiceLive,
        ).pipe(Layer.provide(testLayer))

        const projectService = yield* ProjectService.pipe(Effect.provide(allServices))
        const chatService = yield* ChatSessionService.pipe(Effect.provide(allServices))

        const project = yield* projectService.create({
          name: "Test Project",
        })

        const session1 = yield* chatService.create({
          projectId: project.id,
          contextType: "sherpy-flow",
        })

        const session2 = yield* chatService.create({
          projectId: project.id,
          contextType: "planning",
        })

        const sessions = yield* chatService.listByProject(project.id)

        expect(sessions).toHaveLength(2)
        const ids = sessions.map((s) => s.id)
        expect(ids).toContain(session1.id)
        expect(ids).toContain(session2.id)
      }) as Effect.Effect<void>,
    )

    it.scoped("returns empty array when no sessions exist", () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql))

        const testLayer = Layer.succeed(SqlClient.SqlClient, sql)
        const allServices = Layer.mergeAll(
          ProjectServiceLive,
          ChatSessionServiceLive,
        ).pipe(Layer.provide(testLayer))

        const projectService = yield* ProjectService.pipe(Effect.provide(allServices))
        const chatService = yield* ChatSessionService.pipe(Effect.provide(allServices))

        const project = yield* projectService.create({
          name: "Test Project",
        })

        const sessions = yield* chatService.listByProject(project.id)

        expect(sessions).toEqual([])
      }) as Effect.Effect<void>,
    )

    it.scoped("orders sessions by most recent first", () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql))

        const testLayer = Layer.succeed(SqlClient.SqlClient, sql)
        const allServices = Layer.mergeAll(
          ProjectServiceLive,
          ChatSessionServiceLive,
        ).pipe(Layer.provide(testLayer))

        const projectService = yield* ProjectService.pipe(Effect.provide(allServices))
        const chatService = yield* ChatSessionService.pipe(Effect.provide(allServices))

        const project = yield* projectService.create({
          name: "Test Project",
        })

        // Create two sessions - session2 created after session1
        const session1 = yield* chatService.create({
          projectId: project.id,
          contextType: "general",
        })

        const session2 = yield* chatService.create({
          projectId: project.id,
          contextType: "planning",
        })

        const sessions = yield* chatService.listByProject(project.id)

        // session2 should be first because it was created/updated more recently
        expect(sessions[0]?.id).toBe(session2.id)
        expect(sessions[1]?.id).toBe(session1.id)
      }) as Effect.Effect<void>,
    )

    it.scoped("does not return sessions from other projects", () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql))

        const testLayer = Layer.succeed(SqlClient.SqlClient, sql)
        const allServices = Layer.mergeAll(
          ProjectServiceLive,
          ChatSessionServiceLive,
        ).pipe(Layer.provide(testLayer))

        const projectService = yield* ProjectService.pipe(Effect.provide(allServices))
        const chatService = yield* ChatSessionService.pipe(Effect.provide(allServices))

        const project1 = yield* projectService.create({
          name: "Test Project 1",
        })

        const project2 = yield* projectService.create({
          name: "Test Project 2",
        })

        yield* chatService.create({
          projectId: project1.id,
          contextType: "general",
        })

        yield* chatService.create({
          projectId: project2.id,
          contextType: "planning",
        })

        const sessions = yield* chatService.listByProject(project1.id)

        expect(sessions).toHaveLength(1)
        expect(sessions[0]?.projectId).toBe(project1.id)
      }) as Effect.Effect<void>,
    )
  })

  describe("delete", () => {
    it.scoped("deletes an existing session", () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql))

        const testLayer = Layer.succeed(SqlClient.SqlClient, sql)
        const allServices = Layer.mergeAll(
          ProjectServiceLive,
          ChatSessionServiceLive,
        ).pipe(Layer.provide(testLayer))

        const projectService = yield* ProjectService.pipe(Effect.provide(allServices))
        const chatService = yield* ChatSessionService.pipe(Effect.provide(allServices))

        const project = yield* projectService.create({
          name: "Test Project",
        })

        const session = yield* chatService.create({
          projectId: project.id,
          contextType: "general",
        })

        yield* chatService.delete(session.id)

        const result = yield* chatService.getHistory(session.id).pipe(Effect.flip)

        expect(result).toBeInstanceOf(NotFoundError)
      }) as Effect.Effect<void>,
    )

    it.scoped("fails when session does not exist", () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql))

        const testLayer = Layer.succeed(SqlClient.SqlClient, sql)
        const allServices = Layer.mergeAll(
          ProjectServiceLive,
          ChatSessionServiceLive,
        ).pipe(Layer.provide(testLayer))

        const chatService = yield* ChatSessionService.pipe(Effect.provide(allServices))

        const result = yield* chatService
          .delete("non-existent-session")
          .pipe(Effect.flip)

        expect(result).toBeInstanceOf(NotFoundError)
        expect(result.entity).toBe("ChatSession")
      }) as Effect.Effect<void>,
    )

    it.scoped("deletes session with messages", () =>
      Effect.gen(function* () {
        const sql = yield* makeTestDb
        yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql))

        const testLayer = Layer.succeed(SqlClient.SqlClient, sql)
        const allServices = Layer.mergeAll(
          ProjectServiceLive,
          ChatSessionServiceLive,
        ).pipe(Layer.provide(testLayer))

        const projectService = yield* ProjectService.pipe(Effect.provide(allServices))
        const chatService = yield* ChatSessionService.pipe(Effect.provide(allServices))

        const project = yield* projectService.create({
          name: "Test Project",
        })

        const session = yield* chatService.create({
          projectId: project.id,
          contextType: "general",
        })

        yield* chatService.addMessage({
          sessionId: session.id,
          role: "user",
          content: "Message to delete",
        })

        yield* chatService.delete(session.id)

        const result = yield* chatService.getHistory(session.id).pipe(Effect.flip)

        expect(result).toBeInstanceOf(NotFoundError)
      }) as Effect.Effect<void>,
    )
  })
})
