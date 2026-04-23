/**
 * Database migration runner
 * Runs SQL migrations on daemon startup
 */

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SqlClient } from "@effect/sql";
import { Effect } from "effect";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Execute a SQL migration file
 */
const executeMigration = (filename: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;

    const migrationPath = join(__dirname, "migrations", filename);
    const content = yield* Effect.tryPromise({
      try: () => readFile(migrationPath, "utf-8"),
      catch: (error) => new Error(`Failed to read migration ${filename}: ${String(error)}`),
    });

    // Execute SQL statements (split by semicolon for multiple statements)
    const statements = content
      .split(";")
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);

    for (const statement of statements) {
      yield* sql.unsafe(statement);
    }
  });

/**
 * Run all migrations in order
 */
export const runMigrations = Effect.gen(function* () {
  yield* executeMigration("001_core_tables.sql");
  yield* executeMigration("002_people_resources.sql");
  yield* executeMigration("003_documents_chat_schedules.sql");
});
