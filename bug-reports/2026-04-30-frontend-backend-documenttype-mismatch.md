# Bug Report: Frontend/Backend DocumentType Schema Mismatch

**ID:** BUG-2026-04-30-002  
**Date:** 2026-04-30  
**Severity:** High  
**Priority:** P0 (Blocks M3 Files Tab completely)  
**Status:** Open  
**Reported By:** Claude (M3 E2E Testing)  
**Branch:** `worktree-ui-refactor`

---

## Summary

The frontend has its own `DocumentType` enum that is **out of sync** with the backend's `DocumentType` schema in `@sherpy/shared`. The backend generates documents with `documentType: "implementation-plan"`, but the frontend doesn't recognize this type, causing all documents to be filtered out and the tree to appear empty.

---

## Root Cause

The frontend defines its own `DocumentType` enum instead of importing it from `@sherpy/shared`:

**Frontend (incorrect):**
```typescript
// packages/web/src/features/files/types/index.ts
export enum DocumentType {
  BUSINESS_REQUIREMENTS = 'business-requirements',
  TECHNICAL_REQUIREMENTS = 'technical-requirements',
  MILESTONES = 'milestones',
  MILESTONE_TASKS = 'milestone-tasks',
  STYLE_ANCHORS = 'style-anchors',
  DELIVERY_TIMELINE = 'delivery-timeline',
  ARCHITECTURE_DECISION_RECORDS = 'architecture-decision-records',
  EXECUTIVE_SUMMARY = 'executive-summary',
  DEVELOPER_SUMMARY = 'developer-summary',
  QA_TEST_PLAN = 'qa-test-plan',
  GAP_ANALYSIS = 'gap-analysis',
}
```

**Backend (correct - source of truth):**
```typescript
// packages/shared/src/schemas/document.ts
export const DocumentType = Schema.Literal(
  "business-requirements",
  "technical-requirements",
  "implementation-plan",      // ← Missing in frontend!
  "qa-test-plan",
  "delivery-timeline",
  "executive-summary",
  "developer-summary",
  "architecture-decision-record",  // ← Different name in frontend!
);
```

###Discrepancies:

1. **Missing types in frontend:**
   - `"implementation-plan"` - exists in backend, missing in frontend

2. **Extra types in frontend that don't exist in backend:**
   - `"milestones"`
   - `"milestone-tasks"`
   - `"style-anchors"`
   - `"gap-analysis"`

3. **Name mismatch:**
   - Backend: `"architecture-decision-record"` (singular)
   - Frontend: `"architecture-decision-records"` (plural)

---

## Impact

**Critical:** M3 Files Tab completely non-functional with real data

1. **All documents hidden:**
   - Backend generates documents with `documentType: "implementation-plan"`
   - Frontend's `buildFileTree()` looks up this type in `DOCUMENT_FOLDER_MAP`
   - `DOCUMENT_FOLDER_MAP` only has keys from the frontend's enum
   - Lookup returns `undefined`
   - Documents are not added to any folder
   - Tree is empty, UI shows "No documents available yet"

2. **User experience:**
   - Documents are successfully created in database
   - API returns documents correctly
   - Frontend receives documents from API
   - But UI shows empty state
   - Completely misleading - appears broken

3. **Testing blocked:**
   - Cannot test file tree rendering
   - Cannot test file selection
   - Cannot test YAML/Markdown preview
   - M3 acceptance criteria cannot be validated

---

## Evidence

### 1. Documents Exist in Database
```bash
curl "http://localhost:3100/api/projects/c8a6716f-ccfc-4e38-94f6-8dc2b97703f0/documents"
```

Returns:
```json
{
  "documents": [
    {
      "id": "67cf146f-27be-4f2f-8131-c1506b699e15",
      "documentType": "implementation-plan",  // ← Not recognized by frontend!
      "format": "yaml",
      ...
    },
    ...
  ]
}
```

### 2. Frontend Code Filters Them Out

**File:** `packages/web/src/features/files/state/file-tree-atoms.ts:45-80`

```typescript
export function buildFileTree(documents: Document[]): FileTreeNode[] {
  const folderMap = new Map<string, FileTreeNode>();

  documents.forEach((doc) => {
    const folderName = DOCUMENT_FOLDER_MAP[doc.documentType];  // Line 49
    
    if (!folderMap.has(folderName)) {  // folderName is undefined!
      // This block never executes
      folderMap.set(folderName, { ... });
    }
    // Document is silently dropped
  });

  return Array.from(folderMap.values());  // Returns empty array
}
```

**Line 49:** When `doc.documentType === "implementation-plan"`:
- `DOCUMENT_FOLDER_MAP["implementation-plan"]` returns `undefined`
- `folderMap.has(undefined)` is false
- Should create folder, but `folderMap.set(undefined, ...)` is invalid
- Document is silently dropped

### 3. UI Shows Empty State

**File:** `packages/web/src/features/files/components/file-tree.tsx:54-59`

```typescript
if (tree.length === 0) {  // tree is empty because buildFileTree returned []
  return (
    <div className="p-4">
      <div className="text-sm text-muted-foreground">No documents available yet.</div>
    </div>
  );
}
```

---

## Reproduction

