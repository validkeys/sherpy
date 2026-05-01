# Bug Report: API 500 Errors on Milestones and Documents Endpoints

**Date:** 2026-04-30  
**Branch:** `worktree-ui-refactor`  
**Reported By:** Claude (M3 Files Tab Testing)  
**Severity:** High - Blocks M3 Files Tab end-to-end testing

---

## Summary

The API server returns 500 Internal Server Error responses when attempting to:
1. List milestones for a project (`GET /api/projects/:projectId/milestones`)
2. Generate documents (`POST /api/projects/:projectId/documents/generate`)

This prevents testing the M3 Files Tab feature with real document data from the database.

---

## Environment

- **API Server:** Running on `http://localhost:3100`
- **Web Dev Server:** Running on `http://localhost:5173` (Vite)
- **Backend Mode:** Mock runtime (VITE_BACKEND_URL not set)
- **Database:** SQLite (location unknown - no .db files found in packages/api/)
- **Working Directory:** `/workspace/.claude/worktrees/ui-refactor`

---

## Bug #1: Milestone List Endpoint Returns 500

### Endpoint
`GET /api/projects/:projectId/milestones`

### Steps to Reproduce
1. Create a project successfully:
   ```bash
   curl -X POST http://localhost:3100/api/projects \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test Project",
       "description": "A test project for Files Tab testing",
       "slug": "test-project",
       "tags": ["test", "demo"],
       "priority": "high"
     }'
   ```
   Response: Project created with ID `b45071cb-b7f6-4f45-a875-7a712e28ae42` ✅

2. Attempt to list milestones for the project:
   ```bash
   curl -v "http://localhost:3100/api/projects/b45071cb-b7f6-4f45-a875-7a712e28ae42/milestones"
   ```

### Expected Result
```json
{
  "milestones": []
}
```
(Empty array since no milestones created yet)

### Actual Result
```
< HTTP/1.1 500 Internal Server Error
< Date: Thu, 30 Apr 2026 20:20:03 GMT
< Connection: keep-alive
< Keep-Alive: timeout=5
< Transfer-Encoding: chunked
```

No response body returned (empty payload).

### Impact
- Cannot create milestones for projects
- Cannot test document generation (depends on milestones)
- Blocks M3 Files Tab testing with populated data

---

## Bug #2: Document Generation Returns 500

### Endpoint
`POST /api/projects/:projectId/documents/generate`

### Steps to Reproduce
1. Using project ID from Bug #1: `b45071cb-b7f6-4f45-a875-7a712e28ae42`

2. Attempt to generate a YAML document:
   ```bash
   curl -v -X POST "http://localhost:3100/api/projects/b45071cb-b7f6-4f45-a875-7a712e28ae42/documents/generate" \
     -H "Content-Type: application/json" \
     -d '{"documentType": "implementation-plan", "format": "yaml"}'
   ```

### Expected Result
```json
{
  "document": {
    "id": "...",
    "projectId": "b45071cb-b7f6-4f45-a875-7a712e28ae42",
    "documentType": "implementation-plan",
    "format": "yaml",
    "content": "...",
    "version": 1,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### Actual Result
```
< HTTP/1.1 500 Internal Server Error
< Date: Thu, 30 Apr 2026 20:20:32 GMT
< Connection: keep-alive
< Keep-Alive: timeout=5
< Transfer-Encoding: chunked
```

No response body returned (empty payload).

### Impact
- Cannot generate documents to populate the database
- Cannot test Files Tab with YAML/Markdown document rendering
- Cannot verify document tree view and preview functionality
- M3 milestone acceptance criteria cannot be fully validated

---

## Related Information

### API Endpoints that Work ✅
- `GET /api/health` - Health check
- `POST /api/projects` - Create project
- `GET /api/projects` - List projects (returns empty array when no projects)
- `GET /api/projects/:projectId/documents` - List documents (returns `{"documents": []}`)

### Code References
- **Document Service:** `packages/api/src/services/document-service.ts`
  - Line 238-318: `generateProjectPlan()` method
  - Line 246: Fetches milestones via `milestoneService.listByProject()`
  - Likely failing when trying to fetch milestones
  
- **Milestone Service:** `packages/api/src/services/milestone-service.ts`
  - Need to investigate list methods
  
- **API Routes:**
  - `packages/api/src/api/routes/documents.ts`
  - `packages/api/src/api/routes/milestones.ts`

### Hypothesis
1. **Milestone Service** may have a database query error
2. **Document Generation** fails because it depends on fetching milestones (line 246 in document-service.ts)
3. Possible issues:
   - SQL query syntax error
   - Missing database table or schema migration
   - Type mismatch in Effect/Schema validation
   - Database connection issue

---

## Debug Recommendations

1. **Check API Server Logs:**
   - Find where API server logs are written
   - Look for stack traces or error messages from the 500 responses
   - Check Effect error handling in service layers

2. **Verify Database State:**
   - Locate the SQLite database file
   - Run `.schema milestones` to verify table exists
   - Check if migrations have been applied

3. **Test Milestone Service Directly:**
   - Add debug logging to `MilestoneService.listByProject()`
   - Check SQL query being executed
   - Verify Effect error handling

4. **Test with Minimal Data:**
   - Try creating a milestone directly via API
   - Check if the issue is with listing or creating
   - Try document generation with a project that has no milestones (should work with empty milestones array)

---

## Workarounds for M3 Testing

Since document generation is blocked, consider:

### Option A: Direct Database Insert
Manually insert test documents into the `documents` table:
```sql
INSERT INTO documents (id, project_id, document_type, format, content, version, created_at, updated_at)
VALUES (
  'test-doc-1',
  'b45071cb-b7f6-4f45-a875-7a712e28ae42',
  'implementation-plan',
  'yaml',
  'project:\n  name: Test Project\n  status: active',
  1,
  datetime('now'),
  datetime('now')
);
```

### Option B: Fix API Issues First
Debug and fix the 500 errors before continuing M3 testing.

### Option C: Test Empty State Only
Consider M3 complete for empty state testing:
- ✅ UI shows "No documents available yet" when documents array is empty
- ✅ API integration working (no CORS errors)
- ✅ 43 unit tests passing
- ❌ Cannot test document tree view, file selection, or preview rendering

---

## M3 Acceptance Criteria Status

Blocked by API bugs:
- ❌ Files tab shows tree view with all folders (no documents to organize)
- ❌ Click file displays preview inline (no files to click)
- ❌ YAML rendering with syntax highlighting (no YAML documents)
- ❌ Markdown rendering with formatting (no Markdown documents)
- ❌ Visual feedback for selected file (no files to select)

Working:
- ✅ React Query integration complete
- ✅ Loading and error states functional
- ✅ Preview pane is read-only
- ✅ Empty state: "No documents available yet"

---

## Next Steps

1. **Immediate:** Investigate API server logs for 500 error details
2. **High Priority:** Fix milestone list endpoint
3. **High Priority:** Fix document generation endpoint
4. **Then:** Generate test documents and complete M3 end-to-end testing
5. **Finally:** Validate all M3 acceptance criteria with populated data

---

**Status:** 🔴 Blocking - Requires API bug fixes before M3 can be completed
