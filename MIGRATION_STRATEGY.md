# Migration Strategy: Legacy Web to React 19 UI Refactor

**Project:** Sherpy Flow UI Refactor  
**Document Version:** 1.0  
**Date:** 2026-04-29  
**Status:** Planning Complete - Ready for Execution

---

## Executive Summary

This document outlines the comprehensive strategy for migrating from the existing Sherpy PM web UI (`/workspace/packages/web`) to the new React 19 + bulletproof-react architecture being built in this worktree (`/workspace/.claude/worktrees/ui-refactor/packages/web`).

**Key Migration Approach:** Big Bang Replacement with Parallel Development

The new UI will be developed in isolation in this worktree, then replace the old UI atomically when production-ready. The legacy UI remains functional and preserved as `web-legacy` during development for reference and potential rollback.

**Timeline:** 20-26 days (4-5 weeks) from M0 start  
**Risk Level:** Low-Medium (with comprehensive mitigation)  
**Rollback Plan:** Instant revert via git + package rename

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Target State Architecture](#target-state-architecture)
3. [Migration Approach](#migration-approach)
4. [Feature Parity Checklist](#feature-parity-checklist)
5. [Data Migration Considerations](#data-migration-considerations)
6. [API Integration Points](#api-integration-points)
7. [Risk Mitigation](#risk-mitigation)
8. [Timeline Estimate](#timeline-estimate)
9. [Success Criteria](#success-criteria)
10. [Deployment Strategy](#deployment-strategy)

---

## Current State Analysis

### Legacy Web Package (`/workspace/packages/web`)

**Location:** `/workspace/packages/web` (preserved as `web-legacy` during refactor)

**Technology Stack:**
- React 19.0.0
- Vite 6.0.7
- TypeScript 5.7.2 (strict mode)
- React Router v7.14.2
- Tailwind CSS 3.4.17
- @assistant-ui/react 0.12.25 (chat interface)
- @okta/okta-auth-js 8.0.0 (authentication)
- Sonner (toast notifications)

**Architecture Pattern:**
- **Component-based organization** (not feature-based)
- Components grouped by type: `auth/`, `chat/`, `inbox/`, `project/`, `ui/`
- Hooks centralized in `src/hooks/`
- API client and utilities in `src/lib/`
- Pages in `src/pages/`

**Key Features Implemented:**
1. **Authentication** (Okta JWT)
   - Login page with Okta redirect
   - Protected routes
   - Token refresh handling
2. **Project Inbox** 
   - Project list view
   - Filters for project status
   - Real-time updates via WebSocket
3. **Project Detail View**
   - Project metadata display
   - Chat interface (basic)
   - File/artifact viewing (basic)
4. **API Integration**
   - HTTP API client (`api-client.ts`)
   - WebSocket client (`ws-client.ts`)
   - Suspense-based data fetching (`suspense-cache.ts`)
5. **UI Components**
   - shadcn/ui components (Button, Dialog, Dropdown, Label, Tooltip, etc.)
   - Custom components for chat, inbox, projects

**State Management:**
- **Local component state** (useState, useReducer)
- **Suspense cache** for data fetching (custom implementation)
- **WebSocket events** for real-time updates
- **No centralized state management** (no Redux, Zustand, or Jotai)

**Limitations & Pain Points:**
1. **No Guided Workflow** - Users must manually invoke skills
2. **Manual Skill Commands** - Requires typing `/skill-name` in chat
3. **No Workflow Progress Tracking** - No sidebar showing 14 pipeline stages
4. **No State Persistence** - Cannot resume projects where they left off
5. **Limited File Organization** - No hierarchical tree view of artifacts
6. **Component Organization** - Type-based, not feature-based (harder to maintain)
7. **No Centralized State** - State scattered across components
8. **Custom Data Fetching** - Suspense cache instead of React Query

**Testing:**
- Vitest + React Testing Library configured
- Some integration tests exist (`api-client.test.ts`, `project-detail.test.tsx`, etc.)
- Coverage not comprehensive

---

## Target State Architecture

### New Web Package (React 19 + Bulletproof React)

**Location:** `/workspace/.claude/worktrees/ui-refactor/packages/web`

**Technology Stack:**
- React 19.0.0 (same version - no upgrade needed)
- Vite 6.0.7 (same version)
- TypeScript 5.7.2 (strict mode - same version)
- React Router v7 (same major version)
- Tailwind CSS v4 (upgraded from v3)
- Jotai + Bunshi (atomic state management - NEW)
- React Query / TanStack Query (server state caching - NEW)
- @assistant-ui/react (same library, enhanced usage)
- shadcn/ui (same component library)

**Architecture Pattern:**
- **Bulletproof React** (feature-based vertical slices)
- Features are independent: `features/sidebar/`, `features/chat/`, `features/files/`
- Shared code in: `shared/components/`, `shared/hooks/`, `shared/api/`
- Library configuration in: `lib/api-client.ts`, `lib/query-client.ts`
- Utilities in: `utils/cn.ts`, `utils/format.ts`

**Key Features (Enhanced):**
1. **Fixed Sidebar with Workflow Navigation** (NEW)
   - Displays all 14 pipeline stages from backend
   - Visual progress indicators (pending, current, complete)
   - One-click navigation to workflow steps
   - Collapsible/expandable
2. **Tabbed Main Area** (NEW)
   - Chat tab (enhanced guided experience)
   - Files tab (hierarchical tree view)
3. **Guided Chat Experience** (ENHANCED)
   - Auto-invokes skills when navigating workflow steps
   - No manual `/skill-name` commands required
   - Streaming AI responses with progress
   - Hybrid: guided interview + occasional free-form
4. **Files Tab with Tree View** (NEW)
   - Hierarchical folder structure
   - Inline YAML/Markdown preview
   - Documents API integration
5. **State Persistence** (NEW)
   - Workflow progress saved to database
   - Resume capability: project selector + state hydration
   - Chat history persisted
   - Documents versioned
6. **Keyboard Navigation** (NEW)
   - Arrow keys for workflow steps
   - Tab key for tab switching
   - Shortcuts for common actions

**State Management:**
- **Jotai atoms** - Client state (sidebar collapsed, active tab, draft messages)
- **React Query** - Server state (projects, documents, chat messages)
- **Bunshi** - Scoped atoms (if needed for multiple contexts)

**Testing Strategy:**
- **Vitest** - Test runner (same as legacy)
- **React Testing Library** - Component tests
- **TDD approach** - Tests written alongside features
- **Coverage target:** >80%
- **Integration tests** - Full feature workflows

**Quality Gates:**
- ESLint 9.x (with TypeScript rules)
- Prettier 3.x (consistent formatting)
- TypeScript strict mode (100% type safety)
- Pre-commit hooks (lint, typecheck, test)

---

## Migration Approach

### Strategy: Big Bang Replacement with Parallel Development

**Rationale:**
- New architecture is fundamentally different (feature-based vs component-based)
- State management completely different (Jotai + React Query vs custom)
- Incremental migration would create hybrid mess
- Legacy UI is small enough to replace atomically

**Phases:**

### Phase 1: Parallel Development (Current - M0 through M5)
**Duration:** 20-26 days  
**Location:** `/workspace/.claude/worktrees/ui-refactor/packages/web`

**Activities:**
1. Build new UI in isolation in worktree
2. Develop against same backend API
3. Use feature flags if testing in production environment
4. Legacy UI remains in `/workspace/packages/web` and continues functioning
5. No changes to legacy UI (frozen during refactor)

**Milestones:**
- **M0:** Foundation (setup, structure, backend validation)
- **M1:** Sidebar feature
- **M2:** Chat integration (demo-ready)
- **M3:** Files tab
- **M4:** Database integration (production-ready)
- **M5:** Polish & accessibility (launch-ready)

**Backend Coordination:**
- Backend API must remain stable during this phase
- Any backend changes must be backward-compatible
- WebSocket protocol cannot break during this period
- Database schema validated in M0 (pipelineStatus field confirmed)

### Phase 2: Cutover Preparation (Post-M5)
**Duration:** 2-3 days  
**Activities:**
1. **Final Testing:**
   - Full E2E testing in staging environment
   - Load testing (concurrent users, WebSocket connections)
   - Security audit (auth flow, JWT validation)
   - Accessibility audit (WCAG 2.1 AA compliance)
   - Browser compatibility testing (Chrome, Firefox, Safari, Edge)

2. **Documentation:**
   - User guide updates
   - API documentation sync
   - Deployment runbook
   - Rollback procedures

3. **Stakeholder Demos:**
   - Product stakeholders sign-off
   - QA team acceptance
   - Tech lead approval

4. **Rollback Plan Testing:**
   - Verify rollback script works
   - Test package swap in staging
   - Document rollback procedure

### Phase 3: Atomic Cutover (1 hour maintenance window)
**Activities:**
1. **Backup & Preserve:**
   ```bash
   # Preserve legacy as web-legacy (if not already done)
   mv packages/web packages/web-legacy
   ```

2. **Deploy New UI:**
   ```bash
   # Merge worktree branch to main
   git checkout main
   git merge worktree-ui-refactor
   
   # Build production bundle
   cd packages/web
   pnpm build
   
   # Deploy to hosting (Vercel, Netlify, etc.)
   pnpm deploy
   ```

3. **Verify:**
   - Health check on production URL
   - Login flow works
   - WebSocket connection established
   - Projects load correctly
   - Chat responds to messages

4. **Monitor:**
   - Error tracking (Sentry, etc.)
   - Performance metrics (load time, bundle size)
   - User feedback channels

### Phase 4: Post-Cutover Monitoring (1-2 weeks)
**Activities:**
1. **Active Monitoring:**
   - Watch error logs for spikes
   - Monitor WebSocket disconnect rates
   - Track user feedback (support tickets, in-app feedback)
   - Performance metrics (Core Web Vitals)

2. **Hotfix Readiness:**
   - Team on-call for critical issues
   - Rollback ready if critical bugs found
   - Quick-fix pipeline for minor issues

3. **User Training:**
   - Announce new UI features
   - Provide user guide/walkthrough
   - Gather early feedback

4. **Rollback Decision:**
   - If <5% critical bugs → Stay on new UI, hotfix issues
   - If 5-10% critical bugs → Assess severity, potentially rollback
   - If >10% critical bugs → Immediate rollback to legacy

### Phase 5: Legacy Deprecation (Post-stabilization)
**Timeline:** 30-60 days after cutover

**Activities:**
1. **Confirm Stability:**
   - No critical bugs for 30 days
   - User satisfaction metrics positive
   - Performance meets or exceeds legacy

2. **Archive Legacy:**
   ```bash
   # Remove web-legacy from active packages
   mv packages/web-legacy archive/web-legacy-YYYY-MM-DD
   
   # Or keep as reference (recommend keeping for 90 days)
   git tag legacy-web-final packages/web-legacy
   ```

3. **Cleanup:**
   - Remove feature flags (if used)
   - Remove worktree artifacts
   - Update documentation to remove legacy references

---

## Feature Parity Checklist

### Must-Have Features (Block Launch)

| Feature | Legacy | New UI | Status | Notes |
|---------|--------|--------|--------|-------|
| **Authentication** | | | |
| Login with Okta | ✅ | ✅ (M0-M4) | To Implement | Uses same Okta config |
| Protected routes | ✅ | ✅ (M0) | Completed | React Router v7 |
| Token refresh | ✅ | ✅ (M4) | To Implement | Same mechanism |
| Logout | ✅ | ✅ (M4) | To Implement | Same mechanism |
| **Project Management** | | | |
| List projects | ✅ | ✅ (M4) | To Implement | Projects API |
| Filter projects | ✅ | ✅ (M4) | To Implement | Status, tags, etc. |
| Create project | ✅ | ✅ (M4) | To Implement | Projects API POST |
| View project details | ✅ | ✅ (M1-M4) | In Progress | Enhanced with sidebar |
| Update project | ✅ | ✅ (M4) | To Implement | Projects API PATCH |
| Delete project | ✅ | ✅ (M4) | To Implement | Projects API DELETE |
| **Workflow Management** | | | |
| View workflow stages | ❌ | ✅ (M1) | Planned | NEW: 14-stage pipeline |
| Navigate to workflow step | ❌ | ✅ (M1-M2) | Planned | NEW: Auto-skill invocation |
| Track workflow progress | ❌ | ✅ (M1, M4) | Planned | NEW: pipelineStatus tracking |
| **Chat Interface** | | | |
| Send message | ✅ | ✅ (M2) | To Implement | @assistant-ui/react |
| Receive AI response | ✅ | ✅ (M2) | To Implement | Streaming via WebSocket |
| Message history | ✅ | ✅ (M2, M4) | To Implement | Infinite scroll |
| Invoke skill manually | ✅ | ✅ (M2) | To Implement | Fallback to manual |
| Auto-invoke skill | ❌ | ✅ (M2) | Planned | NEW: Guided workflow |
| **Files/Artifacts** | | | |
| View artifact list | ✅ (basic) | ✅ (M3) | To Implement | Enhanced tree view |
| Preview YAML | ✅ (basic) | ✅ (M3) | To Implement | Inline preview pane |
| Preview Markdown | ✅ (basic) | ✅ (M3) | To Implement | Inline preview pane |
| Download artifact | ✅ | ✅ (M3) | To Implement | Documents API |
| **Real-time Updates** | | | |
| WebSocket connection | ✅ | ✅ (M2, M4) | To Implement | Same protocol |
| Project updates | ✅ | ✅ (M4) | To Implement | React Query invalidation |
| Chat message updates | ✅ | ✅ (M2) | To Implement | React Query invalidation |
| **State Persistence** | | | |
| Save workflow progress | ❌ | ✅ (M4) | Planned | NEW: pipelineStatus field |
| Resume project | ❌ | ✅ (M4) | Planned | NEW: State hydration |
| Persist chat history | ❌ | ✅ (M4) | Planned | NEW: Chat Messages API |
| **Error Handling** | | | |
| Error boundaries | ✅ | ✅ (M0) | Completed | Enhanced architecture |
| Toast notifications | ✅ | ✅ (M0, M5) | In Progress | Sonner (same library) |
| API error handling | ✅ | ✅ (M0, M4) | In Progress | React Query built-in |
| WebSocket reconnect | ✅ | ✅ (M2) | To Implement | Auto-reconnect logic |

### Nice-to-Have Features (Post-Launch)

| Feature | Legacy | New UI | Priority | Notes |
|---------|--------|--------|----------|-------|
| Dark mode | ❌ | ✅ (M5) | High | next-themes already installed |
| Keyboard shortcuts | ❌ | ✅ (M5) | High | Accessibility requirement |
| Cascade updates | ❌ | ✅ (M5) | Medium | Requirement change propagation |
| Search projects | ❌ | Future | Medium | Can filter, but no full search |
| Bulk operations | ❌ | Future | Low | Archive multiple projects |
| Export artifacts | ❌ | Future | Low | Download all as ZIP |
| Collaboration (multiple users) | ❌ | Future | Low | Real-time co-editing |

---

## Data Migration Considerations

### Database Schema

**Current State:**
The backend API (`/workspace/packages/api`) uses LibSQL (SQLite-compatible) at `~/.sherpy/sherpy.db`.

**Schema Tables (from Backend Validation Spike):**
1. `projects` - Main project entity
2. `milestones` - Project milestones with ordering
3. `tasks` - Tasks within milestones with ordering
4. `documents` - Generated documents with versioning
5. `chat_sessions` - Chat sessions per project
6. `chat_messages` - Messages within sessions
7. `people` - Team members
8. `skills` - Skill definitions
9. `person_skills` - Many-to-many: people ↔ skills
10. `assignments` - Task assignments to people
11. `availability` - People availability windows
12. `tags` - Tag definitions
13. `project_tags` - Many-to-many: projects ↔ tags

**Key Field for Migration: `pipelineStatus`**

The `projects` table must have a `pipelineStatus` field (enum or string) that stores the current workflow stage. This field is critical for the new UI's sidebar workflow navigation.

**Valid Pipeline Statuses (14 stages):**
1. `intake`
2. `gap-analysis`
3. `business-requirements`
4. `technical-requirements`
5. `style-anchors`
6. `implementation-planning`
7. `plan-review`
8. `architecture-decisions`
9. `delivery-timeline`
10. `qa-test-plan`
11. `summaries`
12. `active-development`
13. `completed`
14. `archived`

**Migration Steps:**
1. **Validate Schema (M0-017 - Backend Validation Spike):**
   - Confirm `projects.pipelineStatus` field exists
   - Confirm enum/string type matches 14 stages
   - Verify default value (likely `intake`)

2. **Backfill Existing Projects (if field added recently):**
   ```sql
   -- If pipelineStatus field was just added, set defaults
   UPDATE projects 
   SET pipelineStatus = 'intake' 
   WHERE pipelineStatus IS NULL;
   ```

3. **No Data Loss:**
   - All existing projects remain intact
   - Chat history preserved in `chat_messages` table
   - Documents preserved in `documents` table
   - No schema changes required (only validation)

4. **Backward Compatibility:**
   - Legacy UI does NOT use `pipelineStatus` field
   - New UI reads and writes `pipelineStatus` field
   - Both UIs can coexist during development
   - After cutover, `pipelineStatus` becomes active field

**Data Integrity:**
- Database migrations run automatically on server startup
- API validates `pipelineStatus` enum values
- React Query caching prevents stale data
- WebSocket events notify of project updates

---

## API Integration Points

### Backend API (`/workspace/packages/api`)

**Server Configuration:**
- **HTTP API:** Port 3100 (`http://127.0.0.1:3100/api`)
- **WebSocket:** Port 3101 (`ws://127.0.0.1:3101`)
- **Authentication:** Okta JWT (Bearer token in Authorization header)
- **DEV_MODE:** Set to `true` in `.env` to bypass auth for local development

**API Endpoints Used by New UI:**

#### Projects API (M4)
```
POST   /api/projects                        # Create project
GET    /api/projects                        # List projects (with filters)
GET    /api/projects/:projectId             # Get project details
PATCH  /api/projects/:projectId             # Update project (including pipelineStatus)
```

**Critical Field:** `pipelineStatus` (enum) - Used by sidebar for workflow navigation

#### Documents API (M3, M4)
```
POST   /api/projects/:projectId/documents/generate     # Generate document
GET    /api/projects/:projectId/documents              # List documents
GET    /api/projects/:projectId/documents/:type        # Get latest document
GET    /api/projects/:projectId/documents/:type/versions/:version  # Get specific version
```

**Document Types:** `implementation-plan`, `business-requirements`, `technical-requirements`, etc.  
**Formats:** `yaml`, `markdown`, `json`

#### Chat API (M2, M4)
```
POST   /api/projects/:projectId/chat/sessions          # Create chat session
GET    /api/projects/:projectId/chat/sessions          # List chat sessions
GET    /api/chat/sessions/:sessionId                   # Get chat history
POST   /api/chat/sessions/:sessionId/messages          # Send message
POST   /api/projects/:projectId/chat/messages          # Send message (with AI response)
GET    /api/projects/:projectId/chat/messages          # Get message history (paginated)
```

**Context Types:** `sherpy-flow`, `general`, `scheduling`, `planning`  
**AI Integration:** User messages trigger Claude Sonnet 4 responses via AWS Bedrock

#### WebSocket API (M2)
```
ws://127.0.0.1:3101?token=<JWT>
```

**Authentication:** JWT token in query parameter  
**Events:** Real-time project/task/message updates  
**Connection Management:** Auto-reconnect on disconnect

#### Health Check
```
GET    /api/health                         # Health check + DB connectivity
```

**Integration Strategy:**

1. **API Client Layer (M0):**
   ```typescript
   // lib/api-client.ts
   export const apiClient = {
     get: (url, options) => fetch(API_BASE_URL + url, ...),
     post: (url, body, options) => fetch(API_BASE_URL + url, ...),
     patch: (url, body, options) => fetch(API_BASE_URL + url, ...),
     delete: (url, options) => fetch(API_BASE_URL + url, ...),
   };
   ```

2. **React Query Integration (M4):**
   ```typescript
   // features/projects/api/get-projects.ts
   export const getProjectsQueryOptions = () => {
     return queryOptions({
       queryKey: ['projects'],
       queryFn: () => apiClient.get('/api/projects'),
     });
   };
   
   export const useProjects = () => {
     return useQuery(getProjectsQueryOptions());
   };
   ```

3. **WebSocket Integration (M2):**
   ```typescript
   // lib/websocket-client.ts
   export class WebSocketClient {
     connect(token: string) {
       this.ws = new WebSocket(`${WS_URL}?token=${token}`);
       this.ws.onmessage = (event) => {
         const data = JSON.parse(event.data);
         // Invalidate React Query cache based on event type
         if (data.type === 'project_updated') {
           queryClient.invalidateQueries({ queryKey: ['projects', data.projectId] });
         }
       };
     }
   }
   ```

**API Validation (M0-017):**
The backend validation spike task verifies:
- All endpoints return expected status codes (200, 201, 404, etc.)
- Authentication mechanism works (JWT validation)
- WebSocket connection establishes successfully
- `pipelineStatus` field exists and accepts 14 enum values
- Documents API returns YAML/Markdown with correct MIME types
- Chat Messages API triggers AI responses

**Blockers from Backend Validation:**
If M0-017 discovers critical issues (endpoints missing, authentication broken, schema mismatch), development PAUSES until backend team resolves blockers.

---

## Risk Mitigation

### Risk 1: Backend API Incompatibility (CRITICAL)

**Description:** API endpoints don't match assumptions, causing integration failures in M2-M4.

**Impact:** High - Could add 5-10 days of rework if discovered late.

**Probability:** Low (with M0 validation) / High (without validation)

**Mitigation:**
- **M0-017: Backend Validation Spike** (120 minutes, Day 3-4)
  - Test all API endpoints with actual HTTP requests
  - Verify WebSocket connection and authentication
  - Confirm `pipelineStatus` field exists with correct enum values
  - Test Documents API for YAML/Markdown retrieval
  - Verify programmatic skill invocation mechanism
- **Go/No-Go Decision:** Block M1 start if critical issues found
- **Backend Coordination:** Assign backend liaison to resolve blockers

**Rollback:** N/A (caught before feature development starts)

### Risk 2: WebSocket Connection Instability (HIGH)

**Description:** WebSocket disconnects frequently in production, disrupting real-time updates.

**Impact:** Medium - Degrades UX but doesn't break core functionality.

**Probability:** Medium (network conditions, load balancer issues)

**Mitigation:**
- **Auto-reconnect Logic (M2):** Implement exponential backoff retry
- **Fallback to Polling (M2):** If WebSocket fails repeatedly, fall back to HTTP polling
- **Connection Status UI (M2):** Show connection indicator in app header
- **Testing Strategy (M4):** Document WebSocket testing approach with mocks
- **Monitoring (Post-Launch):** Track disconnect rates and reconnect success

**Rollback:** Feature flag to disable WebSocket and use polling only

### Risk 3: State Hydration Bugs (MEDIUM)

**Description:** Resume capability fails to restore complete state, causing data loss or corruption.

**Impact:** High - User loses work, must restart project.

**Probability:** Medium (complex state, multiple sources)

**Mitigation:**
- **Phased Implementation (M4):**
  - m4-017: Project selector UI (isolated)
  - m4-018: Project loader hook (isolated)
  - m4-019: State hydration logic (isolated)
- **Comprehensive Testing (M4):** Integration tests for full hydration flow
- **Validation on Load (M4):** Verify state integrity before hydration
- **Error Boundaries (M0):** Catch hydration errors and show recovery UI
- **Manual Testing (M4):** QA team validates resume capability extensively

**Rollback:** Disable resume capability, show "create new project" only

### Risk 4: Performance Degradation (MEDIUM)

**Description:** New UI is slower than legacy due to bundle size, rendering, or API calls.

**Impact:** Medium - Poor UX, user frustration.

**Probability:** Low (with performance budgets)

**Mitigation:**
- **Performance Budgets (M0-019):** Define limits upfront
  - Bundle size: <500KB gzipped
  - Time to Interactive: <3 seconds
  - First Contentful Paint: <1.5 seconds
- **Code Splitting (M1-M5):** Lazy load features (Chat, Files) with React.lazy
- **React Query Caching (M4):** Minimize API calls with intelligent cache invalidation
- **Virtualization (M3):** Use virtual scrolling for large file lists
- **Monitoring (Post-Launch):** Track Core Web Vitals (LCP, FID, CLS)

**Rollback:** Optimize bundle (tree-shaking, dynamic imports) or rollback if unfixable

### Risk 5: Accessibility Non-Compliance (MEDIUM)

**Description:** New UI fails WCAG 2.1 AA compliance, blocking enterprise users.

**Impact:** High - Legal risk, blocks accessibility-required customers.

**Probability:** Low (with M5 audit)

**Mitigation:**
- **shadcn/ui Components (M0):** Built on Radix UI (accessible primitives)
- **Keyboard Navigation (M5):** Full keyboard support for all interactions
- **ARIA Labels (M5):** Proper labeling for screen readers
- **Focus Indicators (M5):** Visible focus states on all interactive elements
- **Color Contrast (M5):** WCAG AA contrast ratios
- **Audit (M5):** Use axe DevTools for automated accessibility testing
- **Manual Testing (M5):** Screen reader testing (NVDA, JAWS, VoiceOver)

**Rollback:** Hotfix accessibility issues post-launch (most are CSS/ARIA fixes)

### Risk 6: Feature Parity Gaps (MEDIUM)

**Description:** Legacy feature missed in new UI, causing user complaints post-launch.

**Impact:** Medium - User frustration, regression perception.

**Probability:** Low (with Feature Parity Checklist)

**Mitigation:**
- **Feature Parity Checklist** (this document): Comprehensive list of legacy features
- **User Testing (Post-M5):** Beta testing with internal users
- **Staged Rollout (Optional):** Launch to subset of users first (if possible)
- **Feedback Channels (Post-Launch):** In-app feedback widget, support tickets
- **Hotfix Pipeline (Post-Launch):** Quick deployment for minor feature adds

**Rollback:** Rollback to legacy if critical feature missing, add feature, re-launch

### Risk 7: Rollback Failure (LOW)

**Description:** Rollback to legacy UI doesn't work, leaving broken production.

**Impact:** Critical - Downtime, data loss, user lockout.

**Probability:** Very Low (with rollback testing)

**Mitigation:**
- **Preserve Legacy (Phase 1):** Keep `web-legacy` package intact during development
- **Test Rollback (Phase 2):** Verify rollback script in staging before launch
- **Atomic Cutover (Phase 3):** Use git merge (reversible) instead of destructive operations
- **Database Backward Compatibility:** Legacy UI can still read/write database (ignores pipelineStatus)
- **Monitoring (Phase 4):** Immediate error detection for quick rollback decision

**Rollback Procedure:**
```bash
# If launched via git merge (recommended)
git revert <merge-commit-hash>
pnpm install
pnpm build
pnpm deploy

# If launched via package replacement
mv packages/web packages/web-broken
mv packages/web-legacy packages/web
pnpm install
pnpm build
pnpm deploy
```

**Recovery Time Objective (RTO):** <1 hour from decision to rollback complete

---

## Timeline Estimate

### Development Timeline: 20-26 Days (4-5 Weeks)

Based on implementation plan milestones (see `docs/planning/implementation/milestones.yaml`):

| Milestone | Duration | Tasks | Dates (Example) | Key Deliverables |
|-----------|----------|-------|-----------------|------------------|
| **M0** - Foundation | 3-4 days | 20 | Days 1-4 | Clean setup, backend validation, structure |
| **M1** - Sidebar | 3-4 days | 15 | Days 5-8 | Fixed sidebar with 14 workflow steps |
| **M2** - Chat | 4-5 days | 21 | Days 9-13 | Auto-skill invocation, streaming chat |
| **M3** - Files | 3-4 days | 13 | Days 14-17 | Tree view, inline preview |
| **M4** - Database | 4-5 days | 23 | Days 18-22 | API integration, resume capability |
| **M5** - Polish | 4-5 days | 24 | Days 23-26 | Keyboard nav, accessibility, cascade updates |

**Total:** 116 tasks, ~118 hours of development

**Critical Path:** M0 → M1 → M2 → M3 → M4 → M5 (all sequential)

**Parallelization:** Limited due to dependencies. With 2 developers, best case: 15-20 days.

### Cutover Timeline: 2-3 Days (Post-M5)

| Phase | Duration | Activities |
|-------|----------|------------|
| **Cutover Prep** | 2-3 days | Final testing, documentation, stakeholder demos, rollback testing |
| **Atomic Cutover** | 1 hour | Merge, build, deploy, verify |
| **Monitoring** | 1-2 weeks | Active monitoring, hotfix readiness, user feedback |
| **Stabilization** | 30-60 days | Confirm stability, deprecate legacy |

**Total Timeline (Development + Cutover):** 23-30 days (~5-6 weeks)

### Key Decision Points

1. **After M0 (Day 4):** Go/No-Go based on backend validation
   - GREEN: Proceed to M1
   - RED: PAUSE, resolve blockers, re-estimate

2. **After M2 (Day 13):** Demo-Ready Checkpoint
   - Stakeholder demo
   - Validate UX approach
   - Adjust M3-M5 if needed

3. **After M5 (Day 26):** Production-Ready Checkpoint
   - QA acceptance testing
   - Stakeholder sign-off
   - Go/No-Go for cutover

4. **Post-Cutover (+7 days):** Rollback Decision
   - If critical bugs >10%: Rollback
   - If critical bugs 5-10%: Assess severity
   - If critical bugs <5%: Stay, hotfix

---

## Success Criteria

### M2 Demo-Ready Criteria (Stakeholder Demo)

After M2 completion (~Day 13), the new UI must demonstrate:

1. **Sidebar Functionality:**
   - ✅ Fixed sidebar displays all 14 workflow steps
   - ✅ Current step is visually highlighted
   - ✅ Clicking step navigates to that workflow stage
   - ✅ Status icons render correctly (pending, current, complete)

2. **Chat Functionality:**
   - ✅ Chat tab renders with @assistant-ui Thread component
   - ✅ WebSocket connection established (connection indicator shows green)
   - ✅ Clicking workflow step auto-invokes corresponding skill
   - ✅ AI responses stream in real-time
   - ✅ Guided interview questions appear automatically
   - ✅ User can respond to questions in chat

3. **Basic Quality:**
   - ✅ No console errors in browser DevTools
   - ✅ TypeScript compiles without errors
   - ✅ ESLint passes without errors
   - ✅ All tests pass (>70% coverage)

**Demo Audience:** Product stakeholders, design team  
**Demo Goal:** Validate guided workflow UX approach  
**Demo Format:** Live demo in staging environment (30-45 min)

### M5 Production-Ready Criteria (Launch Sign-Off)

After M5 completion (~Day 26), the new UI must meet:

1. **Feature Completeness:**
   - ✅ All "Must-Have" features from Feature Parity Checklist implemented
   - ✅ Sidebar, Chat, Files all fully functional
   - ✅ Resume capability works (create project → exit → reload → resume)
   - ✅ Keyboard navigation works (arrows, tab, shortcuts)

2. **Quality Gates:**
   - ✅ TypeScript strict mode: 0 errors
   - ✅ ESLint: 0 critical errors
   - ✅ Test coverage: >80%
   - ✅ All integration tests pass
   - ✅ Bundle size: <500KB gzipped
   - ✅ Lighthouse score: >90 (Performance, Accessibility, Best Practices)

3. **Accessibility (WCAG 2.1 AA):**
   - ✅ All interactive elements keyboard-accessible
   - ✅ Focus indicators visible on all elements
   - ✅ ARIA labels on all UI components
   - ✅ Color contrast ratios meet WCAG AA (4.5:1 for text)
   - ✅ Screen reader testing passed (NVDA or JAWS)
   - ✅ axe DevTools: 0 violations

4. **Browser Compatibility:**
   - ✅ Chrome (latest): Full functionality
   - ✅ Firefox (latest): Full functionality
   - ✅ Safari (latest): Full functionality
   - ✅ Edge (latest): Full functionality

5. **Performance:**
   - ✅ Time to Interactive: <3 seconds (on 4G network)
   - ✅ First Contentful Paint: <1.5 seconds
   - ✅ Largest Contentful Paint: <2.5 seconds
   - ✅ Cumulative Layout Shift: <0.1

6. **Error Handling:**
   - ✅ Error boundaries catch rendering errors gracefully
   - ✅ API errors show user-friendly notifications
   - ✅ WebSocket disconnect shows reconnection status
   - ✅ Network errors show retry options
   - ✅ 404 pages styled and helpful

7. **Documentation:**
   - ✅ CLAUDE.md updated with new architecture
   - ✅ project-structure.yaml complete
   - ✅ User guide created (basic usage)
   - ✅ Deployment runbook created
   - ✅ Rollback procedure documented

**Sign-Off Requirements:**
- [ ] Tech Lead: Architecture and code quality approved
- [ ] QA Team: All acceptance tests passed
- [ ] Product Manager: Features and UX approved
- [ ] Stakeholders: Ready for production deployment

### Post-Launch Success Criteria (30-Day Check-In)

After 30 days in production, the new UI is considered successful if:

1. **Stability:**
   - ✅ Critical bugs: 0
   - ✅ High-priority bugs: <3
   - ✅ Medium-priority bugs: <10
   - ✅ Uptime: >99.5%

2. **Performance:**
   - ✅ Average page load time: <2 seconds
   - ✅ WebSocket disconnect rate: <5%
   - ✅ API error rate: <1%
   - ✅ Core Web Vitals: All "Good" thresholds

3. **User Satisfaction:**
   - ✅ User feedback: >80% positive
   - ✅ Support tickets: <10/week related to UI
   - ✅ Feature adoption: >70% of users use guided workflow
   - ✅ Task completion rate: >90% complete workflow steps

4. **Business Impact:**
   - ✅ No rollback required
   - ✅ No critical escalations
   - ✅ Stakeholders satisfied with ROI
   - ✅ Users completing workflows faster than legacy

**If Criteria Met:** Archive legacy UI, celebrate launch success  
**If Criteria Not Met:** Investigate root causes, hotfix issues, reassess

---

## Deployment Strategy

### Environment Strategy

1. **Local Development:**
   - Developer machines with Vite dev server
   - Backend API running locally (or pointing to staging)
   - DEV_MODE=true to bypass Okta auth

2. **Staging Environment:**
   - Deployed to staging URL (e.g., `staging.sherpy.com`)
   - Connected to staging backend API
   - Okta test tenant for authentication
   - Used for QA testing and stakeholder demos

3. **Production Environment:**
   - Deployed to production URL (e.g., `app.sherpy.com`)
   - Connected to production backend API
   - Okta production tenant for authentication
   - Monitored with error tracking and analytics

### Deployment Method (Recommended)

**Option 1: Git-Based Deployment (Vercel, Netlify, etc.)**

```bash
# Phase 3: Atomic Cutover
git checkout main
git merge worktree-ui-refactor --no-ff
git push origin main

# Hosting platform auto-deploys from main branch
# Vercel/Netlify detects change and builds production bundle
```

**Advantages:**
- Atomic cutover via git merge (single commit)
- Easy rollback via git revert
- CI/CD pipeline handles build and deploy
- Zero-downtime deployment

**Option 2: Manual Build & Deploy**

```bash
# Phase 3: Atomic Cutover
cd packages/web
pnpm install
pnpm build  # Generates dist/ directory

# Upload dist/ to hosting (AWS S3, Cloudflare Pages, etc.)
aws s3 sync dist/ s3://sherpy-web-bucket --delete
aws cloudfront create-invalidation --distribution-id E123 --paths "/*"
```

**Advantages:**
- Full control over deployment process
- Can deploy to any hosting provider
- Can test build locally before deploying

### Feature Flags (Optional)

If gradual rollout is desired, implement feature flag system:

```typescript
// lib/feature-flags.ts
export const featureFlags = {
  newUI: process.env.VITE_NEW_UI_ENABLED === 'true',
};

// App.tsx
if (featureFlags.newUI) {
  return <NewApp />;
} else {
  return <LegacyApp />;
}
```

**Gradual Rollout Strategy:**
1. Deploy both UIs side-by-side
2. Route 10% of users to new UI (via cookie or user ID hash)
3. Monitor error rates and performance
4. Increase to 50%, then 100% over 2 weeks
5. Remove legacy UI after stabilization

**Trade-offs:**
- Pros: Lower risk, gradual validation, easy rollback
- Cons: Increased complexity, longer migration, two codebases to maintain

### Rollback Procedure

**Scenario 1: Critical Bug Within 1 Hour of Launch**

```bash
# Immediate rollback via git revert
git revert <merge-commit-hash> --no-edit
git push origin main

# Hosting platform auto-deploys reverted code
# RTO: <15 minutes
```

**Scenario 2: Critical Bug After 1-7 Days**

```bash
# Option A: Hotfix (if fixable quickly)
git checkout -b hotfix/critical-bug-fix
# ... make fix, commit, test
git checkout main
git merge hotfix/critical-bug-fix
git push origin main

# Option B: Rollback (if fix takes >2 hours)
git revert <merge-commit-hash> --no-edit
git push origin main
```

**Scenario 3: Persistent Issues After 7+ Days**

- Assess root cause and fix difficulty
- If unfixable: rollback and re-plan migration
- If fixable: hotfix aggressively, stay on new UI
- Communicate with users about issues and timeline

### Monitoring & Alerting

**Error Tracking (Sentry, Rollbar, etc.):**
- Capture JavaScript errors in production
- Alert team on critical errors (>10 errors/min)
- Track error trends (increasing/decreasing)

**Performance Monitoring (New Relic, Datadog, etc.):**
- Track Core Web Vitals (LCP, FID, CLS)
- Monitor API response times
- Alert on performance degradation (>20% slower than baseline)

**User Analytics (Google Analytics, Mixpanel, etc.):**
- Track feature adoption (sidebar usage, chat usage, files usage)
- Monitor task completion rates
- Identify UX bottlenecks

**WebSocket Monitoring:**
- Track connection success rate
- Monitor disconnect frequency
- Alert on sustained disconnects (>10% of users)

**Custom Alerts:**
- Critical: Errors affecting >10% of users
- High: Performance degradation >50%
- Medium: Feature adoption <50% after 14 days
- Low: Minor bugs reported by users

---

## Appendix A: Migration Checklist

### Pre-Migration (Before M0 Start)

- [ ] Team review meeting completed
- [ ] Migration strategy approved by stakeholders
- [ ] Backend team coordinated for validation
- [ ] Development environments set up
- [ ] Staging environment provisioned

### During Development (M0-M5)

- [ ] M0: Backend validation spike completed (no blockers)
- [ ] M0: Error boundary architecture implemented
- [ ] M0: Migration strategy documented (this document)
- [ ] M1: Sidebar feature complete and tested
- [ ] M2: Chat integration complete and tested (demo-ready)
- [ ] M3: Files tab complete and tested
- [ ] M4: Database integration complete and tested
- [ ] M5: Polish and accessibility complete (production-ready)

### Pre-Cutover (Post-M5)

- [ ] Final E2E testing in staging
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] Accessibility audit passed (WCAG 2.1 AA)
- [ ] Browser compatibility verified (Chrome, Firefox, Safari, Edge)
- [ ] Stakeholder demos completed
- [ ] QA acceptance testing passed
- [ ] Tech lead sign-off
- [ ] Product manager sign-off
- [ ] Rollback procedure tested in staging
- [ ] Deployment runbook reviewed
- [ ] Monitoring and alerting configured
- [ ] On-call team assigned for cutover

### Cutover Day

- [ ] Announce maintenance window (if needed)
- [ ] Backup legacy UI (as web-legacy)
- [ ] Merge worktree branch to main
- [ ] Build production bundle
- [ ] Deploy to production
- [ ] Verify health check
- [ ] Test login flow
- [ ] Test WebSocket connection
- [ ] Test project creation
- [ ] Test chat interaction
- [ ] Monitor error logs (first 30 min)
- [ ] Announce launch to users

### Post-Cutover (Days 1-7)

- [ ] Day 1: Active monitoring, no critical errors
- [ ] Day 2: Review error logs, address hotfixes
- [ ] Day 3: User feedback review, prioritize fixes
- [ ] Day 7: Assess stability, decide on rollback or continue

### Post-Cutover (Days 8-30)

- [ ] Week 2: User training completed
- [ ] Week 3: Performance metrics stable
- [ ] Week 4: User satisfaction surveyed
- [ ] Day 30: Success criteria reviewed
- [ ] Day 30: Rollback decision finalized (stay or revert)

### Legacy Deprecation (Days 31-90)

- [ ] Day 30: Confirm stability (no rollback needed)
- [ ] Day 60: Archive legacy UI (move to archive/ or tag in git)
- [ ] Day 90: Remove legacy references from documentation
- [ ] Day 90: Celebrate migration success

---

## Appendix B: Glossary

**Terms Used in This Document:**

- **Atomic Cutover:** Switching from legacy to new UI in a single deployment action (no gradual rollout)
- **Backend Validation Spike:** M0-017 task that tests backend API endpoints before feature development
- **Big Bang Replacement:** Migration strategy where old system is completely replaced at once
- **Bulletproof React:** Architecture pattern with feature-based vertical slices and strict boundaries
- **Feature Parity:** Ensuring new UI has all features from legacy UI
- **Go/No-Go Decision:** Checkpoint where team decides to proceed or pause based on criteria
- **Hydration:** Loading state from database/API and restoring it in UI
- **M0, M1, M2, etc.:** Milestone identifiers (M0 = Milestone 0, etc.)
- **Pipeline Status:** Current workflow stage (1 of 14 stages) for a project
- **RTO (Recovery Time Objective):** Maximum acceptable downtime during rollback
- **State Persistence:** Saving UI state to database for resume capability
- **WebSocket:** Real-time bidirectional communication protocol for chat streaming
- **Worktree:** Git worktree for isolated development of UI refactor

---

## Appendix C: Contact & Escalation

**Project Stakeholders:**

- **Tech Lead:** [Name] - Architecture decisions, code reviews
- **Backend Liaison:** [Name] - API coordination, backend validation
- **QA Lead:** [Name] - Testing strategy, acceptance testing
- **Product Manager:** [Name] - Feature prioritization, stakeholder comms
- **DevOps:** [Name] - Deployment, infrastructure, rollback support

**Escalation Path:**

1. **Blockers (M0 backend validation fails):** Escalate to Backend Liaison + Tech Lead immediately
2. **Timeline Slips (milestone exceeds estimate by >1 day):** Notify PM + Tech Lead, reassess plan
3. **Critical Bugs (post-launch, >10% users affected):** Escalate to Tech Lead + DevOps, prepare rollback
4. **Performance Issues (post-launch, >50% degradation):** Escalate to Tech Lead, hotfix or rollback
5. **Accessibility Violations (WCAG failures):** Escalate to Tech Lead + QA, fix before launch

**Communication Channels:**

- **Daily Updates:** Slack #sherpy-ui-refactor channel
- **Blockers:** @mention Tech Lead in Slack
- **Milestone Reviews:** Weekly meeting (30-60 min)
- **Stakeholder Demos:** After M2 and M5 (scheduled separately)
- **Post-Launch Issues:** Slack #sherpy-production-alerts

---

**Document Revision History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-04-29 | Claude Sonnet 4.5 | Initial migration strategy document |

---

**End of Migration Strategy Document**
