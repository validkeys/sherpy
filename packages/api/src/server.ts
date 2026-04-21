/**
 * HTTP server bootstrap using @effect/platform-node
 * Defines the HttpApi with groups and initializes the server
 */

import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiMiddleware,
  HttpApiSchema,
  HttpApiSecurity,
  HttpMiddleware,
  HttpServer,
} from "@effect/platform"
import { NodeHttpServer, NodeRuntime, NodeFileSystem } from "@effect/platform-node"
import { FetchHttpClient } from "@effect/platform"
import { SqlClient } from "@effect/sql"
import { LibsqlClient } from "@effect/sql-libsql"
import { Config, Context, Effect, Layer, Redacted, Schema } from "effect"
import { createServer } from "node:http"
import { homedir } from "node:os"
import { join } from "node:path"
import { WebSocketServer, WebSocket } from "ws"
import { IncomingMessage } from "node:http"
import { runMigrations } from "./db/migration-runner.js"
import { OktaClaims, validateJwt } from "./auth/okta-jwt.js"
import { UnauthorizedError } from "./errors/auth.js"
import { AuthService } from "./auth/jwks-cache.js"
import {
  EventBroadcaster,
  WebSocketService,
  WebSocketConnection,
} from "./api/websocket.js"
import { wrapWithStaticFiles } from "./api/static-server.js"

/**
 * Health check response schema
 */
class HealthResponse extends Schema.Class<HealthResponse>("HealthResponse")({
  status: Schema.Literal("ok"),
  db: Schema.Literal("connected"),
  uptime: Schema.Number,
  timestamp: Schema.String,
}) {}

/**
 * CurrentUser context tag
 * Provides authenticated user claims to request handlers
 */
export class CurrentUser extends Context.Tag("CurrentUser")<
  CurrentUser,
  OktaClaims
>() {}

/**
 * Authentication middleware
 * Validates JWT bearer tokens and provides CurrentUser to handlers
 */
export class Authentication extends HttpApiMiddleware.Tag<Authentication>()(
  "Authentication",
  {
    failure: UnauthorizedError,
    provides: CurrentUser,
    security: {
      bearer: HttpApiSecurity.bearer,
    },
  }
) {}

/**
 * Health API group - no authentication required
 */
class HealthApi extends HttpApiGroup.make("health").add(
  HttpApiEndpoint.get("health", "/api/health").addSuccess(HealthResponse)
).prefix("/api") {}

/**
 * Main API composition
 */
export class SherryApi extends HttpApi.make("api").add(HealthApi) {}

/**
 * Health check handler implementation
 */
const HealthApiLive = HttpApiBuilder.group(SherryApi, "health", (handlers) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const startTime = Date.now()

    return handlers.handle("health", () =>
      Effect.gen(function* () {
        // Verify database connectivity
        yield* sql.unsafe("SELECT 1").pipe(Effect.orDie)

        return new HealthResponse({
          status: "ok",
          db: "connected",
          uptime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        })
      })
    )
  })
)

/**
 * Authentication middleware implementation
 * Validates Bearer tokens via Okta JWT validation
 */
const AuthenticationLive = Layer.effect(
  Authentication,
  Effect.gen(function* () {
    const authService = yield* AuthService

    return Authentication.of({
      bearer: (token) =>
        Effect.gen(function* () {
          const claims = yield* authService.validateToken(Redacted.value(token))
          return claims
        }),
    })
  })
)

/**
 * Migration runner service
 * Runs database migrations before the server starts
 */
const MigrationRunnerLive = Layer.effectDiscard(
  Effect.gen(function* () {
    yield* Effect.log("Running database migrations")
    yield* runMigrations
    yield* Effect.log("Migrations completed")
  })
)

/**
 * Database layer with LibSQL (SQLite)
 * TODO: Make URL configurable via environment variable
 */
const DatabaseLayer = LibsqlClient.layer({
  url: `file:${join(homedir(), ".sherpy", "sherpy.db")}`,
})

/**
 * Full API implementation with all handlers
 */
export const SherryApiLive = HttpApiBuilder.api(SherryApi).pipe(
  Layer.provide(HealthApiLive),
  Layer.provide(AuthenticationLive),
  Layer.provide(AuthService.Live),
  Layer.provide(MigrationRunnerLive),
  Layer.provide(DatabaseLayer)
)

