/**
 * Unit tests for Document domain schema
 */

import { describe, expect, it } from "@effect/vitest"
import { DateTime, Effect, Schema } from "effect"
import { Document, DocumentFormat, DocumentType } from "./document"

describe("Document Schema", () => {
  describe("DocumentFormat enum", () => {
    it.effect("accepts valid document formats", () =>
      Effect.gen(function* () {
        const formats = ["yaml", "markdown", "json"] as const
        for (const format of formats) {
          const decoded = yield* Schema.decodeUnknown(DocumentFormat)(format)
          expect(decoded).toBe(format)
        }
      }),
    )
  })

  describe("DocumentType enum", () => {
    it.effect("accepts valid document types", () =>
      Effect.gen(function* () {
        const types = [
          "business-requirements",
          "technical-requirements",
          "implementation-plan",
        ] as const
        for (const type of types) {
          const decoded = yield* Schema.decodeUnknown(DocumentType)(type)
          expect(decoded).toBe(type)
        }
      }),
    )
  })

  describe("Document model", () => {
    it.effect("creates valid document", () =>
      Effect.gen(function* () {
        const document = new Document({
          id: "doc-123",
          projectId: "proj-123",
          documentType: "business-requirements" as const,
          format: "yaml" as const,
          content: "version: 1.0",
          version: 1,
          createdAt: DateTime.unsafeMake(new Date()),
          updatedAt: DateTime.unsafeMake(new Date()),
        })

        expect(document.projectId).toBe("proj-123")
        expect(document.documentType).toBe("business-requirements")
        expect(document.version).toBe(1)
      }),
    )

    it.effect("validates version as positive integer", () =>
      Effect.gen(function* () {
        const validVersions = [1, 2, 10]
        for (const version of validVersions) {
          const document = new Document({
            id: "test-id",
            projectId: "proj-123",
            documentType: "qa-test-plan" as const,
            format: "json" as const,
            content: "{}",
            version,
            createdAt: DateTime.unsafeMake(new Date()),
            updatedAt: DateTime.unsafeMake(new Date()),
          })
          expect(document.version).toBe(version)
        }

        // Zero
        const result = yield* Effect.try(() => {
          new Document({
            id: "test-id",
            projectId: "proj-123",
            documentType: "qa-test-plan" as const,
            format: "json" as const,
            content: "{}",
            version: 0,
            createdAt: DateTime.unsafeMake(new Date()),
            updatedAt: DateTime.unsafeMake(new Date()),
          })
        }).pipe(Effect.flip)
        expect(result).toBeDefined()
      }),
    )
  })
})
