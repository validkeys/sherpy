/**
 * Unit tests for Assignment domain schema
 */

import { describe, expect, it } from "@effect/vitest";
import { DateTime, Effect, Schema } from "effect";
import { Assignment, AssignmentStatus } from "./assignment";

describe("Assignment Schema", () => {
  describe("AssignmentStatus enum", () => {
    it.effect("accepts valid assignment statuses", () =>
      Effect.gen(function* () {
        const statuses = ["planned", "active", "completed", "cancelled"] as const;
        for (const status of statuses) {
          const decoded = yield* Schema.decodeUnknown(AssignmentStatus)(status);
          expect(decoded).toBe(status);
        }
      }),
    );
  });

  describe("Assignment model", () => {
    it.effect("creates valid assignment", () =>
      Effect.gen(function* () {
        const assignment = new Assignment({
          id: "assignment-123",
          taskId: "task-123",
          personId: "person-456",
          allocationPercentage: 50,
          status: "active" as const,
          createdAt: DateTime.unsafeMake(new Date()),
          updatedAt: DateTime.unsafeMake(new Date()),
        });

        expect(assignment.taskId).toBe("task-123");
        expect(assignment.allocationPercentage).toBe(50);
      }),
    );

    it.effect("validates allocationPercentage range 0-100", () =>
      Effect.gen(function* () {
        const validPercentages = [0, 50, 100];
        for (const allocationPercentage of validPercentages) {
          const assignment = new Assignment({
            id: "test-id",
            taskId: "task-123",
            personId: "person-456",
            allocationPercentage,
            status: "active" as const,
            createdAt: DateTime.unsafeMake(new Date()),
            updatedAt: DateTime.unsafeMake(new Date()),
          });
          expect(assignment.allocationPercentage).toBe(allocationPercentage);
        }

        // Above 100
        const result = yield* Effect.try(() => {
          new Assignment({
            id: "test-id",
            taskId: "task-123",
            personId: "person-456",
            allocationPercentage: 101,
            status: "active" as const,
            createdAt: DateTime.unsafeMake(new Date()),
            updatedAt: DateTime.unsafeMake(new Date()),
          });
        }).pipe(Effect.flip);
        expect(result).toBeDefined();
      }),
    );
  });
});
