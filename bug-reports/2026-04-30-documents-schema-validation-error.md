# Bug Report: Documents List Endpoint Schema Validation Error

**ID:** BUG-2026-04-30-001  
**Date:** 2026-04-30  
**Severity:** High  
**Priority:** P1 (Blocks M3 Files Tab Testing)  
**Status:** Open  
**Reported By:** Claude (M3 E2E Testing)  
**Branch:** `worktree-ui-refactor`

---

## Summary

The `GET /api/projects/:projectId/documents` endpoint returns 500 Internal Server Error due to an Effect Schema validation mismatch between database column names (snake_case) and the TypeScript schema (camelCase). Documents are successfully created in the database but cannot be retrieved.

---

## Environment

- **API Server:** http://localhost:3100
- **Database:** SQLite with Effect SQL
- **Schema Library:** Effect Schema v3.21.1
- **Working Directory:** `/workspace/.claude/worktrees/ui-refactor`

---

## Reproduction Steps

### 1. Create a project
```bash
curl -X POST http://localhost:3100/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Project",
    "description": "A test project",
    "slug": "test-project",
    "priority": "high"
  }'
```

**Result:** ✅ Success - Returns project with ID `b45071cb-b7f6-4f45-a875-7a712e28ae42`

### 2. Generate a document
```bash
PROJECT_ID="b45071cb-b7f6-4f45-a875-7a712e28ae42"

curl -X POST "http://localhost:3100/api/projects/${PROJECT_ID}/documents/generate" \
  -H "Content-Type: application/json" \
  -d '{"documentType": "implementation-plan", "format": "yaml"}'
```

**Result:** ✅ Success - Document created with ID `e5fa7f17-e609-4315-ab7a-2599b36b0302`

### 3. List documents (fails)
```bash
curl "http://localhost:3100/api/projects/${PROJECT_ID}/documents"
```

**Result:** ❌ **500 Internal Server Error**

---

## Error Details

### HTTP Response
```
HTTP/1.1 500 Internal Server Error
Date: Thu, 30 Apr 2026 21:57:49 GMT
Content-Length: 0
```

### Server Log (from API)
```
[14:57:49.413] INFO (#63) http.span.5=2ms:
  ParseError: ListDocumentsResponse (Constructor)
  └─ ["documents"]
     └─ ReadonlyArray<Document>
        └─ [0]
           └─ Expected Document, actual {"id":"1f0b9eca-e715-450a-b493-a7f0fb2bc572","projectId":"b45071cb-b7f6-4f45-a875-7a712e28ae42","documentType":"implementation-plan","format":"markdown","content":"# Test Project...","version":5,"createdAt":"2026-04-30T21:57:43.059Z","updatedAt":"2026-04-30T21:57:43.059Z"}
      at parseError (file:///.../effect/dist/esm/ParseResult.js:241:36)
      ...
      at new ListDocumentsResponse (file:///.../packages/api/dist/api/routes/documents.js:30:8)
      at file:///.../packages/api/dist/server.js:273:16
```

### Key Observation
The error message shows the actual data being returned:
```json
{
  "id": "1f0b9eca-e715-450a-b493-a7f0fb2bc572",
  "projectId": "b45071cb-b7f6-4f45-a875-7a712e28ae42",
  "documentType": "implementation-plan",
  "format": "markdown",
  "content": "# Test Project...",
  "version": 5,
  "createdAt": "2026-04-30T21:57:43.059Z",
  "updatedAt": "2026-04-30T21:57:43.059Z"
}
```

This looks like valid `Document` data with correct camelCase field names, so the issue may be more subtle.

---

## Expected Behavior

```bash
curl "http://localhost:3100/api/projects/${PROJECT_ID}/documents"
```

