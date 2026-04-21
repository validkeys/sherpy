/**
 * Unit tests for API error schemas
 */

import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import {
  ConflictError,
  ForbiddenError,
  InternalError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "./errors"

describe("API Error Schemas", () => {
  describe("NotFoundError", () => {
    it.effect("creates valid 404 error", () =>
      Effect.gen(function* () {
        const error = new NotFoundError({
          entity: "Project",
          id: "proj-123",
          message: "Project not found",
        })

        expect(error._tag).toBe("NotFoundError")
        expect(error.entity).toBe("Project")
        expect(error.id).toBe("proj-123")
        expect(error.message).toBe("Project not found")
      }),
    )

    it.effect("handles optional message", () =>
      Effect.gen(function* () {
        const error = new NotFoundError({
          entity: "Task",
          id: "task-456",
        })
        expect(error._tag).toBe("NotFoundError")
      }),
    )
  })

  describe("ConflictError", () => {
    it.effect("creates valid 409 error", () =>
      Effect.gen(function* () {
        const error = new ConflictError({
          resource: "project-slug",
          conflictType: "duplicate",
          message: "A project with this slug already exists",
        })

        expect(error._tag).toBe("ConflictError")
        expect(error.conflictType).toBe("duplicate")
      }),
    )

    it.effect("validates all conflict types", () =>
      Effect.gen(function* () {
        const types = ["duplicate", "state-conflict", "constraint"] as const
        for (const conflictType of types) {
          const error = new ConflictError({
            resource: "test",
            conflictType,
            message: "Conflict",
          })
          expect(error.conflictType).toBe(conflictType)
        }
      }),
    )
  })

  describe("ValidationError", () => {
    it.effect("creates valid 400 error", () =>
      Effect.gen(function* () {
        const error = new ValidationError({
          field: "email",
          message: "Invalid email format",
          errors: ["Must be a valid email"],
        })

        expect(error._tag).toBe("ValidationError")
        expect(error.field).toBe("email")
      }),
    )

    it.effect("handles optional fields", () =>
      Effect.gen(function* () {
        const minimal = new ValidationError({
          message: "General validation error",
        })
        expect(minimal._tag).toBe("ValidationError")
        expect(minimal.field).toBeUndefined()
      }),
    )
  })

  describe("UnauthorizedError", () => {
    it.effect("creates valid 401 error", () =>
      Effect.gen(function* () {
        const error = new UnauthorizedError({
          message: "Missing or invalid JWT token",
        })

        expect(error._tag).toBe("UnauthorizedError")
        expect(error.message).toBe("Missing or invalid JWT token")
      }),
    )
  })

  describe("ForbiddenError", () => {
    it.effect("creates valid 403 error", () =>
      Effect.gen(function* () {
        const error = new ForbiddenError({
          resource: "project",
          action: "delete",
          message: "You do not have permission",
        })

        expect(error._tag).toBe("ForbiddenError")
        expect(error.resource).toBe("project")
        expect(error.action).toBe("delete")
      }),
    )
  })

  describe("InternalError", () => {
    it.effect("creates valid 500 error", () =>
      Effect.gen(function* () {
        const error = new InternalError({
          message: "An unexpected error occurred",
          cause: "Database connection failed",
        })

        expect(error._tag).toBe("InternalError")
        expect(error.message).toBe("An unexpected error occurred")
        expect(error.cause).toBe("Database connection failed")
      }),
    )

    it.effect("handles optional cause", () =>
      Effect.gen(function* () {
        const error = new InternalError({
          message: "Server error",
        })
        expect(error._tag).toBe("InternalError")
        expect(error.cause).toBeUndefined()
      }),
    )
  })

  describe("Error TaggedError structure", () => {
    it.effect("all errors have _tag discriminator", () =>
      Effect.gen(function* () {
        const errors = [
          new NotFoundError({ entity: "Test", id: "1" }),
          new ConflictError({
            resource: "test",
            conflictType: "duplicate",
            message: "Conflict",
          }),
          new ValidationError({ message: "Invalid" }),
          new UnauthorizedError({ message: "Unauthorized" }),
          new ForbiddenError({
            resource: "test",
            action: "read",
            message: "Forbidden",
          }),
          new InternalError({ message: "Error" }),
        ]

        const tags = errors.map((e) => e._tag)
        expect(tags).toContain("NotFoundError")
        expect(tags).toContain("ConflictError")
        expect(tags).toContain("ValidationError")
        expect(tags).toContain("UnauthorizedError")
        expect(tags).toContain("ForbiddenError")
        expect(tags).toContain("InternalError")
      }),
    )
  })
})
