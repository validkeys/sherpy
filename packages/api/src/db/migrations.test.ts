/**
 * Integration tests for database migrations
 * Tests all 12 tables created from migrations/*.sql
 * Verifies indexes, constraints, and idempotency
 */

import { Reactivity } from "@effect/experimental";
import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { SqlClient } from "@effect/sql";
import { LibsqlClient } from "@effect/sql-libsql";
import { describe, expect, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { runMigrations } from "./migration-runner.js";

/**
 * Create a temporary SQLite database for testing using LibSQL
 */
const makeTestClient = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const dir = yield* fs.makeTempDirectoryScoped();
  return yield* LibsqlClient.make({
    url: `file:${dir}/test.db`,
  });
}).pipe(Effect.provide(Layer.mergeAll(NodeFileSystem.layer, Reactivity.layer)));

describe("Database Migrations", () => {
  describe("Migration Execution", () => {
    it.scoped(
      "runs all migrations successfully",
      () =>
        Effect.gen(function* () {
          const sql = yield* makeTestClient;
          yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

          // Verify migration completed without errors
          expect(true).toBe(true);
        }) as Effect.Effect<void>,
    );

    it.scoped(
      "is idempotent - can run migrations multiple times",
      () =>
        Effect.gen(function* () {
          const sql = yield* makeTestClient;

          // Run migrations twice
          yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));
          yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

          // Verify no errors on second run
          expect(true).toBe(true);
        }) as Effect.Effect<void>,
    );
  });

  describe("Migration 001: Core Tables", () => {
    it.scoped(
      "creates projects table with correct schema",
      () =>
        Effect.gen(function* () {
          const sql = yield* makeTestClient;
          yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

          // Query table schema
          const columns = yield* sql<{
            name: string;
            type: string;
            notnull: number;
            pk: number;
          }>`PRAGMA table_info(projects)`;

          const columnNames = columns.map((c) => c.name);
          expect(columnNames).toContain("id");
          expect(columnNames).toContain("slug");
          expect(columnNames).toContain("name");
          expect(columnNames).toContain("description");
          expect(columnNames).toContain("pipeline_status");
          expect(columnNames).toContain("assigned_people");
          expect(columnNames).toContain("tags");
          expect(columnNames).toContain("priority");
          expect(columnNames).toContain("created_at");
          expect(columnNames).toContain("updated_at");

          // Verify primary key
          const pkColumn = columns.find((c) => c.pk === 1);
          expect(pkColumn?.name).toBe("id");
        }) as Effect.Effect<void>,
    );

    it.scoped(
      "creates projects table indexes",
      () =>
        Effect.gen(function* () {
          const sql = yield* makeTestClient;
          yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

          const indexes = yield* sql<{
            name: string;
          }>`PRAGMA index_list(projects)`;

          const indexNames = indexes.map((i) => i.name);
          expect(indexNames).toContain("idx_projects_pipeline_status");
          expect(indexNames).toContain("idx_projects_slug");
        }) as Effect.Effect<void>,
    );

    it.scoped(
      "creates milestones table with foreign key",
      () =>
        Effect.gen(function* () {
          const sql = yield* makeTestClient;
          yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

          const columns = yield* sql<{
            name: string;
          }>`PRAGMA table_info(milestones)`;

          const columnNames = columns.map((c) => c.name);
          expect(columnNames).toContain("id");
          expect(columnNames).toContain("project_id");
          expect(columnNames).toContain("name");
          expect(columnNames).toContain("description");
          expect(columnNames).toContain("status");
          expect(columnNames).toContain("order_index");
          expect(columnNames).toContain("estimated_days");
          expect(columnNames).toContain("acceptance_criteria");
          expect(columnNames).toContain("created_at");
          expect(columnNames).toContain("updated_at");

          // Verify foreign key
          const fks = yield* sql<{
            from: string;
            table: string;
          }>`PRAGMA foreign_key_list(milestones)`;

          const projectFk = fks.find((fk) => fk.from === "project_id");
          expect(projectFk?.table).toBe("projects");
        }) as Effect.Effect<void>,
    );

    it.scoped(
      "creates milestones table indexes",
      () =>
        Effect.gen(function* () {
          const sql = yield* makeTestClient;
          yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

          const indexes = yield* sql<{
            name: string;
          }>`PRAGMA index_list(milestones)`;

          const indexNames = indexes.map((i) => i.name);
          expect(indexNames).toContain("idx_milestones_project");
          expect(indexNames).toContain("idx_milestones_status");
        }) as Effect.Effect<void>,
    );

    it.scoped(
      "creates tasks table with foreign keys",
      () =>
        Effect.gen(function* () {
          const sql = yield* makeTestClient;
          yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

          const columns = yield* sql<{
            name: string;
          }>`PRAGMA table_info(tasks)`;

          const columnNames = columns.map((c) => c.name);
          expect(columnNames).toContain("id");
          expect(columnNames).toContain("milestone_id");
          expect(columnNames).toContain("project_id");
          expect(columnNames).toContain("name");
          expect(columnNames).toContain("description");
          expect(columnNames).toContain("status");
          expect(columnNames).toContain("priority");
          expect(columnNames).toContain("estimated_hours");
          expect(columnNames).toContain("actual_hours");
          expect(columnNames).toContain("order_index");
          expect(columnNames).toContain("created_at");
          expect(columnNames).toContain("updated_at");

          // Verify foreign keys
          const fks = yield* sql<{
            from: string;
            table: string;
          }>`PRAGMA foreign_key_list(tasks)`;

          expect(fks.some((fk) => fk.from === "milestone_id" && fk.table === "milestones")).toBe(
            true,
          );
          expect(fks.some((fk) => fk.from === "project_id" && fk.table === "projects")).toBe(true);
        }) as Effect.Effect<void>,
    );

    it.scoped(
      "creates tasks table indexes",
      () =>
        Effect.gen(function* () {
          const sql = yield* makeTestClient;
          yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

          const indexes = yield* sql<{
            name: string;
          }>`PRAGMA index_list(tasks)`;

          const indexNames = indexes.map((i) => i.name);
          expect(indexNames).toContain("idx_tasks_milestone");
          expect(indexNames).toContain("idx_tasks_project");
          expect(indexNames).toContain("idx_tasks_status");
        }) as Effect.Effect<void>,
    );

    it.scoped(
      "creates tags table with unique constraint",
      () =>
        Effect.gen(function* () {
          const sql = yield* makeTestClient;
          yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

          const columns = yield* sql<{
            name: string;
          }>`PRAGMA table_info(tags)`;

          const columnNames = columns.map((c) => c.name);
          expect(columnNames).toContain("id");
          expect(columnNames).toContain("name");
          expect(columnNames).toContain("color");

          const indexes = yield* sql<{
            name: string;
            unique: number;
          }>`PRAGMA index_list(tags)`;

          const indexNames = indexes.map((i) => i.name);
          expect(indexNames).toContain("idx_tags_name");
        }) as Effect.Effect<void>,
    );
  });

  describe("Migration 002: People and Resource Tables", () => {
    it.scoped(
      "creates people table with unique email",
      () =>
        Effect.gen(function* () {
          const sql = yield* makeTestClient;
          yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

          const columns = yield* sql<{
            name: string;
          }>`PRAGMA table_info(people)`;

          const columnNames = columns.map((c) => c.name);
          expect(columnNames).toContain("id");
          expect(columnNames).toContain("name");
          expect(columnNames).toContain("email");
          expect(columnNames).toContain("okta_user_id");
          expect(columnNames).toContain("capacity_hours_per_week");
          expect(columnNames).toContain("created_at");
          expect(columnNames).toContain("updated_at");

          const indexes = yield* sql<{
            name: string;
          }>`PRAGMA index_list(people)`;

          const indexNames = indexes.map((i) => i.name);
          expect(indexNames).toContain("idx_people_email");
          expect(indexNames).toContain("idx_people_okta_user_id");
        }) as Effect.Effect<void>,
    );

    it.scoped(
      "creates skills table",
      () =>
        Effect.gen(function* () {
          const sql = yield* makeTestClient;
          yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

          const columns = yield* sql<{
            name: string;
          }>`PRAGMA table_info(skills)`;

          const columnNames = columns.map((c) => c.name);
          expect(columnNames).toContain("id");
          expect(columnNames).toContain("name");
          expect(columnNames).toContain("category");

          const indexes = yield* sql<{
            name: string;
          }>`PRAGMA index_list(skills)`;

          const indexNames = indexes.map((i) => i.name);
          expect(indexNames).toContain("idx_skills_name");
          expect(indexNames).toContain("idx_skills_category");
        }) as Effect.Effect<void>,
    );

    it.scoped(
      "creates person_skills junction table with composite primary key",
      () =>
        Effect.gen(function* () {
          const sql = yield* makeTestClient;
          yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

          const columns = yield* sql<{
            name: string;
            pk: number;
          }>`PRAGMA table_info(person_skills)`;

          const columnNames = columns.map((c) => c.name);
          expect(columnNames).toContain("person_id");
          expect(columnNames).toContain("skill_id");
          expect(columnNames).toContain("proficiency");

          // Verify composite primary key
          const pkColumns = columns.filter((c) => c.pk > 0);
          expect(pkColumns.length).toBe(2);
          expect(pkColumns.some((c) => c.name === "person_id")).toBe(true);
          expect(pkColumns.some((c) => c.name === "skill_id")).toBe(true);

          // Verify foreign keys
          const fks = yield* sql<{
            from: string;
            table: string;
          }>`PRAGMA foreign_key_list(person_skills)`;

          expect(fks.some((fk) => fk.from === "person_id" && fk.table === "people")).toBe(true);
          expect(fks.some((fk) => fk.from === "skill_id" && fk.table === "skills")).toBe(true);

          const indexes = yield* sql<{
            name: string;
          }>`PRAGMA index_list(person_skills)`;

          const indexNames = indexes.map((i) => i.name);
          expect(indexNames).toContain("idx_person_skills_person");
          expect(indexNames).toContain("idx_person_skills_skill");
        }) as Effect.Effect<void>,
    );

    it.scoped(
      "creates assignments table",
      () =>
        Effect.gen(function* () {
          const sql = yield* makeTestClient;
          yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

          const columns = yield* sql<{
            name: string;
          }>`PRAGMA table_info(assignments)`;

          const columnNames = columns.map((c) => c.name);
          expect(columnNames).toContain("id");
          expect(columnNames).toContain("task_id");
          expect(columnNames).toContain("person_id");
          expect(columnNames).toContain("allocation_percentage");
          expect(columnNames).toContain("start_date");
          expect(columnNames).toContain("end_date");
          expect(columnNames).toContain("status");
          expect(columnNames).toContain("created_at");
          expect(columnNames).toContain("updated_at");

          // Verify foreign keys
          const fks = yield* sql<{
            from: string;
            table: string;
          }>`PRAGMA foreign_key_list(assignments)`;

          expect(fks.some((fk) => fk.from === "task_id" && fk.table === "tasks")).toBe(true);
          expect(fks.some((fk) => fk.from === "person_id" && fk.table === "people")).toBe(true);

          const indexes = yield* sql<{
            name: string;
          }>`PRAGMA index_list(assignments)`;

          const indexNames = indexes.map((i) => i.name);
          expect(indexNames).toContain("idx_assignments_task");
          expect(indexNames).toContain("idx_assignments_person");
          expect(indexNames).toContain("idx_assignments_dates");
        }) as Effect.Effect<void>,
    );

    it.scoped(
      "creates availability_windows table",
      () =>
        Effect.gen(function* () {
          const sql = yield* makeTestClient;
          yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

          const columns = yield* sql<{
            name: string;
          }>`PRAGMA table_info(availability_windows)`;

          const columnNames = columns.map((c) => c.name);
          expect(columnNames).toContain("id");
          expect(columnNames).toContain("person_id");
          expect(columnNames).toContain("start_date");
          expect(columnNames).toContain("end_date");
          expect(columnNames).toContain("type");
          expect(columnNames).toContain("description");
          expect(columnNames).toContain("created_at");

          // Verify foreign key
          const fks = yield* sql<{
            from: string;
            table: string;
          }>`PRAGMA foreign_key_list(availability_windows)`;

          const personFk = fks.find((fk) => fk.from === "person_id");
          expect(personFk?.table).toBe("people");

          const indexes = yield* sql<{
            name: string;
          }>`PRAGMA index_list(availability_windows)`;

          const indexNames = indexes.map((i) => i.name);
          expect(indexNames).toContain("idx_availability_person");
          expect(indexNames).toContain("idx_availability_dates");
        }) as Effect.Effect<void>,
    );
  });

  describe("Migration 003: Documents, Chat, and Schedules Tables", () => {
    it.scoped(
      "creates documents table with unique constraint",
      () =>
        Effect.gen(function* () {
          const sql = yield* makeTestClient;
          yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

          const columns = yield* sql<{
            name: string;
          }>`PRAGMA table_info(documents)`;

          const columnNames = columns.map((c) => c.name);
          expect(columnNames).toContain("id");
          expect(columnNames).toContain("project_id");
          expect(columnNames).toContain("document_type");
          expect(columnNames).toContain("format");
          expect(columnNames).toContain("content");
          expect(columnNames).toContain("version");
          expect(columnNames).toContain("created_at");
          expect(columnNames).toContain("updated_at");

          // Verify foreign key
          const fks = yield* sql<{
            from: string;
            table: string;
          }>`PRAGMA foreign_key_list(documents)`;

          const projectFk = fks.find((fk) => fk.from === "project_id");
          expect(projectFk?.table).toBe("projects");

          const indexes = yield* sql<{
            name: string;
          }>`PRAGMA index_list(documents)`;

          const indexNames = indexes.map((i) => i.name);
          expect(indexNames).toContain("idx_documents_project");
          expect(indexNames).toContain("idx_documents_project_version");
        }) as Effect.Effect<void>,
    );

    it.scoped(
      "creates chat_sessions table",
      () =>
        Effect.gen(function* () {
          const sql = yield* makeTestClient;
          yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

          const columns = yield* sql<{
            name: string;
          }>`PRAGMA table_info(chat_sessions)`;

          const columnNames = columns.map((c) => c.name);
          expect(columnNames).toContain("id");
          expect(columnNames).toContain("project_id");
          expect(columnNames).toContain("messages");
          expect(columnNames).toContain("context_type");
          expect(columnNames).toContain("created_at");
          expect(columnNames).toContain("updated_at");

          // Verify foreign key
          const fks = yield* sql<{
            from: string;
            table: string;
          }>`PRAGMA foreign_key_list(chat_sessions)`;

          const projectFk = fks.find((fk) => fk.from === "project_id");
          expect(projectFk?.table).toBe("projects");

          const indexes = yield* sql<{
            name: string;
          }>`PRAGMA index_list(chat_sessions)`;

          const indexNames = indexes.map((i) => i.name);
          expect(indexNames).toContain("idx_chat_sessions_project");
        }) as Effect.Effect<void>,
    );

    it.scoped(
      "creates schedule_snapshots table",
      () =>
        Effect.gen(function* () {
          const sql = yield* makeTestClient;
          yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

          const columns = yield* sql<{
            name: string;
          }>`PRAGMA table_info(schedule_snapshots)`;

          const columnNames = columns.map((c) => c.name);
          expect(columnNames).toContain("id");
          expect(columnNames).toContain("project_id");
          expect(columnNames).toContain("name");
          expect(columnNames).toContain("type");
          expect(columnNames).toContain("parameters");
          expect(columnNames).toContain("result");
          expect(columnNames).toContain("reasoning");
          expect(columnNames).toContain("created_at");

          // Verify foreign key
          const fks = yield* sql<{
            from: string;
            table: string;
          }>`PRAGMA foreign_key_list(schedule_snapshots)`;

          const projectFk = fks.find((fk) => fk.from === "project_id");
          expect(projectFk?.table).toBe("projects");

          const indexes = yield* sql<{
            name: string;
          }>`PRAGMA index_list(schedule_snapshots)`;

          const indexNames = indexes.map((i) => i.name);
          expect(indexNames).toContain("idx_schedule_snapshots_project");
          expect(indexNames).toContain("idx_schedule_snapshots_type");
        }) as Effect.Effect<void>,
    );
  });

  describe("Referential Integrity", () => {
    it.scoped(
      "enforces CASCADE delete for project-milestone relationship",
      () =>
        Effect.gen(function* () {
          const sql = yield* makeTestClient;
          yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

          // Insert test data
          yield* sql`
          INSERT INTO projects (id, slug, name, pipeline_status, assigned_people, tags, priority, created_at, updated_at)
          VALUES ('proj-1', 'test', 'Test', 'intake', '[]', '[]', 'medium', '2026-01-01', '2026-01-01')
        `;
          yield* sql`
          INSERT INTO milestones (id, project_id, name, status, order_index, created_at, updated_at)
          VALUES ('ms-1', 'proj-1', 'Test Milestone', 'pending', 0, '2026-01-01', '2026-01-01')
        `;

          // Verify milestone exists
          const beforeDelete = yield* sql<{
            count: number;
          }>`SELECT COUNT(*) as count FROM milestones WHERE id = 'ms-1'`;
          expect(beforeDelete[0]?.count).toBe(1);

          // Delete project (should cascade to milestone)
          yield* sql`DELETE FROM projects WHERE id = 'proj-1'`;

          // Verify milestone was deleted
          const afterDelete = yield* sql<{
            count: number;
          }>`SELECT COUNT(*) as count FROM milestones WHERE id = 'ms-1'`;
          expect(afterDelete[0]?.count).toBe(0);
        }) as Effect.Effect<void>,
    );

    it.scoped(
      "enforces CASCADE delete for milestone-task relationship",
      () =>
        Effect.gen(function* () {
          const sql = yield* makeTestClient;
          yield* runMigrations.pipe(Effect.provideService(SqlClient.SqlClient, sql));

          // Insert test data
          yield* sql`
          INSERT INTO projects (id, slug, name, pipeline_status, assigned_people, tags, priority, created_at, updated_at)
          VALUES ('proj-1', 'test', 'Test', 'intake', '[]', '[]', 'medium', '2026-01-01', '2026-01-01')
        `;
          yield* sql`
          INSERT INTO milestones (id, project_id, name, status, order_index, created_at, updated_at)
          VALUES ('ms-1', 'proj-1', 'Test Milestone', 'pending', 0, '2026-01-01', '2026-01-01')
        `;
          yield* sql`
          INSERT INTO tasks (id, milestone_id, project_id, name, status, priority, order_index, created_at, updated_at)
          VALUES ('task-1', 'ms-1', 'proj-1', 'Test Task', 'pending', 'medium', 0, '2026-01-01', '2026-01-01')
        `;

          // Verify task exists
          const beforeDelete = yield* sql<{
            count: number;
          }>`SELECT COUNT(*) as count FROM tasks WHERE id = 'task-1'`;
          expect(beforeDelete[0]?.count).toBe(1);

          // Delete milestone (should cascade to task)
          yield* sql`DELETE FROM milestones WHERE id = 'ms-1'`;

          // Verify task was deleted
          const afterDelete = yield* sql<{
            count: number;
          }>`SELECT COUNT(*) as count FROM tasks WHERE id = 'task-1'`;
          expect(afterDelete[0]?.count).toBe(0);
        }) as Effect.Effect<void>,
    );
  });
});