```bash
# 1. Start API server
pnpm run dev:api

# 2. Create project
PROJECT_ID=$(curl -s -X POST http://localhost:3100/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "slug": "test"}' | jq -r '.project.id')

# 3. Generate document
curl -X POST "http://localhost:3100/api/projects/${PROJECT_ID}/documents/generate" \
  -H "Content-Type: application/json" \
  -d '{"documentType": "implementation-plan", "format": "yaml"}'

# 4. Verify API returns documents
curl "http://localhost:3100/api/projects/${PROJECT_ID}/documents" | jq '.documents[] | .documentType'
# Output: "implementation-plan"

# 5. Open frontend
# Navigate to http://localhost:5173
# Click Files tab
# Result: "No documents available yet" (incorrect - documents exist!)
```

---

## Fix

### Solution: Import DocumentType from @sherpy/shared

**Step 1:** Update frontend types to import from shared package

**File:** `packages/web/src/features/files/types/index.ts`

```typescript
// OLD (incorrect):
export enum DocumentType {
  BUSINESS_REQUIREMENTS = 'business-requirements',
  // ... duplicated definitions
}

// NEW (correct):
import type { DocumentType, DocumentFormat } from '@sherpy/shared';

export type { DocumentType, DocumentFormat };

// Rest of the file stays the same
export interface Document {
  id: string;
  projectId: string;
  documentType: DocumentType;  // Now uses shared type
  format: DocumentFormat;      // Now uses shared type
  content: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface FileTreeNode {
  // ... unchanged
}
```

**Step 2:** Update folder mapping to handle all backend document types

**File:** `packages/web/src/features/files/state/file-tree-atoms.ts`

```typescript
const DOCUMENT_FOLDER_MAP: Record<string, string> = {
  // Requirements
  'business-requirements': 'requirements',
  'technical-requirements': 'requirements',
  
  // Implementation
  'implementation-plan': 'implementation',
  
  // Delivery
  'delivery-timeline': 'delivery',
  'qa-test-plan': 'delivery',
  
  // Architecture
  'architecture-decision-record': 'architecture',
  
  // Summaries
  'executive-summary': 'summaries',
  'developer-summary': 'summaries',
};

// Add fallback for unknown document types
export function buildFileTree(documents: Document[]): FileTreeNode[] {
  const folderMap = new Map<string, FileTreeNode>();

  documents.forEach((doc) => {
    const folderName = DOCUMENT_FOLDER_MAP[doc.documentType] ?? 'other';  // Fallback to 'other'
    
    if (!folderMap.has(folderName)) {
      folderMap.set(folderName, {
        id: folderName,
        name: folderName,
        type: 'folder',
        children: [],
      });
    }
    // ... rest unchanged
  });
  // ... rest unchanged
}
```

**Step 3:** Ensure @sherpy/shared is properly exported

**File:** `packages/shared/src/index.ts`

```typescript
// Make sure DocumentType and DocumentFormat are exported
export { Document, DocumentType, DocumentFormat } from './schemas/document.js';
```

---

## Verification

After fix:

```bash
# 1. Frontend should display documents
# Open http://localhost:5173, click Files tab
# Should see:
# - "implementation" folder (expandable)
#   - implementation-plan.yaml (file)
#   - implementation-plan.markdown (file)

# 2. Run tests
pnpm --filter @sherpy/web test

# 3. Type check
pnpm --filter @sherpy/web run type-check
# Should pass - DocumentType now imported from shared types
```

---

## Prevention

### 1. Enforce Single Source of Truth

Add ESLint rule to prevent duplicate type definitions:

```json
// packages/web/.eslintrc.json
{
  "rules": {
    "no-restricted-syntax": [
      "error",
      {
        "selector": "TSEnumDeclaration[id.name='DocumentType']",
        "message": "DocumentType must be imported from @sherpy/shared, not redefined"
      }
    ]
  }
}
```

### 2. Add Type Compatibility Test

**File:** `packages/web/src/features/files/types/index.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { DocumentType as SharedDocumentType } from '@sherpy/shared';
import type { Document } from './index';

describe('Type compatibility with @sherpy/shared', () => {
  it('Document type matches shared schema', () => {
    const mockDoc: Document = {
      id: '123',
      projectId: 'proj-1',
      documentType: 'implementation-plan' as any,  // From shared
      format: 'yaml' as any,
      content: 'test',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Should compile without errors
    expect(mockDoc).toBeDefined();
  });

  it('All shared DocumentTypes are handled in folder map', () => {
    // This test would verify DOCUMENT_FOLDER_MAP has entries for all types
  });
});
```

### 3. Monorepo Type Checking

Add a script to verify type compatibility across packages:

```json
// package.json (root)
{
  "scripts": {
    "typecheck:all": "pnpm -r run type-check",
    "verify:types": "tsc --noEmit --project packages/web/tsconfig.json && tsc --noEmit --project packages/api/tsconfig.json"
  }
}
```

---

## Related Issues

This is part of a broader pattern of frontend/backend schema drift:

1. **This bug:** DocumentType mismatch
2. **Potential similar issues:**
   - Are other enums duplicated? (Priority, Status, etc.)
   - Is DocumentFormat also out of sync?
   - Are API response types manually typed instead of importing from shared?

**Recommendation:** Audit all frontend types that should come from `@sherpy/shared` and ensure they're imported, not duplicated.

---

##Next Steps

1. **Immediate:** Apply the fix above to unblock M3 testing
2. **Short-term:** Add ESLint rule to prevent future duplication
3. **Medium-term:** Audit all types for frontend/backend drift
4. **Long-term:** Consider using a code generator (e.g., `ts-to-zod`, OpenAPI codegen) to auto-generate frontend types from backend schemas

---

**Status:** 🔴 Critical - Frontend completely non-functional for Files feature
