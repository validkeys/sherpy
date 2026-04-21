/**
 * Unit tests for AvailabilityWindow domain schema
 */

import { describe, expect, it } from "@effect/vitest"
import { DateTime, Effect, Schema } from "effect"
import { AvailabilityType, AvailabilityWindow } from "./availability"

describe("AvailabilityWindow Schema", () => {
  describe("AvailabilityType enum", () => {
    it.effect("accepts valid availability types", () =>
      Effect.gen(function* () {
        const types = ["pto", "other-project", "training", "unavailable"] as const
        for (const type of types) {
          const decoded = yield* Schema.decodeUnknown(AvailabilityType)(type)
          expect(decoded).toBe(type)
        }
      }),
    )
  })

  describe("AvailabilityWindow model", () => {
    it.effect("creates valid window", () =>
      Effect.gen(function* () {
        const window = new AvailabilityWindow({
          id: "window-123",
          personId: "person-123",
          startDate: "2026-06-01",
          endDate: "2026-06-15",
          type: "pto" as const,
          createdAt: DateTime.unsafeMake(new Date()),
        })

        expect(window.personId).toBe("person-123")
        expect(window.type).toBe("pto")
      }),
    )

    it.effect("handles optional description", () =>
      Effect.gen(function* () {
        const withDesc = new AvailabilityWindow({
          id: "test-id",
          personId: "person-123",
          startDate: "2026-06-01",
          endDate: "2026-06-15",
          type: "other-project" as const,
          description: "Working on Project X",
          createdAt: DateTime.unsafeMake(new Date()),
        })
        expect(withDesc.description).toBe("Working on Project X")

        const withoutDesc = new AvailabilityWindow({
          id: "test-id",
          personId: "person-123",
          startDate: "2026-06-01",
          endDate: "2026-06-15",
          type: "unavailable" as const,
          createdAt: DateTime.unsafeMake(new Date()),
        })
        expect(withoutDesc.description).toBeUndefined()
      }),
    )
  })
})