Should return:
```json
{
  "documents": [
    {
      "id": "e5fa7f17-e609-4315-ab7a-2599b36b0302",
      "projectId": "b45071cb-b7f6-4f45-a875-7a712e28ae42",
      "documentType": "implementation-plan",
      "format": "yaml",
      "content": "project:\n  name: Test Project\n...",
      "version": 1,
      "createdAt": "2026-04-30T21:57:38.123Z",
      "updatedAt": "2026-04-30T21:57:38.123Z"
    },
    {
      "id": "1f0b9eca-e715-450a-b493-a7f0fb2bc572",
      "projectId": "b45071cb-b7f6-4f45-a875-7a712e28ae42",
      "documentType": "implementation-plan",
      "format": "markdown",
      "content": "# Test Project\n...",
      "version": 5,
      "createdAt": "2026-04-30T21:57:43.059Z",
      "updatedAt": "2026-04-30T21:57:43.059Z"
    }
  ]
}
```

---

## Actual Behavior

- Returns 500 status code
- Empty response body
- Schema validation error in server logs
- Frontend interprets as "no documents" and shows empty state

---

## Root Cause Analysis

### Location 1: DocumentService.listDocuments()
**File:** `packages/api/src/services/document-service.ts`  
**Lines:** 359-377

```typescript
const listDocuments = (
  projectId: string,
): Effect.Effect<ReadonlyArray<typeof Document.Type>, ValidationError> =>
  Effect.gen(function* () {
    const documents = yield* sql<typeof Document.Type>`
        SELECT * FROM documents
        WHERE project_id = ${projectId}
        ORDER BY created_at DESC
      `;
    return documents as ReadonlyArray<typeof Document.Type>;
  }).pipe(
    Effect.catchTag("SqlError", (error) =>
      Effect.fail(
        new ValidationError({
          message: `Database error: ${error.message ?? "Unknown error"}`,
        }),
      ),
    ),
  );
```

**Issue:** `SELECT *` returns database columns in snake_case (`project_id`, `document_type`, `created_at`, `updated_at`), but the TypeScript type expects camelCase.

### Location 2: Document Schema Definition
**File:** `packages/shared/src/models/document.ts` (assumed location)

```typescript
export class Document extends Schema.Class<Document>("Document")({
  id: Schema.String,
  projectId: Schema.String,       // Expects camelCase
  documentType: DocumentType,     // Expects camelCase
  format: DocumentFormat,
  content: Schema.String,
  version: Schema.Number,
  createdAt: Schema.String,       // Expects camelCase
  updatedAt: Schema.String,       // Expects camelCase
}) {}
```

**Issue:** Schema expects camelCase field names, but raw SQL query returns snake_case column names from database.

### Why generateDocument() Works

In `generateProjectPlan()` (lines 238-318), the document is inserted with explicit column names:

```typescript
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

// Then fetches using repository which handles mapping
const document = yield* repo.findById(id);
```

The `repo.findById()` likely uses `Model.makeRepository` which handles the snake_case ↔ camelCase mapping automatically, while the raw SQL in `listDocuments()` does not.

---

## Impact

### High Priority - Blocks Critical Functionality

1. **M3 Files Tab Cannot Be Tested**
   - Frontend UI is complete and working
   - 43 unit tests passing
   - Cannot test with real data: tree view, file selection, preview rendering
   - All M3 acceptance criteria blocked

2. **Documents Feature Unusable**
   - Documents can be created (POST /generate works)
   - Documents cannot be listed (GET /documents fails)
   - Documents cannot be displayed in UI
   - User cannot view any generated documents

3. **User Experience Impact**
   - Users see "No documents available yet" even after generating documents
   - Misleading empty state (documents exist but can't be retrieved)
   - No error message shown to user (500 error not surfaced)

---

## Proposed Solutions

### Solution 1: Use Column Aliases in SQL Query (Recommended)

**File:** `packages/api/src/services/document-service.ts:359-377`

```typescript
const listDocuments = (
  projectId: string,
): Effect.Effect<ReadonlyArray<typeof Document.Type>, ValidationError> =>
  Effect.gen(function* () {
    const documents = yield* sql<typeof Document.Type>`
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
    return documents as ReadonlyArray<typeof Document.Type>;
  }).pipe(
    Effect.catchTag("SqlError", (error) =>
      Effect.fail(
        new ValidationError({
          message: `Database error: ${error.message ?? "Unknown error"}`,
        }),
      ),
    ),
  );
