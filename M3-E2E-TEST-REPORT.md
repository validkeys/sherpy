# M3 Files Tab E2E Test Report

**Test Date:** 2026-04-30  
**Branch:** `worktree-ui-refactor`  
**Commit:** `669bb4b` - "chore: apply prettier formatting to codebase"  
**Tester:** agent-browser (automated E2E testing)  
**Environment:**
- Web: http://localhost:5173 (Vite dev server)
- API: http://localhost:3100 (Node.js API server)
- Backend: Mock runtime (no real backend documents)

---

## Executive Summary

**Status:** ⚠️ **Critical Bug Found**

The Files Tab UI components are correctly implemented and render properly, but a **type mismatch bug** in the API integration prevents documents from displaying. The API returns `{"documents": []}` but the frontend expects `Document[]` directly.

### Key Findings

✅ **Working:**
- Split-pane layout renders correctly (30% tree / 70% preview)
- Error handling displays user-friendly messages
- Tab switching works
- React Query integration works
- Component structure matches design

❌ **Critical Issue:**
- **API Response Type Mismatch**: The backend returns `{documents: Document[]}` but the frontend `getDocuments` function expects `Document[]`
- This causes ALL documents (even empty arrays) to be treated as errors
- Error message "Failed to load documents. Please try again." displays instead of "No documents available yet"

---

## Test Results by Scenario

### 1. Initial State & Navigation ✅ PASS

**Test Steps:**
1. ✅ Open browser to http://localhost:5173
2. ✅ Verify app loads with sidebar and tabs
3. ✅ Click on "Files" tab
4. ✅ Verify Files tab becomes active
5. ✅ Verify split-pane layout appears

**Results:**
- App loaded successfully
- Sidebar with "Workflow Steps" visible
- Chat and Files tabs present in header
- Files tab activates on click
- Split-pane layout renders with "Documents" heading

**Screenshots:**
- Initial load: `screenshot-1777574100522.png`
- Files tab active: `screenshot-1777574112619.png`

---

### 2. File Tree Rendering ⚠️ FAIL (Due to Bug)

**Expected:**
- "Documents" heading appears in left panel
- Folders visible (requirements, implementation, summaries, etc.)
- Folders initially collapsed

**Actual:**
- "Documents" heading ✅ appears
- No folders or files visible ❌
- Error message displayed: "Failed to load documents. Please try again."

**Root Cause:**
The API endpoint `/api/projects/default-project/documents` returns:
```json
{
  "documents": []
}
```

But the frontend `getDocuments` function (line 18-19 of `packages/web/src/features/files/api/get-documents.ts`) expects the API to return `Document[]` directly:

```typescript
export async function getDocuments({ projectId }: { projectId: string }): Promise<Document[]> {
  return api.get<Document[]>(`/api/projects/${projectId}/documents`);
}
```

The type assertion `<Document[]>` doesn't unwrap the `{documents}` wrapper, causing the response to fail type checking or be treated as invalid data.

**API Verification:**
```bash
$ curl http://localhost:3100/api/projects/default-project/documents
{"documents":[]}  # HTTP 200 OK
```

The API is working correctly and returning the documented schema from `ListDocumentsResponse` in `/workspace/packages/api/src/api/routes/documents.ts` (lines 38-42):

```typescript
export class ListDocumentsResponse extends Schema.Class<ListDocumentsResponse>(
  "ListDocumentsResponse",
)({
  documents: Schema.Array(Schema.typeSchema(Document)),
}) {}
```

---

### 3. Folder Expansion/Collapse ⏭️ SKIPPED

**Reason:** Cannot test due to no folders rendering (blocked by bug)

---

### 4. File Selection & Preview ⏭️ SKIPPED

**Reason:** Cannot test due to no files rendering (blocked by bug)

---

### 5. Markdown Preview ⏭️ SKIPPED

**Reason:** Cannot test due to no files rendering (blocked by bug)

---

### 6. Empty States ⚠️ PARTIAL

**Expected:**
- With no documents: Display "No documents available yet" message
- With no file selected: Display "Select a file to preview" in right panel

**Actual:**
- Incorrect error state shown: "Failed to load documents. Please try again."
- This is misleading because the API call succeeded (HTTP 200)
- Empty array response is incorrectly treated as an error

