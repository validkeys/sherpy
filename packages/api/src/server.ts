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
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { FetchHttpClient } from "@effect/platform"
import { SqlClient } from "@effect/sql"
import { LibsqlClient } from "@effect/sql-libsql"
import { Config, Context, Effect, Layer, Redacted, Schema } from "effect"
import { createServer } from "node:http"
import { homedir } from "node:os"
import { join } from "node:path"
import { runMigrations } from "./db/migration-runner.js"
import { OktaClaims, validateJwt } from "./auth/okta-jwt.js"
import { UnauthorizedError } from "./errors/auth.js"
import { AuthService } from "./auth/jwks-cache.js"

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
 * HTTP server layer with configuration
 */
const HttpLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
  HttpServer.withLogAddress,
  Layer.provide(SherryApiLive),
  Layer.provide(FetchHttpClient.layer),
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3100, host: "127.0.0.1" }))
)

/**
 * Main server effect
 * Runs migrations, starts the HTTP server, and keeps it running
 */
export const main = HttpLive.pipe(Layer.launch, Effect.scoped)

/**
 * Bootstrap and run the server
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  NodeRuntime.runMain(main)
}
