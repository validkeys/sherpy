/**
 * WebSocket endpoint tests
 * Tests WebSocket connection lifecycle, authentication, and event broadcasting
 */

import { Effect, Layer, Context, Ref } from "effect"
import { describe, it, expect } from "@effect/vitest"
import { EventBroadcaster, WebSocketService } from "./websocket.js"
import { AuthService, OktaClaims } from "../auth/jwks-cache.js"
import { UnauthorizedError } from "../errors/auth.js"
import { WsEvent, ChatMessageEvent } from "@sherpy/shared"

// Mock AuthService for tests
const MockAuthServiceLive = Layer.succeed(AuthService, {
  getJwks: () => Effect.succeed({ keys: [] }),
  validateToken: (token: string) =>
    Effect.gen(function* () {
      if (token === "valid-token") {
        return new OktaClaims({
          sub: "user123",
          email: "test@example.com",
          name: "Test User",
        })
      }
      return yield* Effect.fail(
        new UnauthorizedError({ message: "Invalid token" })
      )
    }),
})

// Mock WebSocket connection for testing
interface MockWebSocket {
  id: string
  messages: string[]
  closed: boolean
  send: (data: string) => Effect.Effect<void>
  close: () => Effect.Effect<void>
}

const createMockWebSocket = (id: string): MockWebSocket => {
  const messages: string[] = []
  return {
    id,
    messages,
    closed: false,
    send: (data: string) =>
      Effect.sync(() => {
        messages.push(data)
      }),
    close: () =>
      Effect.sync(() => {
        messages.length = 0
      }),
  }
}

describe("EventBroadcaster", () => {
  it.effect("broadcasts event to all connected clients", () =>
    Effect.gen(function* () {
      const broadcaster = yield* EventBroadcaster
      const client1 = createMockWebSocket("client1")
      const client2 = createMockWebSocket("client2")

      // Add clients to connection pool
      yield* broadcaster.addConnection(client1)
      yield* broadcaster.addConnection(client2)

      // Broadcast an event
      const event: ChatMessageEvent = {
        type: "chat.message",
        timestamp: new Date().toISOString(),
        projectId: "project-1",
        sessionId: "session-1",
        role: "user",
        content: "Hello",
      }

      yield* broadcaster.broadcast(event)

      // Both clients should receive the message
      expect(client1.messages.length).toBe(1)
      expect(client2.messages.length).toBe(1)

      // Parse and verify the message content
      const msg1 = JSON.parse(client1.messages[0]!)
      expect(msg1.type).toBe("chat.message")
      expect(msg1.content).toBe("Hello")
    }).pipe(Effect.provide(EventBroadcaster.Default))
  )

  it.effect("removes disconnected clients from pool", () =>
    Effect.gen(function* () {
      const broadcaster = yield* EventBroadcaster
      const client1 = createMockWebSocket("client1")
      const client2 = createMockWebSocket("client2")

      // Add both clients
      yield* broadcaster.addConnection(client1)
      yield* broadcaster.addConnection(client2)

      // Remove client1
      yield* broadcaster.removeConnection(client1)

      // Broadcast an event
      const event: ChatMessageEvent = {
        type: "chat.message",
        timestamp: new Date().toISOString(),
        projectId: "project-1",
        sessionId: "session-1",
        role: "assistant",
        content: "World",
      }

      yield* broadcaster.broadcast(event)

      // Only client2 should receive the message
      expect(client1.messages.length).toBe(0)
      expect(client2.messages.length).toBe(1)
    }).pipe(Effect.provide(EventBroadcaster.Default))
  )

  it.effect("handles empty connection pool gracefully", () =>
    Effect.gen(function* () {
      const broadcaster = yield* EventBroadcaster

      const event: ChatMessageEvent = {
        type: "chat.message",
        timestamp: new Date().toISOString(),
        projectId: "project-1",
        sessionId: "session-1",
        role: "user",
        content: "Nobody here",
      }

      // Should not throw when broadcasting to empty pool
      yield* broadcaster.broadcast(event)

      expect(true).toBe(true) // Test passes if no error thrown
    }).pipe(Effect.provide(EventBroadcaster.Default))
  )
})

describe("WebSocket Authentication", () => {
  it.effect("validates JWT token on connection", () =>
    Effect.gen(function* () {
      const wsService = yield* WebSocketService

      // Simulate connection with valid token
      const result = yield* Effect.either(
        wsService.validateConnection("valid-token")
      )

      expect(result._tag).toBe("Right")
      if (result._tag === "Right") {
        expect(result.right.sub).toBe("user123")
        expect(result.right.email).toBe("test@example.com")
      }
    }).pipe(
      Effect.provide(WebSocketService.Default),
      Effect.provide(MockAuthServiceLive)
    )
  )

  it.effect("rejects invalid JWT token", () =>
    Effect.gen(function* () {
      const wsService = yield* WebSocketService

      // Simulate connection with invalid token
      const result = yield* Effect.either(
        wsService.validateConnection("invalid-token")
      )

      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(UnauthorizedError)
      }
    }).pipe(
      Effect.provide(WebSocketService.Default),
      Effect.provide(MockAuthServiceLive)
    )
  )

  it.effect("rejects connection without token", () =>
    Effect.gen(function* () {
      const wsService = yield* WebSocketService

      // Simulate connection with empty token
      const result = yield* Effect.either(wsService.validateConnection(""))

      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(UnauthorizedError)
      }
    }).pipe(
      Effect.provide(WebSocketService.Default),
      Effect.provide(MockAuthServiceLive)
    )
  )
})
