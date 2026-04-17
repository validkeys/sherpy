---
code: SA-001
name: Effect.Service with Repository Pattern
category: services
tags: [effect, service, repository, dependency-injection, business-logic]
created: 2026-04-15
---

# Effect.Service with Repository Pattern

## Overview

Demonstrates the Effect.Service pattern with dependency injection for business logic services. Shows how to compose services with repositories, handle errors using Result types, and maintain type safety throughout the service layer. This is the standard pattern for all business logic in the codebase.

## Source Reference

**Repository:** current-project
**File:** `src/services/account-service.ts`
**Lines:** 15-65

[View in GitHub](https://github.com/yourorg/project/blob/main/src/services/account-service.ts#L15-L65)

## Code Example

```typescript
// src/services/account-service.ts:15-65
import { Effect, pipe } from "effect"
import { AccountRepository } from "../repositories/account-repository"
import { AccountNotFoundError, AccountValidationError } from "../errors"
import type { Account, AccountId, CreateAccountInput } from "../types"

export class AccountService extends Effect.Service<AccountService>()("AccountService", {
  effect: Effect.gen(function* () {
    const repo = yield* AccountRepository

    return {
      // Find account by ID with error handling
      findById: (id: AccountId) =>
        pipe(
          repo.findById(id),
          Effect.mapError((dbError) =>
            new AccountNotFoundError({
              accountId: id,
              cause: dbError
            })
          )
        ),

      // Create new account with validation
      create: (input: CreateAccountInput) =>
        pipe(
          validateAccountInput(input),
          Effect.flatMap((validated) => repo.create(validated)),
          Effect.mapError((error) =>
            error._tag === "ValidationError"
              ? new AccountValidationError({ input, cause: error })
              : error
          )
        ),

      // List accounts with pagination
      list: (page: number = 1, pageSize: number = 50) =>
        pipe(
          repo.list({ offset: (page - 1) * pageSize, limit: pageSize }),
          Effect.map((accounts) => ({
            accounts,
            page,
            pageSize,
            hasMore: accounts.length === pageSize
          }))
        ),

      // Update account with optimistic locking
      update: (id: AccountId, updates: Partial<Account>) =>
        pipe(
          repo.findById(id),
          Effect.flatMap((existing) =>
            pipe(
              validateAccountInput({ ...existing, ...updates }),
              Effect.flatMap((validated) => repo.update(id, validated))
            )
          ),
          Effect.mapError((error) =>
            error._tag === "NotFound"
              ? new AccountNotFoundError({ accountId: id, cause: error })
              : new AccountValidationError({ input: updates, cause: error })
          )
        )
    }
  }),
  dependencies: [AccountRepository.Default]
}) {}

// Helper for input validation
const validateAccountInput = (input: CreateAccountInput) =>
  Effect.try({
    try: () => AccountSchema.parse(input),
    catch: (error) => new ValidationError({ message: "Invalid account data", cause: error })
  })
```

## What This Demonstrates

- **Effect.Service pattern** - Class-based service with dependency injection
- **Generator-based composition** - Using `Effect.gen` for readable async logic
- **Repository dependency** - Injecting repository through Effect's dependency system
- **Error mapping** - Converting repository errors to domain errors
- **Type safety** - Full TypeScript typing throughout the pipeline
- **Result types** - Using Effect for error handling instead of try/catch
- **Service methods** - Multiple related operations grouped in one service
- **Validation integration** - Schema validation integrated with error handling
- **Pagination pattern** - Offset/limit pagination with hasMore indicator

## When to Use

- **Business logic services** - Any service containing domain logic
- **Multi-step operations** - Operations requiring multiple repository calls
- **Error transformation** - When repository errors need domain context
- **Composable operations** - Operations that combine multiple effects
- **Dependency injection** - Services that depend on repositories or other services
- **Type-safe pipelines** - When maintaining types through transformation chains

## Pattern Requirements

✓ Extend `Effect.Service<T>()` with unique service name
✓ Use `Effect.gen` for service implementation (not raw promises)
✓ Inject dependencies through `dependencies` array
✓ Return service methods as Effect types (not raw Promises)
✓ Map repository errors to domain-specific errors
✓ Use `pipe` for transformation chains (not method chaining)
✓ Validate inputs before passing to repository
✓ Type all inputs and outputs explicitly
✓ Group related operations in single service class

## Common Mistakes to Avoid

❌ Using `async/await` instead of Effect.gen - breaks Effect composition
❌ Returning Promises instead of Effects from service methods
❌ Not mapping errors - letting repository errors leak to API layer
❌ Injecting services via constructor - use Effect dependencies instead
❌ Mixing Effect and Promise - choose one approach consistently
❌ Forgetting to yield dependencies - causes "cannot read property" errors
❌ Using try/catch - use Effect.try or Effect.tryPromise instead
❌ Creating new service instances - services are singletons via dependency system
❌ Not validating inputs - repository should receive validated data only

## Related Anchors

- **SA-002** - Repository with SQL Query Builder (data access layer)
- **SA-004** - Effect.Service Testing with Mocks (testing this pattern)
- **SA-015** - Error Handling with Result Types (error mapping strategies)
- **SA-023** - Schema Validation with Zod (input validation approach)

## Test Coverage

See **SA-004** for comprehensive testing patterns for Effect.Service implementations, including mocking dependencies and testing error scenarios.

## Additional Notes

- **Effect version**: Requires Effect 3.0+ for latest Service API
- **Performance**: Effect.gen has minimal overhead compared to raw Effects
- **Migration**: When converting from Promise-based services, replace `async/await` with `Effect.gen` and `yield*`
- **Debugging**: Use `Effect.tapError` to log errors without changing flow
- **Transactions**: Wrap multiple repository calls in `Effect.gen` for transaction-like semantics
- **Caching**: Consider **SA-031** for adding caching layer to services