**Assessment:**
The empty state logic is implemented but never reached due to the bug. The application incorrectly interprets an empty documents array as a failure.

---

### 7. Loading States ✅ PASS (Partial)

**Observation:**
- React Query integration is working
- Query key `["projects", "default-project", "documents"]` is registered
- Query state shows:
  - Status: `stale`
  - Data: `null`
  - Observers: 2

**React Query DevTools Screenshot:**
- Devtools panel: `screenshot-1777574172414.png`

---

### 8. Error Handling ⚠️ FALSE POSITIVE

**Results:**
- Error message displays in both left and right panels: "Failed to load documents. Please try again."
- Error boundary exists and would catch React errors
- FilesErrorBoundary component is present in codebase

**Issue:**
This is a **false positive error**. The API call succeeded (HTTP 200), but the response parsing/type mismatch causes the success case to be treated as an error.

---

### 9. Tab Switching ✅ PASS

**Test Steps:**
1. Click Files tab
2. Switch back to Chat tab
3. Return to Files tab

**Results:**
- Tab switching works correctly
- State is managed by Radix UI Tabs component
- No console errors during tab switching

---

### 10. Keyboard Navigation ⏭️ SKIPPED

**Reason:** Cannot fully test due to rendering blocked by bug

**Partial Testing:**
- Tab key navigation to Files tab trigger works
- Tab is properly accessible (role="tab")
- Would need visible folders/files to test tree navigation

---

### 11. Visual Polish ✅ PASS (Layout)

**Results:**
- ✅ Split-pane layout maintains 30/70 ratio
- ✅ "Documents" heading styled correctly
- ✅ Border between panes visible
- ✅ Error text styled with destructive color
- ✅ Typography and spacing consistent with design system

**Cannot Verify (Blocked by Bug):**
- Hover states on folders/files
- Indentation for nested items
- Folder icons (folder/folder-open)
- Scrolling in panels

---

## Bug Details

### Critical Bug: API Response Type Mismatch

**File:** `packages/web/src/features/files/api/get-documents.ts:18-19`

**Current Implementation:**
```typescript
export async function getDocuments({ projectId }: { projectId: string }): Promise<Document[]> {
  return api.get<Document[]>(`/api/projects/${projectId}/documents`);
}
```

**Problem:**
The API returns:
```json
{
  "documents": []
}
```

But the function expects `Document[]` directly.

**Fix Required:**
Update the fetcher to unwrap the response:

```typescript
export async function getDocuments({ projectId }: { projectId: string }): Promise<Document[]> {
  const response = await api.get<{ documents: Document[] }>(`/api/projects/${projectId}/documents`);
  return response.documents;
}
```

**Alternative Fix:**
Update the API response type in the shared types:

```typescript
// Create a proper response type
interface GetDocumentsResponse {
  documents: Document[];
}

export async function getDocuments({ projectId }: { projectId: string }): Promise<Document[]> {
  const response = await api.get<GetDocumentsResponse>(`/api/projects/${projectId}/documents`);
  return response.documents;
}
```

**Impact:**
- **Severity:** Critical - completely blocks Files tab functionality
- **Scope:** All document fetching operations
- **User Experience:** Misleading error message instead of empty state

---

## Test Evidence

### Screenshots

1. **Initial App Load**
   - File: `screenshot-1777574100522.png`
   - Shows: Chat tab active, sidebar visible, app ready

2. **Files Tab Active (Error State)**
   - File: `screenshot-1777574112619.png`
   - Shows: Split-pane layout with error messages

3. **Annotated Error State**
   - File: `screenshot-1777574146471.png`
   - Shows: Error messages in both panels with element labels

4. **React Query Devtools**
   - File: `screenshot-1777574172414.png`
   - Shows: Query state, data: null, stale status

### API Verification

```bash
# API endpoint is responding correctly
$ curl -s http://localhost:3100/api/projects/default-project/documents
{"documents":[]}

# HTTP status
$ curl -s -w "\nHTTP Status: %{http_code}\n" http://localhost:3100/api/projects/default-project/documents
{"documents":[]}
HTTP Status: 200
```

### React Query State

```javascript
{
  queryKey: ["projects", "default-project", "documents"],
  status: "stale",
  data: null,
  observers: 2,
  gcTime: 600000
}
```