/**
 * WebSocket server layer
 * Sets up WebSocket server with JWT authentication
 */
const WebSocketServerLive = Layer.scopedDiscard(
  Effect.gen(function* () {
    yield* Effect.log("Initializing WebSocket server")

    const wsService = yield* WebSocketService
    const broadcaster = yield* EventBroadcaster

    // Create WebSocket server on port 3101 (separate from HTTP API)
    // In production, this would be proxied through a reverse proxy like Nginx
    const wss = new WebSocketServer({ port: 3101, host: "127.0.0.1" })

    // Track active connections
    let connectionId = 0

    wss.on("connection", (ws: WebSocket, request: IncomingMessage) => {
      const connId = `ws-${++connectionId}`

      // Extract JWT from query parameter
      const requestUrl = request.url || "/"
      const host = request.headers.host || "localhost"
      const url = new URL(requestUrl, `http://${host}`)
      const token = url.searchParams.get("token") || ""

      // Validate JWT asynchronously
      Effect.runPromise(
        Effect.gen(function* () {
          // Validate the token
          const result = yield* Effect.either(
            wsService.validateConnection(token)
          )

          if (result._tag === "Left") {
            yield* Effect.log(
              `WebSocket authentication failed for ${connId}: ${result.left.message}`
            )
            ws.close(1008, "Authentication failed")
            return
          }

          const claims = result.right
          yield* Effect.log(
            `WebSocket client authenticated: ${connId} (user: ${claims.email})`
          )

          // Create WebSocketConnection adapter
          const connection: WebSocketConnection = {
            id: connId,
            send: (data: string) =>
              Effect.sync(() => {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(data)
                }
              }),
            close: () =>
              Effect.sync(() => {
                ws.close()
              }),
          }

          // Add to broadcaster pool
          yield* broadcaster.addConnection(connection)

          // Send acknowledgment
          ws.send(JSON.stringify({ type: "connected", connectionId: connId }))

          // Handle disconnect
          ws.on("close", () => {
            Effect.runPromise(
              Effect.gen(function* () {
                yield* Effect.log(`WebSocket client disconnected: ${connId}`)
                yield* broadcaster.removeConnection(connection)
              })
            )
          })

          ws.on("error", (error) => {
            Effect.runPromise(
              Effect.gen(function* () {
                yield* Effect.logWarning(
                  `WebSocket error for ${connId}: ${String(error)}`
                )
                yield* broadcaster.removeConnection(connection)
              })
            )
          })
        })
      )
    })

    yield* Effect.addFinalizer(() =>
      Effect.gen(function* () {
        yield* Effect.log("Closing WebSocket server")
        yield* Effect.sync(() => wss.close())
      })
    )

    yield* Effect.log("WebSocket server listening on ws://127.0.0.1:3101")
  })
)

/**
 * HTTP server layer with configuration
 * TODO: Integrate static file serving when web package is ready
 *
 * To add static serving:
 * 1. Wrap the HTTP app with wrapWithStaticFiles before serving
 * 2. Provide NodeFileSystem.layer for file system access
 * 3. Path: "../../../web/dist" (relative to dist/server.js)
 *
 * Example integration (requires @effect/platform updates):
 *   const apiApp = HttpApiBuilder.api(SherryApi)
 *   const wrappedApp = wrapWithStaticFiles(apiApp, "../../../web/dist")
 *   HttpApiBuilder.serve(wrappedApp, HttpMiddleware.logger)
 */
const HttpLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
  HttpServer.withLogAddress,
  Layer.provide(SherryApiLive),
  Layer.provide(FetchHttpClient.layer),
  Layer.provide(NodeFileSystem.layer),
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3100, host: "127.0.0.1" }))
)

/**
 * Combined server layer with HTTP API and WebSocket server
 */
const ServerLive = Layer.mergeAll(HttpLive, WebSocketServerLive).pipe(
  Layer.provide(EventBroadcaster.Default),
  Layer.provide(WebSocketService.Default),
  Layer.provide(AuthService.Live),
  Layer.provide(FetchHttpClient.layer)
)

/**
 * Main server effect
 * Runs migrations, starts the HTTP server and WebSocket server, and keeps them running
 */
export const main = ServerLive.pipe(Layer.launch, Effect.scoped)

/**
 * Bootstrap and run the server
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  NodeRuntime.runMain(main)
}