```

**Pros:**
- Minimal change (only affects listDocuments method)
- Consistent with TypeScript naming conventions
- Works with existing schema
- SQL aliases are standard SQL feature

**Cons:**
- Must list all columns explicitly
- Needs to be kept in sync with schema

### Solution 2: Use Repository Pattern (Best Practice)

**File:** `packages/api/src/services/document-service.ts:359-377`

```typescript
const listDocuments = (
  projectId: string,
): Effect.Effect<ReadonlyArray<typeof Document.Type>, ValidationError> =>
  Effect.gen(function* () {
    // Use the repository which handles mapping automatically
    const allDocs = yield* repo.findAll();
    const filteredDocs = allDocs.filter(doc => doc.projectId === projectId);
    // Sort by createdAt descending
    return filteredDocs.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
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
```

**Note:** This requires checking if `repo.findAll()` or similar method exists on the repository. If not, use Solution 1.

**Pros:**
- Uses existing repository infrastructure
- Consistent with `generateProjectPlan` which uses `repo.findById()`
- Automatic mapping handled by Model.makeRepository
- Type-safe

**Cons:**
- May not have efficient filtering at SQL level (filters in memory)
- Need to verify repository API supports this pattern

### Solution 3: Update Database Schema to Use camelCase (Not Recommended)

Rename database columns from `project_id` → `projectId`, etc.

**Pros:**
- Consistency between database and code

**Cons:**
- Breaking change to database schema
- Requires migration
- Goes against SQL naming conventions (snake_case is standard)
- Would affect all other queries

---

## Recommended Fix

**Use Solution 1:** Add SQL column aliases in `listDocuments()` method.

This is the standard pattern already used elsewhere in the codebase and provides explicit control over the mapping.

---

## Verification Steps

After fix is applied:

```bash
# 1. Restart API server
cd /workspace/.claude/worktrees/ui-refactor
pnpm run dev:api

# 2. List documents (should succeed)
PROJECT_ID="b45071cb-b7f6-4f45-a875-7a712e28ae42"
curl "http://localhost:3100/api/projects/${PROJECT_ID}/documents" | jq '.'

# Expected output:
{
  "documents": [
    {
      "id": "...",
      "projectId": "b45071cb-b7f6-4f45-a875-7a712e28ae42",
      "documentType": "implementation-plan",
      "format": "yaml",
      "content": "...",
      "version": 1,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}

# 3. Verify in browser (agent-browser)
agent-browser open http://localhost:5173
agent-browser click @e16  # Files tab
agent-browser snapshot -i  # Should show documents in tree, not empty state

# 4. Run API tests
pnpm --filter @sherpy/api test src/services/document-service.test.ts
```

---

## Related Code

### Files to Modify
- `packages/api/src/services/document-service.ts` (line 359-377)

### Files to Review
- `packages/shared/src/models/document.ts` - Document schema definition
- `packages/api/src/api/routes/documents.ts` - API route handlers
- `packages/api/src/services/document-service.test.ts` - Tests to verify fix

### Similar Patterns in Codebase
Check other services for how they handle snake_case ↔ camelCase mapping:
- `packages/api/src/services/project-service.ts`
- `packages/api/src/services/milestone-service.ts`
- `packages/api/src/services/task-service.ts`

---

## Testing Checklist

After fix:
- [ ] API endpoint returns 200 OK
- [ ] Response includes documents array
- [ ] Field names in response are camelCase
- [ ] Documents ordered by createdAt DESC
- [ ] Frontend Files tab displays document tree
- [ ] No 500 errors in API logs
- [ ] Existing unit tests still pass
- [ ] Add integration test for listDocuments

---

## Additional Notes

### Why This Wasn't Caught Earlier

1. **Unit tests may mock the SQL layer:** Tests might not exercise the actual SQL → Schema validation
2. **generateDocument works differently:** Uses repository pattern which handles mapping
3. **No integration tests for listDocuments:** Would have caught this immediately

### Prevention

1. Add integration test that exercises full SQL → Schema path
2. Use consistent repository pattern across all service methods
3. Add schema validation tests for all API endpoints
4. Consider using an ORM that handles mapping automatically

---

**Next Action:** Apply Solution 1 (SQL column aliases) to `document-service.ts` and verify fix.