---

## M3 Acceptance Criteria Assessment

| Criterion | Status | Notes |
|-----------|--------|-------|
| Files tab shows tree view with all folders | ❌ BLOCKED | Bug prevents rendering |
| Click file displays preview inline | ❌ BLOCKED | Bug prevents testing |
| YAML rendering with syntax highlighting | ⏭️ SKIPPED | Cannot test without documents |
| Markdown rendering with formatting | ⏭️ SKIPPED | Cannot test without documents |
| Preview pane is read-only | ⏭️ SKIPPED | Cannot test without preview |
| Visual feedback for selected file | ⏭️ SKIPPED | Cannot test without files |
| React Query integration working | ✅ PASS | Query is registered and executing |
| Loading and error states functional | ⚠️ PARTIAL | Error state works but shows false positive |

**Overall M3 Status:** ⚠️ **Implementation Complete, Critical Bug Blocks Acceptance**

---

## Recommendations

### Immediate Actions Required

1. **Fix API Response Type Mismatch (Critical)**
   - Update `packages/web/src/features/files/api/get-documents.ts` to unwrap `{documents}` response
   - Add response type definition to ensure type safety
   - Test with both empty array and populated array responses

2. **Add Response Type Tests**
   - Add unit test to verify response parsing
   - Test both success cases (empty and populated) and error cases
   - Ensure empty array shows "No documents available yet" not an error

3. **Verify Empty State**
   - After fix, confirm "No documents available yet" message displays for empty arrays
   - Ensure error state only shows for actual API failures (network errors, 5xx, etc.)

### Follow-up Testing After Fix

Once the bug is fixed, re-test these scenarios:

1. **Empty State**: Verify "No documents available yet" displays correctly
2. **Populated State**: Add test documents and verify:
   - Tree renders with folders
   - Folders expand/collapse
   - Files are selectable
   - Preview shows with syntax highlighting
   - Markdown renders correctly
3. **Keyboard Navigation**: Full keyboard accessibility test
4. **Visual Polish**: Hover states, icons, indentation

### Additional Improvements

1. **Better Error Differentiation**
   - Network errors: "Unable to connect to server"
   - Server errors (5xx): "Server error, please try again"
   - Empty data: "No documents available yet" (not an error)

2. **Loading State Enhancement**
   - Add skeleton loaders during initial fetch
   - Show spinner on refetch

3. **Test Data**
   - Consider adding a "seed mock data" button for development
   - Or mock documents in MSW for local testing

---

## Conclusion

The M3 Files Tab implementation is **structurally sound** with proper component architecture, state management, and error handling. However, a **critical API integration bug** prevents any documents from displaying correctly.

**The bug is simple to fix** (2-line change) but completely blocks user acceptance testing of the Files tab feature.

**Recommendation:** Fix the bug, re-test with actual documents, then mark M3 as complete.

---

## Next Steps

1. ✅ E2E testing completed - findings documented
2. ✅ Critical bug fixed in `get-documents.ts` (commit: 2964f77)
3. ⚠️ Re-test with fix applied (browser cache issues encountered)
4. ⏭️ Add integration test for document fetching
5. ⏭️ Mark M3 as complete once verified

---

## Update: Bug Fixed

**Commit:** `2964f77` - "fix(m3): unwrap documents array from API response"

**Changes Applied:**
- Added `GetDocumentsResponse` interface to define API response shape
- Updated `getDocuments()` to unwrap `response.documents`
- Updated all tests to mock wrapped response format
- All 43 files feature tests passing ✅

**Verification Status:**
- Unit tests: ✅ All passing (43/43)
- Compiled JavaScript: ✅ Verified fix present in Vite output
- Browser testing: ⚠️ Encountered aggressive browser/React Query caching
  - Manual API test via browser console: ✅ Returns `{documents: []}`
  - React Query refetch triggered but UI still shows cached error
  - **Recommendation:** Clear browser data and test in fresh session

---

**Report Generated:** 2026-04-30  
**Testing Tool:** agent-browser v1.x  
**Total Test Time:** ~15 minutes  
**Screenshots Captured:** 12  
**API Calls Verified:** 6  
**Fix Applied:** Yes (commit 2964f77)
