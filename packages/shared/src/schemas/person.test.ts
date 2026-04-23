/**
 * Unit tests for Person domain schema
 */

import { describe, expect, it } from "@effect/vitest";
import { DateTime, Effect } from "effect";
import { Person } from "./person";

describe("Person Schema", () => {
  describe("Person model", () => {
    it.effect("creates valid person", () =>
      Effect.gen(function* () {
        const person = new Person({
          id: "person-123",
          name: "John Doe",
          email: "john.doe@example.com",
          capacityHoursPerWeek: 40,
          createdAt: DateTime.unsafeMake(new Date()),
          updatedAt: DateTime.unsafeMake(new Date()),
        });

        expect(person.name).toBe("John Doe");
        expect(person.email).toBe("john.doe@example.com");
        expect(person.capacityHoursPerWeek).toBe(40);
      }),
    );

    it.effect("validates email pattern", () =>
      Effect.gen(function* () {
        const validEmails = ["user@example.com", "test+tag@domain.org"];
        for (const email of validEmails) {
          const person = new Person({
            id: "test-id",
            name: "Test",
            email,
            capacityHoursPerWeek: 40,
            createdAt: DateTime.unsafeMake(new Date()),
            updatedAt: DateTime.unsafeMake(new Date()),
          });
          expect(person.email).toBe(email);
        }

        // Invalid email
        const result = yield* Effect.try(() => {
          new Person({
            id: "test-id",
            name: "Test",
            email: "not-an-email",
            capacityHoursPerWeek: 40,
            createdAt: DateTime.unsafeMake(new Date()),
            updatedAt: DateTime.unsafeMake(new Date()),
          });
        }).pipe(Effect.flip);
        expect(result).toBeDefined();
      }),
    );

    it.effect("validates capacity max 168 hours", () =>
      Effect.gen(function* () {
        const maxPerson = new Person({
          id: "test-id",
          name: "Test",
          email: "test@example.com",
          capacityHoursPerWeek: 168,
          createdAt: DateTime.unsafeMake(new Date()),
          updatedAt: DateTime.unsafeMake(new Date()),
        });
        expect(maxPerson.capacityHoursPerWeek).toBe(168);

        // Over 168
        const result = yield* Effect.try(() => {
          new Person({
            id: "test-id",
            name: "Test",
            email: "test@example.com",
            capacityHoursPerWeek: 169,
            createdAt: DateTime.unsafeMake(new Date()),
            updatedAt: DateTime.unsafeMake(new Date()),
          });
        }).pipe(Effect.flip);
        expect(result).toBeDefined();
      }),
    );
  });
});
