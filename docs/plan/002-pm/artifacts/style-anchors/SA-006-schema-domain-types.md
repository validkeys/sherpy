---
code: SA-006
name: Effect Schema Domain Types
category: validation
tags: [effect, schema, validation, domain-types, struct]
created: 2026-04-20
---

# Effect Schema Domain Types

## Overview

Demonstrates how to define domain type schemas using `@effect/schema`'s `Schema.Struct`, `Schema.Literal`, `Schema.optional`, and nested schema composition. Shows the pattern of defining a TypeScript interface alongside its schema, using `Schema.Literal` for enum-like types, and exporting helper factory functions.

## Source Reference

**Repository:** ~/Sites/ai-use-repos/EffectPatterns
**File:** `packages/pipeline-state/src/schemas.ts`
**Lines:** 1-234

## Code Example

```typescript
import { Schema as S } from "@effect/schema"

export type WorkflowStep =
  | "draft"
  | "ingested"
  | "tested"
  | "validated"
  | "published"
  | "finalized"

export const WorkflowStepSchema = S.Literal(
  "draft",
  "ingested",
  "tested",
  "validated",
  "published",
  "finalized",
)

export type StepStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped"

export const StepStatusSchema = S.Literal(
  "pending",
  "running",
  "completed",
  "failed",
  "skipped",
)

export interface StepCheckpoint {
  readonly operation: string
  readonly timestamp: string
  readonly data?: unknown
  readonly error?: string
}

export const StepCheckpointSchema = S.Struct({
  operation: S.String,
  timestamp: S.String,
  data: S.optional(S.Unknown),
  error: S.optional(S.String),
})

export interface StepState {
  readonly status: StepStatus
  readonly startedAt?: string
  readonly completedAt?: string
  readonly duration?: number
  readonly attempts: number
  readonly checkpoints: readonly StepCheckpoint[]
  readonly errors?: readonly string[]
}

export const StepStateSchema = S.Struct({
  status: StepStatusSchema,
  startedAt: S.optional(S.String),
  completedAt: S.optional(S.String),
  duration: S.optional(S.Number),
  attempts: S.Number,
  checkpoints: S.Array(StepCheckpointSchema),
  errors: S.optional(S.Array(S.String)),
})

export interface PatternState {
  readonly id: string
  readonly status: WorkflowStatus
  readonly currentStep: WorkflowStep
  readonly steps: Readonly<Record<WorkflowStep, StepState>>
  readonly metadata: PatternMetadata
  readonly errors: readonly PatternError[]
  readonly createdAt: string
  readonly updatedAt: string
}

export const PatternStateSchema = S.Struct({
  id: S.String,
  status: WorkflowStatusSchema,
  currentStep: WorkflowStepSchema,
  steps: S.Unknown,
  metadata: PatternMetadataSchema,
  errors: S.Array(PatternErrorSchema),
  createdAt: S.String,
  updatedAt: S.String,
})

export const createInitialStepState = (): StepState => ({
  status: "pending",
  attempts: 0,
  checkpoints: [],
})

export const createInitialPatternState = (
  id: string,
  metadata: PatternMetadata,
): PatternState => ({
  id,
  status: "draft",
  currentStep: "draft",
  steps: {
    draft: { ...createInitialStepState(), status: "completed" },
    ingested: createInitialStepState(),
    tested: createInitialStepState(),
  },
  metadata,
  errors: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})
```

## What This Demonstrates

- **Schema.Literal for enums** - Union of literal strings as type-safe enum schemas
- **Co-located type + schema** - TypeScript `type` alongside matching `Schema` for type extraction
- **Schema.Struct** - Object schemas with named, typed fields
- **Schema.optional** - Optional fields that may be undefined
- **Schema.Array** - Typed array fields with element schema
- **Nested schema composition** - `StepStateSchema` references `StepCheckpointSchema`
- **Factory functions** - `createInitialStepState()` helpers for constructing valid initial state
- **S.optional(S.Unknown)** - Escape hatch for loosely-typed optional fields

## When to Use

- **Domain type definitions** - All types in `packages/shared/src/schemas/` and `packages/shared/src/types/`
- **Enum-like types** - Pipeline status, task status, priority levels
- **Nested domain objects** - State objects containing other typed objects
- **API contracts** - When types need runtime validation (not just compile-time)
- **WebSocket event types** - In `packages/shared/src/events/`

## Pattern Requirements

✓ Define a TypeScript `type` alongside each schema for IDE support
✓ Use `Schema.Literal(...)` for enum-like string unions
✓ Use `Schema.Struct({...})` for object types with named fields
✓ Use `S.optional(Schema)` for optional fields (may be undefined)
✓ Compose schemas by referencing other schemas (e.g., `S.Array(StepCheckpointSchema)`)
✓ Export factory functions like `createInitialState()` for constructing valid instances
✓ Name schemas with the `Schema` suffix (e.g., `StepStatusSchema`, not `StepStatus`)

## Common Mistakes to Avoid

✗ Using TypeScript `enum` instead of `Schema.Literal` — no runtime validation
✗ Defining types without matching schemas — lose runtime validation
✗ Using `S.Any` or `S.Unknown` when a more specific schema is available
✗ Not exporting the TypeScript type alongside the schema — consumers need both
✗ Duplicating field definitions between interface and schema — keep them co-located

## Related Anchors

- **SA-007** - Schema.Class for API domain types (class-based schemas)
- **SA-002** - Model.Class with makeRepository (database entity schemas)
- **SA-004** - HttpApi definition (uses schemas for endpoint validation)
