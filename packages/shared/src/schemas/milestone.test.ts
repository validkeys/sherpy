/**
 * Unit tests for Milestone domain schema
 */

import { describe, expect, it } from "@effect/vitest"
import { DateTime, Effect, Schema } from "effect"
import { Milestone, MilestoneStatus } from "./milestone"

describe("Milestone Schema", () => {
  describe("MilestoneStatus enum", () => {
    it.effect("accepts valid milestone statuses", () =>
      Effect.gen(function* () {
        const statuses = ["pending", "in-progress", "blocked", "complete"] as const
        for (const status of statuses) {
          const decoded = yield* Schema.decodeUnknown(MilestoneStatus)(status)
          expect(decoded).toBe(status)
        }
      }),
    )

    it.effect("rejects invalid status", () =>
      Effect.gen(function* () {
        const result = yield* Schema.decodeUnknown(MilestoneStatus)(
          "invalid",
        ).pipe(Effect.flip)
        expect(result).toBeDefined()
      }),
    )
  })

  describe("Milestone model", () => {
    it.effect("creates valid milestone", () =>
      Effect.gen(function* () {
        const milestone = new Milestone({
          id: "milestone-123",
          projectId: "proj-123",
          name: "M1: Foundation",
          description: "Setup base infrastructure",
          status: "pending" as const,
          orderIndex: 0,
          estimatedDays: 5,
          createdAt: DateTime.unsafeMake(new Date()),
          updatedAt: DateTime.unsafeMake(new Date()),
        })

        expect(milestone.projectId).toBe("proj-123")
        expect(milestone.name).toBe("M1: Foundation")
        expect(milestone.status).toBe("pending")
      }),
    )

    it.effect("validates orderIndex as non-negative integer", () =>
      Effect.gen(function* () {
        const validIndices = [0, 1, 10, 100]
        for (const orderIndex of validIndices) {
          const milestone = new Milestone({
            id: "test-id",
            projectId: "proj-123",
            name: "Test",
            status: "pending" as const,
            orderIndex,
            createdAt: DateTime.unsafeMake(new Date()),
            updatedAt: DateTime.unsafeMake(new Date()),
          })
          expect(milestone.orderIndex).toBe(orderIndex)
        }

        // Negative
        const negativeResult = yield* Effect.try(() => {
          new Milestone({
            id: "test-id",
            projectId: "proj-123",
            name: "Test",
            status: "pending" as const,
            orderIndex: -1,
            createdAt: DateTime.unsafeMake(new Date()),
            updatedAt: DateTime.unsafeMake(new Date()),
          })
        }).pipe(Effect.flip)
        expect(negativeResult).toBeDefined()
      }),
    )

    it.effect("handles optional fields", () =>
      Effect.gen(function* () {
        const minimal = new Milestone({
          id: "test-id",
          projectId: "proj-123",
          name: "Test",
          status: "pending" as const,
          orderIndex: 0,
          createdAt: DateTime.unsafeMake(new Date()),
          updatedAt: DateTime.unsafeMake(new Date()),
        })

        expect(minimal.description).toBeUndefined()
        expect(minimal.estimatedDays).toBeUndefined()
      }),
    )
  })
})
