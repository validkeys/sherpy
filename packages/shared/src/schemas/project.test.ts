/**
 * Unit tests for Project domain schema
 */

import { describe, expect, it } from "@effect/vitest"
import { DateTime, Effect, Schema } from "effect"
import { PipelineStatus, Priority, Project } from "./project"

describe("Project Schema", () => {
  describe("PipelineStatus enum", () => {
    it.effect("accepts valid pipeline statuses", () =>
      Effect.gen(function* () {
        const validStatuses = [
          "intake",
          "gap-analysis",
          "business-requirements",
          "technical-requirements",
          "style-anchors",
          "implementation-planning",
          "plan-review",
          "architecture-decisions",
          "delivery-timeline",
          "qa-test-plan",
          "summaries",
          "active-development",
          "completed",
          "archived",
        ] as const

        for (const status of validStatuses) {
          const decoded = yield* Schema.decodeUnknown(PipelineStatus)(status)
          expect(decoded).toBe(status)
        }
      }),
    )

    it.effect("rejects invalid pipeline status", () =>
      Effect.gen(function* () {
        const result = yield* Schema.decodeUnknown(PipelineStatus)(
          "invalid-status",
        ).pipe(Effect.flip)
        expect(result).toBeDefined()
      }),
    )
  })

  describe("Priority enum", () => {
    it.effect("accepts valid priorities", () =>
      Effect.gen(function* () {
        const priorities = ["low", "medium", "high", "critical"] as const
        for (const priority of priorities) {
          const decoded = yield* Schema.decodeUnknown(Priority)(priority)
          expect(decoded).toBe(priority)
        }
      }),
    )

    it.effect("rejects invalid priority", () =>
      Effect.gen(function* () {
        const result = yield* Schema.decodeUnknown(Priority)("ultra").pipe(
          Effect.flip,
        )
        expect(result).toBeDefined()
      }),
    )
  })

  describe("Project model", () => {
    it.effect("creates valid project", () =>
      Effect.gen(function* () {
        const project = new Project({
          id: "proj-123",
          slug: "test-project",
          name: "Test Project",
          description: "A test project",
          pipelineStatus: "intake" as const,
          assignedPeople: ["person-1", "person-2"],
          tags: ["backend", "api"],
          priority: "high" as const,
          createdAt: DateTime.unsafeMake(new Date()),
          updatedAt: DateTime.unsafeMake(new Date()),
        })

        expect(project.slug).toBe("test-project")
        expect(project.name).toBe("Test Project")
        expect(project.pipelineStatus).toBe("intake")
        expect(project.priority).toBe("high")
      }),
    )

    it.effect("validates slug pattern", () =>
      Effect.gen(function* () {
        const validSlugs = ["simple", "with-dash", "project123"]

        for (const slug of validSlugs) {
          const project = new Project({
            id: "test-id",
            slug,
            name: "Test",
            pipelineStatus: "intake" as const,
            assignedPeople: [],
            tags: [],
            priority: "low" as const,
            createdAt: DateTime.unsafeMake(new Date()),
            updatedAt: DateTime.unsafeMake(new Date()),
          })
          expect(project.slug).toBe(slug)
        }

        // Invalid slugs
        const invalidSlugs = ["Has Spaces", "hasCapitals", "has_underscore"]
        for (const slug of invalidSlugs) {
          const result = yield* Effect.try(() => {
            new Project({
              id: "test-id",
              slug,
              name: "Test",
              pipelineStatus: "intake" as const,
              assignedPeople: [],
              tags: [],
              priority: "low" as const,
              createdAt: DateTime.unsafeMake(new Date()),
              updatedAt: DateTime.unsafeMake(new Date()),
            })
          }).pipe(Effect.flip)
          expect(result).toBeDefined()
        }
      }),
    )

    it.effect("validates name length", () =>
      Effect.gen(function* () {
        // Too short
        const minResult = yield* Effect.try(() => {
          new Project({
            id: "test-id",
            slug: "test",
            name: "",
            pipelineStatus: "intake" as const,
            assignedPeople: [],
            tags: [],
            priority: "low" as const,
            createdAt: DateTime.unsafeMake(new Date()),
            updatedAt: DateTime.unsafeMake(new Date()),
          })
        }).pipe(Effect.flip)
        expect(minResult).toBeDefined()

        // Too long
        const maxResult = yield* Effect.try(() => {
          new Project({
            id: "test-id",
            slug: "test",
            name: "a".repeat(256),
            pipelineStatus: "intake" as const,
            assignedPeople: [],
            tags: [],
            priority: "low" as const,
            createdAt: DateTime.unsafeMake(new Date()),
            updatedAt: DateTime.unsafeMake(new Date()),
          })
        }).pipe(Effect.flip)
        expect(maxResult).toBeDefined()
      }),
    )

    it.effect("handles optional description", () =>
      Effect.gen(function* () {
        const withDesc = new Project({
          id: "test-id",
          slug: "test",
          name: "Test",
          description: "Has description",
          pipelineStatus: "intake" as const,
          assignedPeople: [],
          tags: [],
          priority: "low" as const,
          createdAt: DateTime.unsafeMake(new Date()),
          updatedAt: DateTime.unsafeMake(new Date()),
        })
        expect(withDesc.description).toBe("Has description")

        const withoutDesc = new Project({
          id: "test-id",
          slug: "test",
          name: "Test",
          pipelineStatus: "intake" as const,
          assignedPeople: [],
          tags: [],
          priority: "low" as const,
          createdAt: DateTime.unsafeMake(new Date()),
          updatedAt: DateTime.unsafeMake(new Date()),
        })
        expect(withoutDesc.description).toBeUndefined()
      }),
    )
  })
})
