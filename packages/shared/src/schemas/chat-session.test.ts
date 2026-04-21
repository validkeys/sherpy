/**
 * Unit tests for ChatSession domain schema
 */

import { describe, expect, it } from "@effect/vitest"
import { DateTime, Effect, Schema } from "effect"
import { ChatContextType, ChatMessage, ChatSession } from "./chat-session"

describe("ChatSession Schema", () => {
  describe("ChatMessage struct", () => {
    it.effect("validates chat message structure", () =>
      Effect.gen(function* () {
        const message = {
          role: "user" as const,
          content: "Hello, AI!",
          timestamp: "2026-04-21T10:00:00Z",
        }

        const decoded = yield* Schema.decodeUnknown(ChatMessage)(message)
        expect(decoded.role).toBe("user")
        expect(decoded.content).toBe("Hello, AI!")
      }),
    )
  })

  describe("ChatContextType enum", () => {
    it.effect("accepts valid context types", () =>
      Effect.gen(function* () {
        const types = ["sherpy-flow", "general", "scheduling", "planning"] as const
        for (const contextType of types) {
          const decoded = yield* Schema.decodeUnknown(ChatContextType)(contextType)
          expect(decoded).toBe(contextType)
        }
      }),
    )
  })

  describe("ChatSession model", () => {
    it.effect("creates valid chat session", () =>
      Effect.gen(function* () {
        const session = new ChatSession({
          id: "session-123",
          projectId: "proj-123",
          messages: [
            {
              role: "user" as const,
              content: "Start planning",
              timestamp: "2026-04-21T10:00:00Z",
            },
          ],
          contextType: "sherpy-flow" as const,
          createdAt: DateTime.unsafeMake(new Date()),
          updatedAt: DateTime.unsafeMake(new Date()),
        })

        expect(session.projectId).toBe("proj-123")
        expect(session.messages).toHaveLength(1)
        expect(session.contextType).toBe("sherpy-flow")
      }),
    )

    it.effect("handles empty message array", () =>
      Effect.gen(function* () {
        const session = new ChatSession({
          id: "test-id",
          projectId: "proj-123",
          messages: [],
          contextType: "general" as const,
          createdAt: DateTime.unsafeMake(new Date()),
          updatedAt: DateTime.unsafeMake(new Date()),
        })

        expect(session.messages).toEqual([])
      }),
    )
  })
})
