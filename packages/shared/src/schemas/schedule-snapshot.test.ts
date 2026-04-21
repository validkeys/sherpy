/**
 * Unit tests for ScheduleSnapshot domain schema
 */

import { describe, expect, it } from "@effect/vitest"
import { DateTime, Effect, Schema } from "effect"
import { ScheduleSnapshot, ScheduleSnapshotType } from "./schedule-snapshot"

describe("ScheduleSnapshot Schema", () => {
  describe("ScheduleSnapshotType enum", () => {
    it.effect("accepts valid snapshot types", () =>
      Effect.gen(function* () {
        const types = ["full", "scenario", "what-if"] as const
        for (const type of types) {
          const decoded = yield* Schema.decodeUnknown(ScheduleSnapshotType)(type)
          expect(decoded).toBe(type)
        }
      }),
    )
  })

  describe("ScheduleSnapshot model", () => {
    it.effect("creates valid snapshot", () =>
      Effect.gen(function* () {
        const snapshot = new ScheduleSnapshot({
          id: "snapshot-123",
          projectId: "proj-123",
          name: "Baseline Schedule",
          type: "full" as const,
          parameters: {
            targetDate: "2026-12-31",
          },
          result: {
            estimatedCompletion: "2026-11-15",
          },
          createdAt: DateTime.unsafeMake(new Date()),
        })

        expect(snapshot.projectId).toBe("proj-123")
        expect(snapshot.name).toBe("Baseline Schedule")
        expect(snapshot.type).toBe("full")
      }),
    )

    it.effect("handles empty parameters and result", () =>
      Effect.gen(function* () {
        const snapshot = new ScheduleSnapshot({
          id: "test-id",
          projectId: "proj-123",
          name: "Empty Snapshot",
          type: "full" as const,
          parameters: {},
          result: {},
          createdAt: DateTime.unsafeMake(new Date()),
        })

        expect(snapshot.parameters).toEqual({})
        expect(snapshot.result).toEqual({})
      }),
    )

    it.effect("handles optional reasoning", () =>
      Effect.gen(function* () {
        const withReasoning = new ScheduleSnapshot({
          id: "test-id",
          projectId: "proj-123",
          name: "Explained",
          type: "scenario" as const,
          parameters: {},
          result: {},
          reasoning: "Based on current capacity",
          createdAt: DateTime.unsafeMake(new Date()),
        })
        expect(withReasoning.reasoning).toBe("Based on current capacity")

        const withoutReasoning = new ScheduleSnapshot({
          id: "test-id",
          projectId: "proj-123",
          name: "Basic",
          type: "full" as const,
          parameters: {},
          result: {},
          createdAt: DateTime.unsafeMake(new Date()),
        })
        expect(withoutReasoning.reasoning).toBeUndefined()
      }),
    )
  })
})
