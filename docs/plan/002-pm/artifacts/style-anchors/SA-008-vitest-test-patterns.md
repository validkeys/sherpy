---
code: SA-008
name: "@effect/vitest Test Patterns"
category: testing
tags: [effect, vitest, testing, layer, test-context, property]
created: 2026-04-20
---

# "@effect/vitest Test Patterns"

## Overview

Demonstrates the full range of `@effect/vitest` testing patterns including `it.effect`, `it.scoped`, `it.scopedLive`, `layer()` for test context, nested layers, `TestClock` for time-based testing, and property testing with `it.prop` / `it.effect.prop`.

## Source Reference

**Repository:** ~/Sites/ai-use-repos/effect
**File:** `packages/vitest/test/index.test.ts`
**Lines:** 1-245

## Code Example

```typescript
import { afterAll, describe, expect, it, layer } from "@effect/vitest"
import {
  Context, Duration, Effect, FastCheck, Fiber, Layer, Schema, TestClock,
} from "effect"

// Basic Effect test blocks
it.effect("basic effect test", () =>
  Effect.sync(() => expect(1).toEqual(1))
)

it.scoped("scoped test", () =>
  Effect.acquireRelease(
    Effect.sync(() => expect(1).toEqual(1)),
    () => Effect.void,
  )
)

it.scopedLive("scopedLive test", () =>
  Effect.acquireRelease(
    Effect.sync(() => expect(1).toEqual(1)),
    () => Effect.void,
  )
)

// Service under test
class Sleeper extends Effect.Service<Sleeper>()("Sleeper", {
  effect: Effect.gen(function* () {
    const clock = yield* Effect.clock
    return {
      sleep: (ms: number) => clock.sleep(Duration.millis(ms)),
    } as const
  }),
}) {}

// Layer-based test context
class Foo extends Context.Tag("Foo")<Foo, "foo">() {
  static Live = Layer.succeed(Foo, "foo")
}

class Bar extends Context.Tag("Bar")<Bar, "bar">() {
  static Live = Layer.effect(Bar, Effect.map(Foo, () => "bar" as const))
}

describe("layer", () => {
  layer(Foo.Live)((it) => {
    it.effect("accesses foo", () =>
      Effect.gen(function* () {
        const foo = yield* Foo
        expect(foo).toEqual("foo")
      }))

    it.layer(Bar.Live)("nested layer", (it) => {
      it.effect("accesses both", () =>
        Effect.gen(function* () {
          const foo = yield* Foo
          const bar = yield* Bar
          expect(foo).toEqual("foo")
          expect(bar).toEqual("bar")
        }))
    })
  })

  // TestClock for time-based testing
  layer(Sleeper.Default)("test services", (it) => {
    it.effect("TestClock advances time", () =>
      Effect.gen(function* () {
        const sleeper = yield* Sleeper
        const fiber = yield* Effect.fork(sleeper.sleep(100_000))
        yield* Effect.yieldNow()
        yield* TestClock.adjust(100_000)
        yield* Fiber.join(fiber)
      }))
  })

  // Exclude test services for real-time tests
  layer(Sleeper.Default, { excludeTestServices: true })("live services", (it) => {
    it.effect("real Clock", () =>
      Effect.gen(function* () {
        const sleeper = yield* Sleeper
        yield* sleeper.sleep(1)
      }))
  })
})

// Property testing
it.effect.prop(
  "property test",
  [Schema.Finite.pipe(Schema.nonNaN()), FastCheck.integer()],
  ([a, b]) =>
    Effect.gen(function* () {
      yield* Effect.void
      return a + b === b + a
    }),
  { fastCheck: { numRuns: 200 } },
)
```

## What This Demonstrates

- **it.effect** - Test block that runs an Effect (with TestServices provided)
- **it.scoped** - Test block with scoped resources (acquire/release pattern)
- **it.scopedLive** - Like scoped but uses real time instead of TestClock
- **layer()** - Provide a Layer as test context, available to all tests in block
- **Nested layers** - `it.layer(Bar.Live)` inside a `layer(Foo.Live)` block
- **TestClock.adjust** - Advance virtual time for testing time-dependent effects
- **excludeTestServices** - Opt out of TestClock/other test services for real-time tests
- **it.effect.prop** - Property-based testing with Schema and FastCheck generators
- **Effect.fork + Fiber.join** - Testing concurrent effects

## When to Use

- **All backend tests** - Every test in `packages/api/test/` and `packages/shared/test/`
- **Service testing** - When testing Effect.Service implementations with dependency injection
- **Time-based tests** - When testing timeouts, schedules, retry delays
- **Property tests** - When testing pure functions with many possible inputs

## Pattern Requirements

✓ Import `it`, `layer`, `describe`, `expect`, `assert` from `@effect/vitest`
✓ Use `it.effect` for Effect-returning test blocks (not plain `it`)
✓ Use `layer(ServiceLayer)` to provide service context to test blocks
✓ Use `it.scoped` when test needs scoped resources with cleanup
✓ Use `TestClock.adjust(ms)` for time-dependent tests (not real sleeps)
✓ Use `{ excludeTestServices: true }` when real time/network is needed
✓ Access context services via `yield*` inside `Effect.gen` in tests

## Common Mistakes to Avoid

✗ Using plain `it()` for Effect tests — doesn't provide Effect runtime
✗ Using `setTimeout` or real sleeps in tests — use `TestClock.adjust` instead
✗ Not providing required Layers in test context — missing service errors
✗ Forgetting `Effect.gen` wrapper when using `yield*` — syntax error
✗ Using `Effect.runPromise` in tests — @effect/vitest handles runtime

## Related Anchors

- **SA-001** - Effect.Service pattern (what you're testing)
- **SA-009** - SQL testing with @effect/vitest (database-specific test patterns)
