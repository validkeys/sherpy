/**
 * Database layer exports
 * Provides SqlClient and runs migrations on startup
 */

import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { LibsqlClient } from "@effect/sql-libsql";
import { Effect, Layer } from "effect";
import { runMigrations } from "./migration-runner.js";

/**
 * SQLite database layer
 * Connects to ~/.sherpy/sherpy.db
 */
export const SqliteLive = Layer.unwrapEffect(
  Effect.gen(function* () {
    // Get home directory and create .sherpy folder if it doesn't exist
    const sherpyDir = join(homedir(), ".sherpy");
    const dbPath = join(sherpyDir, "sherpy.db");

    // Ensure .sherpy directory exists
    yield* Effect.tryPromise({
      try: () => mkdir(sherpyDir, { recursive: true }),
      catch: () => new Error("Failed to create .sherpy directory"),
    }).pipe(Effect.catchAll(() => Effect.void));

    // Create LibSQL client layer with field name transformations
    // transformQueryNames: camelCase -> snake_case for SQL queries
    // transformResultNames: snake_case -> camelCase for query results
    return LibsqlClient.layer({
      url: `file:${dbPath}`,
      transformQueryNames: (_str: string) => _str.replace(/([A-Z])/g, "_$1").toLowerCase(),
      transformResultNames: (_str: string) =>
        _str.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
    });
  }),
);

/**
 * Migration runner layer
 * Runs all SQL migrations on startup
 */
export const MigrationRunnerLive = Layer.effectDiscard(
  Effect.gen(function* () {
    yield* runMigrations;
  }),
);

/**
 * Complete database layer with migrations
 * Provides SqlClient and runs migrations on startup
 */
export const DatabaseLayer = Layer.mergeAll(
  SqliteLive,
  MigrationRunnerLive.pipe(Layer.provide(SqliteLive)),
);

export { runMigrations };
