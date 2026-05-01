# OpenAPI/Swagger Status

**Status:** ⚠️  **Partially Implemented** - Infrastructure in place, temporarily disabled due to Schema limitations

---

## Current State

The API has infrastructure for OpenAPI/Swagger documentation via `@effect/platform`'s built-in `HttpApiSwagger` module, but it's currently **disabled** due to a technical limitation with Effect Schema's `DateTimeUtc` type.

### What's Ready

✅ `HttpApiSwagger` imported and configured  
✅ All API routes defined with proper schemas  
✅ Request/Response types fully specified  
✅ Error responses documented  
✅ OpenAPI helper utilities created (`packages/shared/src/schemas/openapi-helpers.ts`)  

### What's Blocking

❌ `Schema.DateTimeUtc` (used in `Model.DateTimeInsert` and `Model.DateTimeUpdate`) lacks `jsonSchema` annotation  
❌ Without this annotation, `HttpApiSwagger.layer()` crashes on startup with:  
```
Error: Missing annotation
at path: ["project"]["createdAt"]
details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
schema (Declaration): DateTimeUtcFromSelf
```

---

## Quick Start (Once Unblocked)

To enable OpenAPI/Swagger documentation, uncomment one line in `packages/api/src/server.ts`:

```typescript
// Current (disabled):
const HttpLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
  HttpServer.withLogAddress,
  // TODO: Enable OpenAPI/Swagger once DateTime fields have JSON Schema annotations
  // Layer.provide(HttpApiSwagger.layer({ path: "/docs" })),
  Layer.provide(SherryApiLive),
  //...
);

// After fix (enabled):
const HttpLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
  HttpServer.withLogAddress,
  Layer.provide(HttpApiSwagger.layer({ path: "/docs" })),
  Layer.provide(SherryApiLive),
  //...
);
```

This will expose:
- 📄 `GET /docs` - Interactive Swagger UI
- 📄 `GET /openapi.json` - OpenAPI 3.0 specification

---

## Solution Approaches

### Option 1: Wait for @effect/sql Update (Recommended)

The cleanest solution is for `@effect/sql` to add JSON Schema annotations to `Model.DateTimeInsert` and `Model.DateTimeUpdate` fields.

**Status:** Could file an issue/PR with Effect team

### Option 2: Custom DateTime Fields

Replace all `Model.DateTimeInsert`/`Model.DateTimeUpdate` with custom field definitions that include JSON Schema annotations.

**Complexity:** High - requires understanding `VariantSchema.Field` API  
**Maintenance:** Moderate - custom fields need to stay in sync with @effect/sql updates  

### Option 3: Schema Transform Middleware

Create middleware that intercepts OpenAPI generation and adds missing annotations dynamically.

**Complexity:** High - requires deep knowledge of Effect internals  
**Stability:** Risky - may break with Effect updates  

### Option 4: Manual OpenAPI Spec

Generate OpenAPI spec manually or via a separate tool (e.g., `openapi-generator`).

**Pros:** Full control over documentation  
**Cons:** Manual maintenance, gets out of sync with code  

---

## Workaround Attempts

We tried several approaches:

1. **✗ Direct annotation:** `Model.DateTimeInsert.annotations()` - `DateTimeInsert` doesn't have `.annotations()` method
2. **✗ VariantSchema.field():** - Complex API, couldn't get types to match properly
3. **✗ Re-export with annotation:** - DateTime fields are special Model constructs, not simple schemas
4. **✓ Simplified helpers:** Created `openapi-helpers.ts` that re-exports fields (no functional change, but better organization)

---

## Current API Documentation Alternative

Until OpenAPI is enabled, use:

### TypeScript Types

All API types are fully typed and exported from `packages/api/src/api/routes/*.ts`:

```typescript
import { ProjectsApi, MilestonesApi, TasksApi, DocumentsApi } from "@sherpy/api";
```

### Manual Endpoint Documentation

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/projects` | GET, POST | List/create projects |
| `/api/projects/:id` | GET, PATCH | Get/update project |
| `/api/projects/:id/milestones` | GET, POST | List/create milestones |
| `/api/milestones/:id` | GET, PATCH | Get/update milestone |
| `/api/milestones/:id/tasks` | GET, POST | List/create tasks |
| `/api/tasks/:id` | GET, PATCH | Get/update task |
| `/api/projects/:id/documents` | GET | List documents |
| `/api/projects/:id/documents/generate` | POST | Generate document |
| `/api/chat/*` | Various | Chat/session endpoints |
| `/api/people/*` | Various | People management |
| `/api/skills/*` | Various | Skills management |
| `/api/assignments/*` | Various | Task assignments |

See individual route files for full request/response schemas.

---

## Related Files

- `packages/api/src/server.ts` (line 1187) - Swagger layer configuration
- `packages/shared/src/schemas/openapi-helpers.ts` - OpenAPI utility functions
- All schema files in `packages/shared/src/schemas/*.ts` - Use `GeneratedUuidWithOpenApi` for UUID fields

---

## Testing OpenAPI

Once enabled, test with:

```bash
# Start API server
npm run dev

# Access Swagger UI
open http://localhost:3100/docs

# Download OpenAPI spec
curl http://localhost:3100/openapi.json > openapi.json
```

---

**Next Steps:**  
1. Research Effect Schema JSON Schema annotation patterns
2. Consider filing issue with @effect/sql team
3. Explore alternative DateTime field definitions
4. Document workaround once found

**Last Updated:** 2026-04-30  
**Status:** Blocked by `Schema.DateTimeUtc` JSON Schema support
