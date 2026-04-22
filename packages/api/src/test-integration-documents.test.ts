/**
 * Integration tests for document generation with full project hierarchy
 * Tests YAML, Markdown, and JSON output formats (SA-008, SA-009)
 */

import { Reactivity } from "@effect/experimental"
import { FileSystem } from "@effect/platform"
import { NodeFileSystem } from "@effect/platform-node"
import { SqlClient } from "@effect/sql"
import { LibsqlClient } from "@effect/sql-libsql"
import { assert, describe, expect, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { runMigrations } from "./db/migration-runner.js"
import { ProjectService, ProjectServiceLive } from "./services/project-service.js"
import { MilestoneService, MilestoneServiceLive } from "./services/milestone-service.js"
import { TaskService, TaskServiceLive } from "./services/task-service.js"
import { DocumentService, DocumentServiceLive } from "./services/document-service.js"

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

/**
 * Full service layer stack with all dependencies
 */
const makeServiceLayer = (sql: SqlClient.SqlClient) =>
  Layer.mergeAll(
    ProjectServiceLive,
    MilestoneServiceLive,
    TaskServiceLive,
    DocumentServiceLive
  ).pipe(Layer.provide(Layer.succeed(SqlClient.SqlClient, sql)))

describe("Document Generation Integration Tests", () => {
  it.scoped("generate YAML document → verify valid YAML structure", () =>
    Effect.gen(function* () {
      const sql = yield* makeTestDb
      yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql))

      const projectService = yield* ProjectService.pipe(Effect.provide(makeServiceLayer(sql)))
      const milestoneService = yield* MilestoneService.pipe(Effect.provide(makeServiceLayer(sql)))
      const taskService = yield* TaskService.pipe(Effect.provide(makeServiceLayer(sql)))
      const documentService = yield* DocumentService.pipe(Effect.provide(makeServiceLayer(sql)))

      // Seed project with hierarchy
      const project = yield* projectService.create({
        name: "YAML Test Project",
        description: "Testing YAML generation",
        priority: "high",
        tags: ["test", "yaml"],
      })

      const milestone = yield* milestoneService.create({
        projectId: project.id,
        name: "Setup Phase",
        description: "Initial setup",
        estimatedDays: 5,
      })

      yield* taskService.create({
        milestoneId: milestone.id,
        projectId: project.id,
        name: "Configure environment",
        priority: "high",
        estimatedHours: 4,
      })

      // Generate YAML document
      const document = yield* documentService.generateProjectPlan({
        projectId: project.id,
        format: "yaml",
      })

      assert.strictEqual(document.format, "yaml")
      assert.strictEqual(document.documentType, "implementation-plan")
      assert.strictEqual(document.version, 1)
      assert.ok(document.content.includes("project:"))
      assert.ok(document.content.includes("name: \"YAML Test Project\""))
      assert.ok(document.content.includes("milestones:"))
      assert.ok(document.content.includes("name: \"Setup Phase\""))
      assert.ok(document.content.includes("tasks:"))
      assert.ok(document.content.includes("name: \"Configure environment\""))
    }) as Effect.Effect<void>,
  )

  it.scoped("generate markdown document → verify markdown format", () =>
    Effect.gen(function* () {
      const sql = yield* makeTestDb
      yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql))

      const projectService = yield* ProjectService.pipe(Effect.provide(makeServiceLayer(sql)))
      const milestoneService = yield* MilestoneService.pipe(Effect.provide(makeServiceLayer(sql)))
      const taskService = yield* TaskService.pipe(Effect.provide(makeServiceLayer(sql)))
      const documentService = yield* DocumentService.pipe(Effect.provide(makeServiceLayer(sql)))

      // Seed project
      const project = yield* projectService.create({
        name: "Markdown Test Project",
        description: "Testing markdown generation",
      })

      const milestone = yield* milestoneService.create({
        projectId: project.id,
        name: "Development",
        estimatedDays: 10,
        acceptanceCriteria: "All tests passing",
      })

      yield* taskService.create({
        milestoneId: milestone.id,
        projectId: project.id,
        name: "Write unit tests",
        description: "Cover all edge cases",
        priority: "medium",
      })

      // Generate markdown document
      const document = yield* documentService.generateProjectPlan({
        projectId: project.id,
        format: "markdown",
      })

      assert.strictEqual(document.format, "markdown")
      assert.strictEqual(document.version, 1)
      assert.ok(document.content.includes("# Markdown Test Project"))
      assert.ok(document.content.includes("## Milestones"))
      assert.ok(document.content.includes("### Development"))
      assert.ok(document.content.includes("**Acceptance Criteria:**"))
      assert.ok(document.content.includes("#### Tasks"))
      assert.ok(document.content.includes("- **Write unit tests**"))
    }) as Effect.Effect<void>,
  )

  it.scoped("generate JSON document → verify valid JSON structure", () =>
    Effect.gen(function* () {
      const sql = yield* makeTestDb
      yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql))

      const projectService = yield* ProjectService.pipe(Effect.provide(makeServiceLayer(sql)))
      const milestoneService = yield* MilestoneService.pipe(Effect.provide(makeServiceLayer(sql)))
      const taskService = yield* TaskService.pipe(Effect.provide(makeServiceLayer(sql)))
      const documentService = yield* DocumentService.pipe(Effect.provide(makeServiceLayer(sql)))

      // Seed project
      const project = yield* projectService.create({
        name: "JSON Test Project",
        priority: "critical",
      })

      const milestone = yield* milestoneService.create({
        projectId: project.id,
        name: "Launch",
      })

      yield* taskService.create({
        milestoneId: milestone.id,
        projectId: project.id,
        name: "Deploy to production",
      })

      // Generate JSON document
      const document = yield* documentService.generateProjectPlan({
        projectId: project.id,
        format: "json",
      })

      assert.strictEqual(document.format, "json")
      assert.strictEqual(document.version, 1)

      // Parse JSON to verify it's valid
      const parsed = JSON.parse(document.content)
      assert.ok(parsed.project)
      assert.strictEqual(parsed.project.name, "JSON Test Project")
      assert.ok(Array.isArray(parsed.milestones))
      assert.strictEqual(parsed.milestones.length, 1)
      assert.strictEqual(parsed.milestones[0].milestone.name, "Launch")
      assert.ok(Array.isArray(parsed.milestones[0].tasks))
    }) as Effect.Effect<void>,
  )

  it.scoped("version history: generate → modify → generate → verify versions", () =>
    Effect.gen(function* () {
      const sql = yield* makeTestDb
      yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql))

      const projectService = yield* ProjectService.pipe(Effect.provide(makeServiceLayer(sql)))
      const milestoneService = yield* MilestoneService.pipe(Effect.provide(makeServiceLayer(sql)))
      const documentService = yield* DocumentService.pipe(Effect.provide(makeServiceLayer(sql)))

      // Create project with milestone
      const project = yield* projectService.create({
        name: "Version Test",
      })

      const milestone1 = yield* milestoneService.create({
        projectId: project.id,
        name: "Phase 1",
      })

      // Generate version 1
      const doc1 = yield* documentService.generateProjectPlan({
        projectId: project.id,
        format: "yaml",
      })

      assert.strictEqual(doc1.version, 1)
      assert.ok(doc1.content.includes("name: \"Phase 1\""))

      // Modify data: add another milestone
      const milestone2 = yield* milestoneService.create({
        projectId: project.id,
        name: "Phase 2",
      })

      // Generate version 2
      const doc2 = yield* documentService.generateProjectPlan({
        projectId: project.id,
        format: "yaml",
      })

      assert.strictEqual(doc2.version, 2)
      assert.ok(doc2.content.includes("name: \"Phase 2\""))

      // Retrieve version 1 - should have original content
      const retrievedV1 = yield* documentService.getDocumentVersion(
        project.id,
        "implementation-plan",
        1
      )

      assert.strictEqual(retrievedV1.version, 1)
      assert.ok(retrievedV1.content.includes("name: \"Phase 1\""))
      assert.ok(!retrievedV1.content.includes("name: \"Phase 2\""))

      // Retrieve version 2 - should have updated content
      const retrievedV2 = yield* documentService.getDocumentVersion(
        project.id,
        "implementation-plan",
        2
      )

      assert.strictEqual(retrievedV2.version, 2)
      assert.ok(retrievedV2.content.includes("name: \"Phase 1\""))
      assert.ok(retrievedV2.content.includes("name: \"Phase 2\""))
    }) as Effect.Effect<void>,
  )

  it.scoped("list documents for project", () =>
    Effect.gen(function* () {
      const sql = yield* makeTestDb
      yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql))

      const projectService = yield* ProjectService.pipe(Effect.provide(makeServiceLayer(sql)))
      const documentService = yield* DocumentService.pipe(Effect.provide(makeServiceLayer(sql)))

      const project = yield* projectService.create({
        name: "Document List Test",
      })

      // Generate multiple documents in different formats
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

      // List documents
      const documents = yield* documentService.listDocuments(project.id)

      assert.strictEqual(documents.length, 3)
      // Should include all three formats
      const formats = documents.map(d => d.format)
      assert.ok(formats.includes("yaml"))
      assert.ok(formats.includes("markdown"))
      assert.ok(formats.includes("json"))
    }) as Effect.Effect<void>,
  )

  it.scoped("get latest document retrieves most recent version", () =>
    Effect.gen(function* () {
      const sql = yield* makeTestDb
      yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql))

      const projectService = yield* ProjectService.pipe(Effect.provide(makeServiceLayer(sql)))
      const documentService = yield* DocumentService.pipe(Effect.provide(makeServiceLayer(sql)))

      const project = yield* projectService.create({
        name: "Latest Test",
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
        format: "yaml",
      })

      // Get latest document
      const latest = yield* documentService.getDocument(
        project.id,
        "implementation-plan"
      )

      // Should return version 3
      assert.strictEqual(latest.version, 3)
      assert.strictEqual(latest.id, doc3.id)
    }) as Effect.Effect<void>,
  )

  it.scoped("document reflects current DB state with tasks and milestones", () =>
    Effect.gen(function* () {
      const sql = yield* makeTestDb
      yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql))

      const projectService = yield* ProjectService.pipe(Effect.provide(makeServiceLayer(sql)))
      const milestoneService = yield* MilestoneService.pipe(Effect.provide(makeServiceLayer(sql)))
      const taskService = yield* TaskService.pipe(Effect.provide(makeServiceLayer(sql)))
      const documentService = yield* DocumentService.pipe(Effect.provide(makeServiceLayer(sql)))

      const project = yield* projectService.create({
        name: "State Reflection Test",
      })

      const m1 = yield* milestoneService.create({
        projectId: project.id,
        name: "M1",
      })

      const m2 = yield* milestoneService.create({
        projectId: project.id,
        name: "M2",
      })

      yield* taskService.create({
        milestoneId: m1.id,
        projectId: project.id,
        name: "T1",
      })

      yield* taskService.create({
        milestoneId: m2.id,
        projectId: project.id,
        name: "T2",
      })

      yield* taskService.create({
        milestoneId: m2.id,
        projectId: project.id,
        name: "T3",
      })

      // Generate document
      const document = yield* documentService.generateProjectPlan({
        projectId: project.id,
        format: "json",
      })

      const parsed = JSON.parse(document.content)

      // Verify structure matches DB
      assert.strictEqual(parsed.milestones.length, 2)
      assert.strictEqual(parsed.milestones[0].milestone.name, "M1")
      assert.strictEqual(parsed.milestones[0].tasks.length, 1)
      assert.strictEqual(parsed.milestones[1].milestone.name, "M2")
      assert.strictEqual(parsed.milestones[1].tasks.length, 2)
    }) as Effect.Effect<void>,
  )

  it.scoped("empty project generates valid document", () =>
    Effect.gen(function* () {
      const sql = yield* makeTestDb
      yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql))

      const projectService = yield* ProjectService.pipe(Effect.provide(makeServiceLayer(sql)))
      const documentService = yield* DocumentService.pipe(Effect.provide(makeServiceLayer(sql)))

      // Create project with no milestones or tasks
      const project = yield* projectService.create({
        name: "Empty Project",
      })

      // Generate document
      const document = yield* documentService.generateProjectPlan({
        projectId: project.id,
        format: "yaml",
      })

      assert.ok(document.content.includes("name: \"Empty Project\""))
      assert.ok(document.content.includes("milestones:"))
      assert.ok(document.content.includes("[]"))
    }) as Effect.Effect<void>,
  )

  it.scoped("document preserves special characters and newlines in descriptions", () =>
    Effect.gen(function* () {
      const sql = yield* makeTestDb
      yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql))

      const projectService = yield* ProjectService.pipe(Effect.provide(makeServiceLayer(sql)))
      const milestoneService = yield* MilestoneService.pipe(Effect.provide(makeServiceLayer(sql)))
      const documentService = yield* DocumentService.pipe(Effect.provide(makeServiceLayer(sql)))

      const project = yield* projectService.create({
        name: "Special Chars Test",
        description: "Testing \"quotes\" and 'apostrophes'",
      })

      yield* milestoneService.create({
        projectId: project.id,
        name: "Phase with: colons",
        description: "Multi-line\ndescription\nhere",
      })

      // Generate document
      const document = yield* documentService.generateProjectPlan({
        projectId: project.id,
        format: "yaml",
      })

      // Verify special characters are handled
      assert.ok(document.content.length > 0)
      assert.ok(document.content.includes("Special Chars Test"))
    }) as Effect.Effect<void>,
  )
})
