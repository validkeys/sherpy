/**
 * DocumentService tests using @effect/vitest with real SQLite (SA-008, SA-009)
 */

import { Reactivity } from "@effect/experimental"
import { FileSystem } from "@effect/platform"
import { NodeFileSystem } from "@effect/platform-node"
import { SqlClient } from "@effect/sql"
import { LibsqlClient } from "@effect/sql-libsql"
import { assert, describe, expect, it } from "@effect/vitest"
import { Effect, Either, Layer } from "effect"
import { runMigrations } from "../db/migration-runner.js"
import {
  DocumentService,
  DocumentServiceLive,
  type GenerateProjectPlanInput,
} from "./document-service.js"
import {
  ProjectService,
  ProjectServiceLive,
} from "./project-service.js"
import {
  MilestoneService,
  MilestoneServiceLive,
} from "./milestone-service.js"
import {
  TaskService,
  TaskServiceLive,
} from "./task-service.js"
import { Document, NotFoundError, ValidationError } from "@sherpy/shared"

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

describe("DocumentService", () => {
  it.scoped("generateProjectPlan - creates YAML document", () =>
    Effect.gen(function* () {
      const sql = yield* makeTestDb
      yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql))

      const testLayer = Layer.succeed(SqlClient.SqlClient, sql)
      const allServices = Layer.mergeAll(
        ProjectServiceLive,
        MilestoneServiceLive,
        TaskServiceLive,
        DocumentServiceLive,
      ).pipe(Layer.provide(testLayer))

      const documentService = yield* DocumentService.pipe(Effect.provide(allServices))
      const projectService = yield* ProjectService.pipe(Effect.provide(allServices))
      const milestoneService = yield* MilestoneService.pipe(Effect.provide(allServices))
      const taskService = yield* TaskService.pipe(Effect.provide(allServices))

      // Create test data
      const project = yield* projectService.create({
        name: "Test Project",
        description: "A test project for document generation",
        tags: ["backend", "api"],
        priority: "high",
      })

      const m1 = yield* milestoneService.create({
        projectId: project.id,
        name: "Milestone 1",
        description: "First milestone",
        estimatedDays: 5,
        acceptanceCriteria: "All tests pass",
      })

      const m2 = yield* milestoneService.create({
        projectId: project.id,
        name: "Milestone 2",
        description: "Second milestone",
        estimatedDays: 3,
      })

      yield* taskService.create({
        projectId: project.id,
        milestoneId: m1.id,
        name: "Task 1.1",
        description: "First task of M1",
        priority: "high",
        estimatedHours: 4,
      })

      yield* taskService.create({
        projectId: project.id,
        milestoneId: m1.id,
        name: "Task 1.2",
        description: "Second task of M1",
        priority: "medium",
        estimatedHours: 2,
      })

      yield* taskService.create({
        projectId: project.id,
        milestoneId: m2.id,
        name: "Task 2.1",
        description: "First task of M2",
        priority: "low",
        estimatedHours: 6,
      })

      const input: typeof GenerateProjectPlanInput.Type = {
        projectId: project.id,
        format: "yaml",
      }

      const document = yield* documentService.generateProjectPlan(input)

      assert.strictEqual(document.projectId, project.id)
      assert.strictEqual(document.documentType, "implementation-plan")
      assert.strictEqual(document.format, "yaml")
      assert.strictEqual(document.version, 1)
      assert.match(document.id, /^[0-9a-f-]{36}$/)

      // Check YAML content structure
      assert.include(document.content, "project:")
      assert.include(document.content, `name: "${project.name}"`)
      assert.include(document.content, "milestones:")
      assert.include(document.content, "Milestone 1")
      assert.include(document.content, "Milestone 2")
      assert.include(document.content, "Task 1.1")
      assert.include(document.content, "Task 2.1")
    }) as Effect.Effect<void>,
  )

  it.scoped("generateProjectPlan - creates Markdown document", () =>
    Effect.gen(function* () {
      const sql = yield* makeTestDb
      yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql))

      const testLayer = Layer.succeed(SqlClient.SqlClient, sql)
      const allServices = Layer.mergeAll(
        ProjectServiceLive,
        MilestoneServiceLive,
        TaskServiceLive,
        DocumentServiceLive,
      ).pipe(Layer.provide(testLayer))

      const documentService = yield* DocumentService.pipe(Effect.provide(allServices))
      const projectService = yield* ProjectService.pipe(Effect.provide(allServices))
      const milestoneService = yield* MilestoneService.pipe(Effect.provide(allServices))
      const taskService = yield* TaskService.pipe(Effect.provide(allServices))

      // Create test data
      const project = yield* projectService.create({
        name: "Test Project",
        description: "A test project for document generation",
        tags: ["backend", "api"],
        priority: "high",
      })

      const m1 = yield* milestoneService.create({
        projectId: project.id,
        name: "Milestone 1",
        description: "First milestone",
        estimatedDays: 5,
        acceptanceCriteria: "All tests pass",
      })

      yield* milestoneService.create({
        projectId: project.id,
        name: "Milestone 2",
        description: "Second milestone",
        estimatedDays: 3,
      })

      yield* taskService.create({
        projectId: project.id,
        milestoneId: m1.id,
        name: "Task 1.1",
        description: "First task of M1",
        priority: "high",
        estimatedHours: 4,
      })

      const input: typeof GenerateProjectPlanInput.Type = {
        projectId: project.id,
        format: "markdown",
      }

      const document = yield* documentService.generateProjectPlan(input)

      assert.strictEqual(document.projectId, project.id)
      assert.strictEqual(document.documentType, "implementation-plan")
      assert.strictEqual(document.format, "markdown")
      assert.strictEqual(document.version, 1)

      // Check Markdown content structure
      assert.include(document.content, `# ${project.name}`)
      assert.include(document.content, "## Description")
      assert.include(document.content, "## Tags")
      assert.include(document.content, "## Milestones")
      assert.include(document.content, "### Milestone 1")
      assert.include(document.content, "### Milestone 2")
      assert.include(document.content, "#### Tasks")
      assert.include(document.content, "**Task 1.1**")
    }) as Effect.Effect<void>,
  )

  it.scoped("generateProjectPlan - creates JSON document", () =>
    Effect.gen(function* () {
      const sql = yield* makeTestDb
      yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql))

      const testLayer = Layer.succeed(SqlClient.SqlClient, sql)
      const allServices = Layer.mergeAll(
        ProjectServiceLive,
        MilestoneServiceLive,
        TaskServiceLive,
        DocumentServiceLive,
      ).pipe(Layer.provide(testLayer))

      const documentService = yield* DocumentService.pipe(Effect.provide(allServices))
      const projectService = yield* ProjectService.pipe(Effect.provide(allServices))
      const milestoneService = yield* MilestoneService.pipe(Effect.provide(allServices))
      const taskService = yield* TaskService.pipe(Effect.provide(allServices))

      // Create test data
      const project = yield* projectService.create({
        name: "Test Project",
        description: "A test project for document generation",
        tags: ["backend", "api"],
        priority: "high",
      })

      const m1 = yield* milestoneService.create({
        projectId: project.id,
        name: "Milestone 1",
        description: "First milestone",
        estimatedDays: 5,
      })

      const m2 = yield* milestoneService.create({
        projectId: project.id,
        name: "Milestone 2",
        description: "Second milestone",
        estimatedDays: 3,
      })

      yield* taskService.create({
        projectId: project.id,
        milestoneId: m1.id,
        name: "Task 1.1",
        description: "First task of M1",
        priority: "high",
        estimatedHours: 4,
      })

      yield* taskService.create({
        projectId: project.id,
        milestoneId: m1.id,
        name: "Task 1.2",
        description: "Second task of M1",
        priority: "medium",
        estimatedHours: 2,
      })

      yield* taskService.create({
        projectId: project.id,
        milestoneId: m2.id,
        name: "Task 2.1",
        description: "First task of M2",
        priority: "low",
        estimatedHours: 6,
      })

      const input: typeof GenerateProjectPlanInput.Type = {
        projectId: project.id,
        format: "json",
      }

      const document = yield* documentService.generateProjectPlan(input)

      assert.strictEqual(document.projectId, project.id)
      assert.strictEqual(document.documentType, "implementation-plan")
      assert.strictEqual(document.format, "json")
      assert.strictEqual(document.version, 1)

      // Parse JSON to verify structure
      const parsed = JSON.parse(document.content)
      assert.strictEqual(parsed.project.id, project.id)
      assert.strictEqual(parsed.project.name, "Test Project")
      assert.strictEqual(parsed.milestones.length, 2)
      assert.strictEqual(parsed.milestones[0].milestone.name, "Milestone 1")
      assert.strictEqual(parsed.milestones[0].tasks.length, 2)
      assert.strictEqual(parsed.milestones[1].tasks.length, 1)
    }) as Effect.Effect<void>,
  )

  it.scoped("generateProjectPlan - increments version on regeneration", () =>
    Effect.gen(function* () {
      const sql = yield* makeTestDb
      yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql))

      const testLayer = Layer.succeed(SqlClient.SqlClient, sql)
      const allServices = Layer.mergeAll(
        ProjectServiceLive,
        MilestoneServiceLive,
        TaskServiceLive,
        DocumentServiceLive,
      ).pipe(Layer.provide(testLayer))

      const documentService = yield* DocumentService.pipe(Effect.provide(allServices))
      const projectService = yield* ProjectService.pipe(Effect.provide(allServices))

      const project = yield* projectService.create({
        name: "Test Project",
        description: "A test project",
      })

      // Generate first document
      const doc1 = yield* documentService.generateProjectPlan({
        projectId: project.id,
        format: "yaml",
      })

      assert.strictEqual(doc1.version, 1)

      // Generate second document
      const doc2 = yield* documentService.generateProjectPlan({
        projectId: project.id,
        format: "yaml",
      })

      assert.strictEqual(doc2.version, 2)
      assert.notStrictEqual(doc1.id, doc2.id)

      // Generate third document with different format
      const doc3 = yield* documentService.generateProjectPlan({
        projectId: project.id,
        format: "json",
      })

      assert.strictEqual(doc3.version, 3)
    }) as Effect.Effect<void>,
  )

  it.scoped("generateProjectPlan - reflects current DB state", () =>
    Effect.gen(function* () {
      const sql = yield* makeTestDb
      yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql))

      const testLayer = Layer.succeed(SqlClient.SqlClient, sql)
      const allServices = Layer.mergeAll(
        ProjectServiceLive,
        MilestoneServiceLive,
        TaskServiceLive,
        DocumentServiceLive,
      ).pipe(Layer.provide(testLayer))

      const documentService = yield* DocumentService.pipe(Effect.provide(allServices))
      const projectService = yield* ProjectService.pipe(Effect.provide(allServices))
      const milestoneService = yield* MilestoneService.pipe(Effect.provide(allServices))

      const project = yield* projectService.create({
        name: "Test Project",
        description: "A test project",
      })

      const m1 = yield* milestoneService.create({
        projectId: project.id,
        name: "Milestone 1",
        description: "First milestone",
      })

      // Generate first document
      const doc1 = yield* documentService.generateProjectPlan({
        projectId: project.id,
        format: "json",
      })

      const parsed1 = JSON.parse(doc1.content)
      assert.strictEqual(parsed1.milestones[0].milestone.name, "Milestone 1")

      // Update milestone in DB
      yield* milestoneService.update(m1.id, {
        name: "Updated Milestone 1",
      })

      // Generate second document - should reflect the update
      const doc2 = yield* documentService.generateProjectPlan({
        projectId: project.id,
        format: "json",
      })

      const parsed2 = JSON.parse(doc2.content)
      assert.strictEqual(parsed2.milestones[0].milestone.name, "Updated Milestone 1")
      assert.strictEqual(doc2.version, 2)
    }) as Effect.Effect<void>,
  )

  it.scoped("generateProjectPlan - fails for non-existent project", () =>
    Effect.gen(function* () {
      const sql = yield* makeTestDb
      yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql))

      const testLayer = Layer.succeed(SqlClient.SqlClient, sql)
      const allServices = Layer.mergeAll(
        ProjectServiceLive,
        MilestoneServiceLive,
        TaskServiceLive,
        DocumentServiceLive,
      ).pipe(Layer.provide(testLayer))

      const documentService = yield* DocumentService.pipe(Effect.provide(allServices))

      const result = yield* Effect.either(
        documentService.generateProjectPlan({
          projectId: "non-existent-id",
          format: "yaml",
        }),
      )

      assert.isTrue(Either.isLeft(result))
      if (Either.isLeft(result)) {
        assert.instanceOf(result.left, NotFoundError)
        assert.include(result.left.message, "not found")
      }
    }) as Effect.Effect<void>,
  )

  it.scoped("getDocument - returns latest version", () =>
    Effect.gen(function* () {
      const sql = yield* makeTestDb
      yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql))

      const testLayer = Layer.succeed(SqlClient.SqlClient, sql)
      const allServices = Layer.mergeAll(
        ProjectServiceLive,
        MilestoneServiceLive,
        TaskServiceLive,
        DocumentServiceLive,
      ).pipe(Layer.provide(testLayer))

      const documentService = yield* DocumentService.pipe(Effect.provide(allServices))
      const projectService = yield* ProjectService.pipe(Effect.provide(allServices))

      const project = yield* projectService.create({
        name: "Test Project",
        description: "A test project",
      })

      // Generate multiple versions
      yield* documentService.generateProjectPlan({
        projectId: project.id,
        format: "yaml",
      })

      yield* documentService.generateProjectPlan({
        projectId: project.id,
        format: "yaml",
      })

      const doc3 = yield* documentService.generateProjectPlan({
        projectId: project.id,
        format: "json",
      })

      // Get latest document
      const latest = yield* documentService.getDocument(project.id, "implementation-plan")

      assert.strictEqual(latest.id, doc3.id)
      assert.strictEqual(latest.version, 3)
      assert.strictEqual(latest.format, "json")
    }) as Effect.Effect<void>,
  )

  it.scoped("getDocument - fails for non-existent document type", () =>
    Effect.gen(function* () {
      const sql = yield* makeTestDb
      yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql))

      const testLayer = Layer.succeed(SqlClient.SqlClient, sql)
      const allServices = Layer.mergeAll(
        ProjectServiceLive,
        MilestoneServiceLive,
        TaskServiceLive,
        DocumentServiceLive,
      ).pipe(Layer.provide(testLayer))

      const documentService = yield* DocumentService.pipe(Effect.provide(allServices))
      const projectService = yield* ProjectService.pipe(Effect.provide(allServices))

      const project = yield* projectService.create({
        name: "Test Project",
        description: "A test project",
      })

      const result = yield* Effect.either(
        documentService.getDocument(project.id, "qa-test-plan"),
      )

      assert.isTrue(Either.isLeft(result))
      if (Either.isLeft(result)) {
        assert.instanceOf(result.left, NotFoundError)
        assert.include(result.left.message, "not found")
      }
    }) as Effect.Effect<void>,
  )

  it.scoped("listDocuments - returns all documents for project", () =>
    Effect.gen(function* () {
      const sql = yield* makeTestDb
      yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql))

      const testLayer = Layer.succeed(SqlClient.SqlClient, sql)
      const allServices = Layer.mergeAll(
        ProjectServiceLive,
        MilestoneServiceLive,
        TaskServiceLive,
        DocumentServiceLive,
      ).pipe(Layer.provide(testLayer))

      const documentService = yield* DocumentService.pipe(Effect.provide(allServices))
      const projectService = yield* ProjectService.pipe(Effect.provide(allServices))

      const project = yield* projectService.create({
        name: "Test Project",
        description: "A test project",
      })

      // Generate multiple documents
      yield* documentService.generateProjectPlan({
        projectId: project.id,
        format: "yaml",
      })

      yield* documentService.generateProjectPlan({
        projectId: project.id,
        format: "markdown",
      })

      yield* documentService.generateProjectPlan({
        projectId: project.id,
        format: "json",
      })

      const documents = yield* documentService.listDocuments(project.id)

      assert.strictEqual(documents.length, 3)
      // Should be ordered by created_at DESC
      assert.strictEqual(documents[0]!.version, 3)
      assert.strictEqual(documents[1]!.version, 2)
      assert.strictEqual(documents[2]!.version, 1)
    }) as Effect.Effect<void>,
  )

  it.scoped("listDocuments - returns empty array for project with no documents", () =>
    Effect.gen(function* () {
      const sql = yield* makeTestDb
      yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql))

      const testLayer = Layer.succeed(SqlClient.SqlClient, sql)
      const allServices = Layer.mergeAll(
        ProjectServiceLive,
        MilestoneServiceLive,
        TaskServiceLive,
        DocumentServiceLive,
      ).pipe(Layer.provide(testLayer))

      const documentService = yield* DocumentService.pipe(Effect.provide(allServices))
      const projectService = yield* ProjectService.pipe(Effect.provide(allServices))

      const project = yield* projectService.create({
        name: "Test Project",
        description: "A test project",
      })

      const documents = yield* documentService.listDocuments(project.id)

      assert.strictEqual(documents.length, 0)
    }) as Effect.Effect<void>,
  )

  it.scoped("getDocumentVersion - returns specific version", () =>
    Effect.gen(function* () {
      const sql = yield* makeTestDb
      yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql))

      const testLayer = Layer.succeed(SqlClient.SqlClient, sql)
      const allServices = Layer.mergeAll(
        ProjectServiceLive,
        MilestoneServiceLive,
        TaskServiceLive,
        DocumentServiceLive,
      ).pipe(Layer.provide(testLayer))

      const documentService = yield* DocumentService.pipe(Effect.provide(allServices))
      const projectService = yield* ProjectService.pipe(Effect.provide(allServices))

      const project = yield* projectService.create({
        name: "Test Project",
        description: "A test project",
      })

      // Generate multiple versions
      const doc1 = yield* documentService.generateProjectPlan({
        projectId: project.id,
        format: "yaml",
      })

      const doc2 = yield* documentService.generateProjectPlan({
        projectId: project.id,
        format: "markdown",
      })

      // Fetch specific versions
      const v1 = yield* documentService.getDocumentVersion(
        project.id,
        "implementation-plan",
        1,
      )

      const v2 = yield* documentService.getDocumentVersion(
        project.id,
        "implementation-plan",
        2,
      )

      assert.strictEqual(v1.id, doc1.id)
      assert.strictEqual(v1.version, 1)
      assert.strictEqual(v1.format, "yaml")

      assert.strictEqual(v2.id, doc2.id)
      assert.strictEqual(v2.version, 2)
      assert.strictEqual(v2.format, "markdown")
    }) as Effect.Effect<void>,
  )

  it.scoped("getDocumentVersion - fails for non-existent version", () =>
    Effect.gen(function* () {
      const sql = yield* makeTestDb
      yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql))

      const testLayer = Layer.succeed(SqlClient.SqlClient, sql)
      const allServices = Layer.mergeAll(
        ProjectServiceLive,
        MilestoneServiceLive,
        TaskServiceLive,
        DocumentServiceLive,
      ).pipe(Layer.provide(testLayer))

      const documentService = yield* DocumentService.pipe(Effect.provide(allServices))
      const projectService = yield* ProjectService.pipe(Effect.provide(allServices))

      const project = yield* projectService.create({
        name: "Test Project",
        description: "A test project",
      })

      // Generate one document
      yield* documentService.generateProjectPlan({
        projectId: project.id,
        format: "yaml",
      })

      // Try to fetch non-existent version
      const result = yield* Effect.either(
        documentService.getDocumentVersion(project.id, "implementation-plan", 99),
      )

      assert.isTrue(Either.isLeft(result))
      if (Either.isLeft(result)) {
        assert.instanceOf(result.left, NotFoundError)
        assert.include(result.left.message, "version 99")
      }
    }) as Effect.Effect<void>,
  )

  it.scoped("generateProjectPlan - handles empty project (no milestones)", () =>
    Effect.gen(function* () {
      const sql = yield* makeTestDb
      yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql))

      const testLayer = Layer.succeed(SqlClient.SqlClient, sql)
      const allServices = Layer.mergeAll(
        ProjectServiceLive,
        MilestoneServiceLive,
        TaskServiceLive,
        DocumentServiceLive,
      ).pipe(Layer.provide(testLayer))

      const documentService = yield* DocumentService.pipe(Effect.provide(allServices))
      const projectService = yield* ProjectService.pipe(Effect.provide(allServices))

      // Create project without milestones
      const project = yield* projectService.create({
        name: "Empty Project",
        description: "No milestones or tasks",
      })

      const document = yield* documentService.generateProjectPlan({
        projectId: project.id,
        format: "yaml",
      })

      assert.strictEqual(document.version, 1)
      assert.include(document.content, "milestones:")
      assert.include(document.content, "[]")
    }) as Effect.Effect<void>,
  )
})
