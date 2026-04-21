/**
 * Unit tests for Task domain schema
 */

import { describe, expect, it } from "@effect/vitest"
import { DateTime, Effect, Schema } from "effect"
import { Task, TaskStatus } from "./task"

describe("Task Schema", () => {
  describe("TaskStatus enum", () => {
    it.effect("accepts valid task statuses", () =>
      Effect.gen(function* () {
        const statuses = ["pending", "in-progress", "blocked", "complete"] as const
        for (const status of statuses) {
          const decoded = yield* Schema.decodeUnknown(TaskStatus)(status)
          expect(decoded).toBe(status)
        }
      }),
    )
  })

  describe("Task model", () => {
    it.effect("creates valid task", () =>
      Effect.gen(function* () {
        const task = new Task({
          id: "task-123",
          milestoneId: "m-123",
          projectId: "proj-123",
          name: "Implement feature X",
          status: "pending" as const,
          priority: "high" as const,
          orderIndex: 0,
          createdAt: DateTime.unsafeMake(new Date()),
          updatedAt: DateTime.unsafeMake(new Date()),
        })

        expect(task.milestoneId).toBe("m-123")
        expect(task.name).toBe("Implement feature X")
        expect(task.priority).toBe("high")
      }),
    )

    it.effect("validates priority enum", () =>
      Effect.gen(function* () {
        const priorities = ["low", "medium", "high"] as const
        for (const priority of priorities) {
          const task = new Task({
            id: "test-id",
            milestoneId: "m-123",
            projectId: "proj-123",
            name: "Test",
            status: "pending" as const,
            priority,
            orderIndex: 0,
            createdAt: DateTime.unsafeMake(new Date()),
            updatedAt: DateTime.unsafeMake(new Date()),
          })
          expect(task.priority).toBe(priority)
        }
      }),
    )
  })
})
