/**
 * HTTP server bootstrap using @effect/platform-node
 * Defines the HttpApi with groups and initializes the server
 */

import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  HttpMiddleware,
  HttpServer,
} from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { SqlClient } from "@effect/sql"
import { LibsqlClient } from "@effect/sql-libsql"
import { Config, Effect, Layer, Schema } from "effect"
import { createServer } from "node:http"
import { homedir } from "node:os"
import { join } from "node:path"
import { runMigrations } from "./db/migration-runner.js"

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
  Layer.provide(MigrationRunnerLive),
  Layer.provide(DatabaseLayer)
)

/**
 * HTTP server layer with configuration
 */
const HttpLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
  HttpServer.withLogAddress,
  Layer.provide(SherryApiLive),
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
