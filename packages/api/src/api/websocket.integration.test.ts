/**
 * WebSocket integration tests
 * Tests WebSocket connections with real HTTP server and WebSocket protocol
 */

import { Effect, Layer } from "effect"
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { WebSocketServer, WebSocket } from "ws"
import { EventBroadcaster, WebSocketService } from "./websocket.js"
import { AuthService, OktaClaims } from "../auth/jwks-cache.js"
import { UnauthorizedError } from "../errors/auth.js"
import { WsEvent, ChatMessageEvent } from "@sherpy/shared"

// Mock AuthService that returns valid/invalid based on token
const MockAuthServiceLive = Layer.succeed(AuthService, {
  validateToken: (token: string) =>
    Effect.gen(function* () {
      if (token === "valid-token-123") {
        return new OktaClaims({
          sub: "user-integration-test",
          email: "integration@test.com",
          name: "Integration Test User",
        })
      }
      return yield* Effect.fail(
        new UnauthorizedError({ message: "Invalid token" })
      )
    }),
})

describe("WebSocket Integration Tests", () => {
  let wss: WebSocketServer
  let wsService: {
    validateConnection: (token: string) => Effect.Effect<OktaClaims, UnauthorizedError>
  }
  let broadcaster: {
    addConnection: (conn: any) => Effect.Effect<void>
    removeConnection: (conn: any) => Effect.Effect<void>
    broadcast: (event: WsEvent) => Effect.Effect<void>
    getConnectionCount: () => Effect.Effect<number>
  }
  let serverPort: number
  const testClients: WebSocket[] = []

  beforeEach(async () => {
    // Find available port
    serverPort = 13100 + Math.floor(Math.random() * 1000)

    // Create real WebSocket server
    wss = new WebSocketServer({ port: serverPort, host: "127.0.0.1" })

    // Initialize services
    const runtime = await Effect.runPromise(
      Effect.gen(function* () {
        const ws = yield* WebSocketService
        const bc = yield* EventBroadcaster
        return { ws, bc }
      }).pipe(
        Effect.provide(WebSocketService.Default),
        Effect.provide(EventBroadcaster.Default),
        Effect.provide(MockAuthServiceLive)
      )
    )

    wsService = runtime.ws
    broadcaster = runtime.bc

    // Set up WebSocket connection handler
    wss.on("connection", (ws: WebSocket, request) => {
      const url = new URL(request.url || "/", `http://localhost`)
      const token = url.searchParams.get("token") || ""

      // Validate connection
      Effect.runPromise(
        Effect.gen(function* () {
          const result = yield* Effect.either(
            wsService.validateConnection(token)
          )

          if (result._tag === "Left") {
            ws.close(1008, "Authentication failed")
            return
          }

          // Authentication successful - add to broadcaster
          const connId = `conn-${Date.now()}`
          const connection = {
            id: connId,
            send: (data: string) =>
              Effect.promise(() => {
                return new Promise<void>((resolve, reject) => {
                  ws.send(data, (err) => {
                    if (err) reject(err)
                    else resolve()
                  })
                })
              }),
            close: () =>
              Effect.sync(() => {
                ws.close()
              }),
          }

          yield* broadcaster.addConnection(connection)

          ws.on("close", () => {
            Effect.runPromise(
              broadcaster.removeConnection(connection).pipe(Effect.orDie)
            )
          })
        })
      )
    })
  })

  afterEach(async () => {
    // Close all test clients
    testClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.close()
      }
    })
    testClients.length = 0

    // Close WebSocket server
    await new Promise<void>((resolve) => {
      wss.close(() => resolve())
    })
  })

  it("should accept WebSocket connection with valid JWT", async () => {
    const client = new WebSocket(
      `ws://127.0.0.1:${serverPort}?token=valid-token-123`
    )
    testClients.push(client)

    await new Promise<void>((resolve, reject) => {
      client.on("open", () => {
        expect(client.readyState).toBe(WebSocket.OPEN)
        resolve()
      })
      client.on("error", reject)
      setTimeout(() => reject(new Error("Connection timeout")), 2000)
    })
  })

  it("should reject WebSocket connection without JWT", async () => {
    const client = new WebSocket(`ws://127.0.0.1:${serverPort}`)
    testClients.push(client)

    await new Promise<void>((resolve, reject) => {
      let opened = false

      client.on("open", () => {
        opened = true
        // Connection opened but might be closed immediately after auth check
      })

      client.on("close", (code, reason) => {
        // Connection should be closed after auth failure
        expect(code).toBe(1008)
        expect(reason.toString()).toContain("Authentication failed")
        resolve()
      })

      client.on("error", (error) => {
        // Connection might error instead of clean close
        resolve()
      })

      setTimeout(() => {
        if (!opened) {
          resolve() // Connection never opened, that's also acceptable
        } else {
          reject(new Error("Close timeout"))
        }
      }, 2000)
    })
  })

  it("should reject WebSocket connection with invalid JWT", async () => {
    const client = new WebSocket(
      `ws://127.0.0.1:${serverPort}?token=invalid-token`
    )
    testClients.push(client)

    await new Promise<void>((resolve, reject) => {
      let opened = false

      client.on("open", () => {
        opened = true
        // Connection opened but should be closed after auth check
      })

      client.on("close", (code, reason) => {
        expect(code).toBe(1008)
        expect(reason.toString()).toContain("Authentication failed")
        resolve()
      })

      client.on("error", (error) => {
        // Connection might error instead of clean close
        resolve()
      })

      setTimeout(() => {
        if (!opened) {
          resolve() // Connection never opened, that's also acceptable
        } else {
          reject(new Error("Close timeout"))
        }
      }, 2000)
    })
  })

  it("should broadcast event to all connected clients", async () => {
    // Connect two clients
    const client1 = new WebSocket(
      `ws://127.0.0.1:${serverPort}?token=valid-token-123`
    )
    const client2 = new WebSocket(
      `ws://127.0.0.1:${serverPort}?token=valid-token-123`
    )
    testClients.push(client1, client2)

    // Wait for both to connect
    await Promise.all([
      new Promise<void>((resolve) => client1.on("open", resolve)),
      new Promise<void>((resolve) => client2.on("open", resolve)),
    ])

    // Wait for server to register connections
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Set up message collectors
    const client1Messages: string[] = []
    const client2Messages: string[] = []

    client1.on("message", (data) => {
      client1Messages.push(data.toString())
    })
    client2.on("message", (data) => {
      client2Messages.push(data.toString())
    })

    // Broadcast an event
    const event: ChatMessageEvent = {
      type: "chat.message",
      timestamp: new Date().toISOString(),
      projectId: "test-project",
      sessionId: "test-session",
      role: "user",
      content: "Integration test message",
    }

    await Effect.runPromise(broadcaster.broadcast(event))

    // Wait for messages to be received
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Both clients should have received the message
    expect(client1Messages.length).toBe(1)
    expect(client2Messages.length).toBe(1)

    const msg1 = JSON.parse(client1Messages[0]!)
    const msg2 = JSON.parse(client2Messages[0]!)

    expect(msg1.type).toBe("chat.message")
    expect(msg1.content).toBe("Integration test message")
    expect(msg2.type).toBe("chat.message")
    expect(msg2.content).toBe("Integration test message")
  })

  it("should remove disconnected client from broadcast pool", async () => {
    // Connect two clients
    const client1 = new WebSocket(
      `ws://127.0.0.1:${serverPort}?token=valid-token-123`
    )
    const client2 = new WebSocket(
      `ws://127.0.0.1:${serverPort}?token=valid-token-123`
    )
    testClients.push(client1, client2)

    // Wait for both to connect
    await Promise.all([
      new Promise<void>((resolve) => client1.on("open", resolve)),
      new Promise<void>((resolve) => client2.on("open", resolve)),
    ])

    // Wait for server to register connections
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Disconnect client1
    client1.close()
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Set up message collector for client2
    const client2Messages: string[] = []
    client2.on("message", (data) => {
      client2Messages.push(data.toString())
    })

    // Broadcast an event
    const event: ChatMessageEvent = {
      type: "chat.message",
      timestamp: new Date().toISOString(),
      projectId: "test-project",
      sessionId: "test-session",
      role: "assistant",
      content: "After disconnect",
    }

    await Effect.runPromise(broadcaster.broadcast(event))

    // Wait for message
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Only client2 should receive the message
    expect(client2Messages.length).toBe(1)
    expect(client1.readyState).toBe(WebSocket.CLOSED)
  })

  it("should handle multiple sequential broadcasts", async () => {
    const client = new WebSocket(
      `ws://127.0.0.1:${serverPort}?token=valid-token-123`
    )
    testClients.push(client)

    await new Promise<void>((resolve) => client.on("open", resolve))
    await new Promise((resolve) => setTimeout(resolve, 100))

    const messages: string[] = []
    client.on("message", (data) => {
      messages.push(data.toString())
    })

    // Send three events in sequence
    for (let i = 1; i <= 3; i++) {
      const event: ChatMessageEvent = {
        type: "chat.message",
        timestamp: new Date().toISOString(),
        projectId: "test-project",
        sessionId: "test-session",
        role: "user",
        content: `Message ${i}`,
      }
      await Effect.runPromise(broadcaster.broadcast(event))
    }

    // Wait for all messages
    await new Promise((resolve) => setTimeout(resolve, 200))

    expect(messages.length).toBe(3)
    expect(JSON.parse(messages[0]!).content).toBe("Message 1")
    expect(JSON.parse(messages[1]!).content).toBe("Message 2")
    expect(JSON.parse(messages[2]!).content).toBe("Message 3")
  })

  it("should report correct connection count", async () => {
    // Initially no connections
    const count0 = await Effect.runPromise(broadcaster.getConnectionCount())
    expect(count0).toBe(0)

    // Connect one client
    const client1 = new WebSocket(
      `ws://127.0.0.1:${serverPort}?token=valid-token-123`
    )
    testClients.push(client1)
    await new Promise<void>((resolve) => client1.on("open", resolve))
    await new Promise((resolve) => setTimeout(resolve, 100))

    const count1 = await Effect.runPromise(broadcaster.getConnectionCount())
    expect(count1).toBe(1)

    // Connect second client
    const client2 = new WebSocket(
      `ws://127.0.0.1:${serverPort}?token=valid-token-123`
    )
    testClients.push(client2)
    await new Promise<void>((resolve) => client2.on("open", resolve))
    await new Promise((resolve) => setTimeout(resolve, 100))

    const count2 = await Effect.runPromise(broadcaster.getConnectionCount())
    expect(count2).toBe(2)

    // Disconnect one client
    client1.close()
    await new Promise((resolve) => setTimeout(resolve, 100))

    const count3 = await Effect.runPromise(broadcaster.getConnectionCount())
    expect(count3).toBe(1)
  })
})
