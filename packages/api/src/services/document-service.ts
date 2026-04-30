/**
 * DocumentService - Domain service for generating document views from DB
 * Uses Effect.Service with Layer pattern (SA-001)
 * Documents are GENERATED VIEWS assembled from project, milestone, and task data
 */

import { randomUUID } from "node:crypto";
import { Model, SqlClient } from "@effect/sql";
import {
  Document,
  type DocumentFormat,
  type DocumentType,
  NotFoundError,
  ValidationError,
} from "@sherpy/shared";
import { Effect, Layer, Option, Schema } from "effect";
import { MilestoneService } from "./milestone-service.js";
import { ProjectService } from "./project-service.js";
import { TaskService } from "./task-service.js";

/**
 * Input for generating a project plan document
 */
export class GenerateProjectPlanInput extends Schema.Class<GenerateProjectPlanInput>(
  "GenerateProjectPlanInput",
)({
  projectId: Schema.String,
  format: Schema.Literal("yaml", "markdown", "json"),
}) {}

/**
 * DocumentService - Effect.Service for document generation operations
 */
export class DocumentService extends Effect.Service<DocumentService>()("DocumentService", {
  effect: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const projectService = yield* ProjectService;
    const milestoneService = yield* MilestoneService;
    const taskService = yield* TaskService;

    // Create repository using Model.makeRepository (SA-002)
    const repo = yield* Model.makeRepository(Document, {
      tableName: "documents",
      idColumn: "id",
      spanPrefix: "DocumentRepository",
    });

    /**
     * Render data as YAML string
     */
    const renderYaml = (data: {
      project: any;
      milestones: Array<{ milestone: any; tasks: any[] }>;
    }): string => {
      const lines: string[] = [];

      lines.push("project:");
      lines.push(`  id: "${data.project.id}"`);
      lines.push(`  name: "${data.project.name}"`);
      lines.push(`  slug: "${data.project.slug}"`);
      lines.push(`  description: "${data.project.description || ""}"`);
      lines.push(`  pipelineStatus: "${data.project.pipelineStatus}"`);
      lines.push(`  priority: "${data.project.priority}"`);
      lines.push(`  tags:`);
      if (data.project.tags.length === 0) {
        lines.push(`    []`);
      } else {
        for (const tag of data.project.tags) {
          lines.push(`    - "${tag}"`);
        }
      }
      lines.push(`  createdAt: "${data.project.createdAt}"`);
      lines.push(`  updatedAt: "${data.project.updatedAt}"`);

      lines.push("");
      lines.push("milestones:");

      if (data.milestones.length === 0) {
        lines.push("  []");
      } else {
        for (const { milestone, tasks } of data.milestones) {
          lines.push(`  - id: "${milestone.id}"`);
          lines.push(`    name: "${milestone.name}"`);
          lines.push(`    description: "${milestone.description || ""}"`);
          lines.push(`    status: "${milestone.status}"`);
          lines.push(`    orderIndex: ${milestone.orderIndex}`);
          if (milestone.estimatedDays !== null) {
            lines.push(`    estimatedDays: ${milestone.estimatedDays}`);
          }
          if (milestone.acceptanceCriteria !== null) {
            lines.push(`    acceptanceCriteria: "${milestone.acceptanceCriteria}"`);
          }
          lines.push(`    tasks:`);

          if (tasks.length === 0) {
            lines.push(`      []`);
          } else {
            for (const task of tasks) {
              lines.push(`      - id: "${task.id}"`);
              lines.push(`        name: "${task.name}"`);
              lines.push(`        description: "${task.description || ""}"`);
              lines.push(`        status: "${task.status}"`);
              lines.push(`        priority: "${task.priority}"`);
              lines.push(`        orderIndex: ${task.orderIndex}`);
              if (task.estimatedHours !== null) {
                lines.push(`        estimatedHours: ${task.estimatedHours}`);
              }
              if (task.actualHours !== null) {
                lines.push(`        actualHours: ${task.actualHours}`);
              }
            }
          }
        }
      }

      return lines.join("\n");
    };

    /**
     * Render data as Markdown string
     */
    const renderMarkdown = (data: {
      project: any;
      milestones: Array<{ milestone: any; tasks: any[] }>;
    }): string => {
      const lines: string[] = [];

      lines.push(`# ${data.project.name}`);
      lines.push("");
      lines.push(`**Project ID:** ${data.project.id}`);
      lines.push(`**Slug:** ${data.project.slug}`);
      lines.push(`**Pipeline Status:** ${data.project.pipelineStatus}`);
      lines.push(`**Priority:** ${data.project.priority}`);
      lines.push("");

      if (data.project.description) {
        lines.push("## Description");
        lines.push("");
        lines.push(data.project.description);
        lines.push("");
      }

      if (data.project.tags.length > 0) {
        lines.push("## Tags");
        lines.push("");
        lines.push(data.project.tags.join(", "));
        lines.push("");
      }

      lines.push("## Milestones");
      lines.push("");

      if (data.milestones.length === 0) {
        lines.push("*No milestones*");
      } else {
        for (const { milestone, tasks } of data.milestones) {
          lines.push(`### ${milestone.name}`);
          lines.push("");
          lines.push(`**Status:** ${milestone.status}`);
          if (milestone.estimatedDays !== null) {
            lines.push(`**Estimated Days:** ${milestone.estimatedDays}`);
          }
          lines.push("");

          if (milestone.description) {
            lines.push(milestone.description);
            lines.push("");
          }

          if (milestone.acceptanceCriteria) {
            lines.push("**Acceptance Criteria:**");
            lines.push("");
            lines.push(milestone.acceptanceCriteria);
            lines.push("");
          }

          if (tasks.length > 0) {
            lines.push("#### Tasks");
            lines.push("");

            for (const task of tasks) {
              const hours = task.estimatedHours !== null ? ` (${task.estimatedHours}h)` : "";
              lines.push(`- **${task.name}** [${task.status}]${hours}`);
              if (task.description) {
                lines.push(`  - ${task.description}`);
              }
            }
            lines.push("");
          }
        }
      }

      lines.push("---");
      lines.push(`*Generated: ${new Date().toISOString()}*`);

      return lines.join("\n");
    };

    /**
     * Render data as JSON string
     */
    const renderJson = (data: {
      project: any;
      milestones: Array<{ milestone: any; tasks: any[] }>;
    }): string => {
      return JSON.stringify(data, null, 2);
    };

    /**
     * Get the next version number for a document
     */
    const getNextVersion = (
      projectId: string,
      documentType: DocumentType,
    ): Effect.Effect<number, ValidationError> =>
      Effect.gen(function* () {
        const result = yield* sql<{ maxVersion: number | null }>`
            SELECT MAX(version) as maxVersion
            FROM documents
            WHERE project_id = ${projectId} AND document_type = ${documentType}
          `;
        const maxVersion = result[0]?.maxVersion ?? 0;
        return maxVersion + 1;
      }).pipe(
        Effect.catchTag("SqlError", (error) =>
          Effect.fail(
            new ValidationError({
              message: `Database error: ${error.message ?? "Unknown error"}`,
            }),
          ),
        ),
      );

    /**
     * Generate a project plan document in the specified format
     * Assembles data from ProjectService, MilestoneService, and TaskService
     */
    const generateProjectPlan = (
      input: typeof GenerateProjectPlanInput.Type,
    ): Effect.Effect<typeof Document.Type, NotFoundError | ValidationError> =>
      Effect.gen(function* () {
        // Fetch project data
        const project = yield* projectService.get(input.projectId);

        // Fetch milestones for this project, ordered
        const milestones = yield* milestoneService.listByProject(input.projectId);

        // Fetch tasks for each milestone
        const milestonesWithTasks = yield* Effect.all(
          milestones.map((milestone) =>
            Effect.gen(function* () {
              const tasks = yield* taskService.listByMilestone(milestone.id);
              return { milestone, tasks };
            }),
          ),
        );

        // Assemble data structure
        const data = {
          project,
          milestones: milestonesWithTasks,
        };

        // Render to requested format
        let content: string;
        switch (input.format) {
          case "yaml":
            content = renderYaml(data);
            break;
          case "markdown":
            content = renderMarkdown(data);
            break;
          case "json":
            content = renderJson(data);
            break;
        }

        // Get next version number
        const version = yield* getNextVersion(input.projectId, "implementation-plan");

        // Create document with generated UUID
        const id = randomUUID();
        const now = new Date().toISOString();

        yield* sql`
            INSERT INTO documents (
              id, project_id, document_type, format, content, version,
              created_at, updated_at
            ) VALUES (
              ${id}, ${input.projectId}, ${"implementation-plan"},
              ${input.format}, ${content}, ${version},
              ${now}, ${now}
            )
          `;

        // Fetch the created document using the repository
        const document = yield* repo.findById(id);

        if (Option.isNone(document)) {
          return yield* Effect.fail(
            new NotFoundError({
              entity: "Document",
              id,
              message: `Document not found after insert`,
            }),
          );
        }

        return document.value;
      }).pipe(
        Effect.catchTag("SqlError", (error) =>
          Effect.fail(
            new ValidationError({
              message: `Database error: ${error.message ?? "Unknown error"}`,
            }),
          ),
        ),
      );

    /**
     * Get the latest version of a document
     */
    const getDocument = (
      projectId: string,
      documentType: DocumentType,
    ): Effect.Effect<typeof Document.Type, NotFoundError | ValidationError> =>
      Effect.gen(function* () {
        const result = yield* sql`
            SELECT
              id,
              project_id as "projectId",
              document_type as "documentType",
              format,
              content,
              version,
              created_at as "createdAt",
              updated_at as "updatedAt"
            FROM documents
            WHERE project_id = ${projectId} AND document_type = ${documentType}
            ORDER BY version DESC
            LIMIT 1
          `;

        if (result.length === 0 || !result[0]) {
          return yield* Effect.fail(
            new NotFoundError({
              entity: "Document",
              id: `${projectId}/${documentType}`,
              message: `Document type "${documentType}" not found for project "${projectId}"`,
            }),
          );
        }

        // Decode the row using the Document schema
        return yield* Schema.decodeUnknown(Document)(result[0]).pipe(
          Effect.catchTag("ParseError", (error) =>
            Effect.fail(
              new ValidationError({
                message: `Failed to parse document data: ${error.message}`,
              }),
            ),
          ),
        );
      }).pipe(
        Effect.catchTag("SqlError", (error) =>
          Effect.fail(
            new ValidationError({
              message: `Database error: ${error.message ?? "Unknown error"}`,
            }),
          ),
        ),
      );

    /**
     * List all documents for a project, latest version first
     */
    const listDocuments = (
      projectId: string,
    ): Effect.Effect<ReadonlyArray<typeof Document.Type>, ValidationError> =>
      Effect.gen(function* () {
        const rows = yield* sql`
            SELECT
              id,
              project_id as "projectId",
              document_type as "documentType",
              format,
              content,
              version,
              created_at as "createdAt",
              updated_at as "updatedAt"
            FROM documents
            WHERE project_id = ${projectId}
            ORDER BY created_at DESC
          `;
        // Decode each row using the Document schema
        const documents = yield* Effect.all(
          rows.map((row) => Schema.decodeUnknown(Document)(row)),
          { concurrency: "unbounded" },
        ).pipe(
          Effect.catchTag("ParseError", (error) =>
            Effect.fail(
              new ValidationError({
                message: `Failed to parse document data: ${error.message}`,
              }),
            ),
          ),
        );
        return documents;
      }).pipe(
        Effect.catchTag("SqlError", (error) =>
          Effect.fail(
            new ValidationError({
              message: `Database error: ${error.message ?? "Unknown error"}`,
            }),
          ),
        ),
      );

    /**
     * Get a specific version of a document
     */
    const getDocumentVersion = (
      projectId: string,
      documentType: DocumentType,
      version: number,
    ): Effect.Effect<typeof Document.Type, NotFoundError | ValidationError> =>
      Effect.gen(function* () {
        const result = yield* sql`
            SELECT
              id,
              project_id as "projectId",
              document_type as "documentType",
              format,
              content,
              version,
              created_at as "createdAt",
              updated_at as "updatedAt"
            FROM documents
            WHERE project_id = ${projectId}
              AND document_type = ${documentType}
              AND version = ${version}
            LIMIT 1
          `;

        if (result.length === 0 || !result[0]) {
          return yield* Effect.fail(
            new NotFoundError({
              entity: "Document",
              id: `${projectId}/${documentType}/v${version}`,
              message: `Document type "${documentType}" version ${version} not found for project "${projectId}"`,
            }),
          );
        }

        // Decode the row using the Document schema
        return yield* Schema.decodeUnknown(Document)(result[0]).pipe(
          Effect.catchTag("ParseError", (error) =>
            Effect.fail(
              new ValidationError({
                message: `Failed to parse document data: ${error.message}`,
              }),
            ),
          ),
        );
      }).pipe(
        Effect.catchTag("SqlError", (error) =>
          Effect.fail(
            new ValidationError({
              message: `Database error: ${error.message ?? "Unknown error"}`,
            }),
          ),
        ),
      );

    return {
      generateProjectPlan,
      getDocument,
      listDocuments,
      getDocumentVersion,
    } as const;
  }),
  dependencies: [ProjectService.Default, MilestoneService.Default, TaskService.Default],
}) {}

/**
 * Live layer for DocumentService with all dependencies
 */
export const DocumentServiceLive = DocumentService.Default;
