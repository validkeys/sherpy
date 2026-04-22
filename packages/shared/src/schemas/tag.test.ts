/**
 * Unit tests for Tag domain schema
 */

import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { Tag } from "./tag"

describe("Tag Schema", () => {
  describe("Tag model", () => {
    it.effect("creates valid tag", () =>
      Effect.gen(function* () {
        const tag = new Tag({
          id: "tag-123",
          name: "backend",
          color: "#3B82F6",
        })

        expect(tag.name).toBe("backend")
        expect(tag.color).toBe("#3B82F6")
      }),
    )

    it.effect("validates hex color pattern", () =>
      Effect.gen(function* () {
        const validColors = ["#000000", "#FFFFFF", "#3B82F6"]
        for (const color of validColors) {
          const tag = new Tag({
            id: "test-id",
            name: "test",
            color,
          })
          expect(tag.color).toBe(color)
        }

        // Invalid color
        const result = yield* Effect.try(() => {
          new Tag({
            id: "test-id",
            name: "test",
            color: "not-a-hex-color",
          })
        }).pipe(Effect.flip)
        expect(result).toBeDefined()
      }),
    )

    it.effect("handles optional color", () =>
      Effect.gen(function* () {
        const tag = new Tag({
          id: "test-id",
          name: "untagged",
          color: null,
        })
        expect(tag.color).toBeNull()
      }),
    )
  })
})
