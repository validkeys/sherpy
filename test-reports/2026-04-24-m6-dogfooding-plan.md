# M6 Dogfooding Test Plan
**Date:** 2026-04-24
**Branch:** plan/002-pm
**Tester:** agent-browser

## Pre-Flight Checklist
- [ ] Environment variables configured (LLM API keys, database, WebSocket)
- [ ] API server running on http://localhost:3101
- [ ] Web app running on http://localhost:5173
- [ ] Database initialized and clean state confirmed

---

## Test Suite 1: Authentication & Project Creation
**Objective:** Verify user can authenticate and create a project

### TC-001: Authentication Flow
- [ ] Navigate to http://localhost:5173
- [ ] Test login UI renders correctly
- [ ] Test registration flow (if available)
- [ ] Verify JWT token stored after login
- [ ] Verify auth state persists on page reload
- **Expected:** User successfully authenticated, token persisted
- **Notes:**

### TC-002: Project Creation
- [ ] Navigate to project creation interface
- [ ] Fill out project creation form
- [ ] Submit new project
- [ ] Verify project appears in inbox/list view
- [ ] Verify pipeline status badge shows "intake" or initial stage
- **Expected:** New project created and visible in list
- **Notes:**

---

## Test Suite 2: Project Detail View
**Objective:** Verify project detail page renders all sections correctly

### TC-003: Project Header & Navigation
- [ ] Click into project from list
- [ ] Verify URL shows /projects/:id pattern
- [ ] Verify project header displays: name, description, created date, status
- [ ] Verify breadcrumb navigation renders: Home > Projects > {name}
- [ ] Test breadcrumb links navigate correctly
- **Expected:** All project metadata visible, navigation functional
- **Notes:**

### TC-004: Pipeline Status Visualization
- [ ] Verify pipeline status component renders
- [ ] Check current stage is highlighted
- [ ] Verify completed stages are dimmed/checked
- [ ] Verify upcoming stages are greyed out
- [ ] Check stage labels are readable
- [ ] Test responsive layout (resize browser window)
- **Expected:** Pipeline stages display correctly with visual hierarchy
- **Notes:**

### TC-005: Milestone List
- [ ] Verify milestone list section renders
- [ ] Check milestones display with name and status
- [ ] Verify task status breakdown bar shows for each milestone
- [ ] Test expand/collapse milestone to show tasks
- [ ] Verify task counts match actual tasks
- [ ] Check empty state if no milestones
- **Expected:** Milestones display with accurate task breakdowns
- **Notes:**

### TC-006: Loading & Error States
- [ ] Refresh page and observe loading skeleton
- [ ] Test invalid project ID (e.g., /projects/99999)
- [ ] Verify error state displays user-friendly message
- **Expected:** Loading states smooth, error states handled gracefully
- **Notes:**

---

## Test Suite 3: Document Viewer
**Objective:** Verify document viewing and export functionality

### TC-007: Document List
- [ ] Navigate to documents section/tab
- [ ] Verify document list displays all project documents
- [ ] Check document type icons render (yaml, md, code)
- [ ] Test selecting different documents
- [ ] Verify currently selected document is highlighted
- **Expected:** Document list shows all artifacts with correct types
- **Notes:**

### TC-008: Document Viewer - Syntax Highlighting
- [ ] Select a YAML document
- [ ] Verify syntax highlighting applied
- [ ] Select a Markdown document
- [ ] Verify markdown renders appropriately
- [ ] Select a code file (TS/JSON)
- [ ] Verify code syntax highlighting works
- **Expected:** All document types render with appropriate highlighting
- **Notes:**

### TC-009: Document Viewer - Actions
- [ ] Test copy-to-clipboard button
- [ ] Verify copied content matches document
- [ ] Test line numbers toggle (if present)
- [ ] Test fullscreen toggle (if present)
- **Expected:** All viewer actions function correctly
- **Notes:**

### TC-010: PDF Export
- [ ] Click PDF export button
- [ ] Verify download initiates
- [ ] Open downloaded PDF
- [ ] Verify PDF content matches displayed document
- [ ] Check PDF formatting (margins, readability)
- [ ] Verify PDF filename includes project/document name
- **Expected:** PDF exports successfully with proper formatting
- **Notes:**

---

## Test Suite 4: Chat Integration
**Objective:** Verify AI chat functionality with LLM connectivity

### TC-011: Chat Panel UI
- [ ] Locate chat toggle button/icon
- [ ] Click to open chat panel
- [ ] Verify chat panel slides in (side panel or overlay)
- [ ] Check panel width appropriate (~400px desktop)
- [ ] Test closing chat panel
- [ ] Verify message count badge (if present)
- **Expected:** Chat panel toggles smoothly with responsive layout
- **Notes:**

### TC-012: Send Message
- [ ] Open chat panel
- [ ] Type message in composer input
- [ ] Send message
- [ ] Verify message appears in thread immediately
- [ ] Verify message styled as user message
- **Expected:** User message sends and displays correctly
- **Notes:**

### TC-013: LLM Response
- [ ] Wait for AI assistant response
- [ ] Verify LLM connection successful
- [ ] Verify assistant message appears in thread
- [ ] Check response styling (assistant vs user)
- [ ] Verify response content is relevant
- **Expected:** LLM responds successfully with contextual message
- **Notes:**

### TC-014: Chat Persistence
- [ ] Send 2-3 messages in conversation
- [ ] Refresh the page
- [ ] Open chat panel
- [ ] Verify all messages persist and display in order
- **Expected:** Chat history persists across page reloads
- **Notes:**

### TC-015: Chat Context Isolation
- [ ] Send message in current project chat
- [ ] Navigate to different project (or create new one)
- [ ] Open chat panel in second project
- [ ] Verify first project's messages NOT visible
- **Expected:** Chat messages scoped to individual projects
- **Notes:**

---

## Test Suite 5: Real-Time Updates
**Objective:** Verify WebSocket events trigger UI updates

### TC-016: Task Status Change
- [ ] Open project detail with task status dropdown
- [ ] Change a task status (e.g., mark in-progress)
- [ ] Verify milestone task breakdown updates immediately
- [ ] Verify no page refresh required
- [ ] Check for smooth animation/transition
- **Expected:** Task status changes reflect instantly in UI
- **Notes:**

### TC-017: Pipeline Status Transition
- [ ] Trigger pipeline stage change (via API or UI action if available)
- [ ] Verify pipeline status component updates without refresh
- [ ] Check transition animation plays
- [ ] Verify WebSocket event logged in console (if debug enabled)
- **Expected:** Pipeline transitions in real-time via WebSocket
- **Notes:**

### TC-018: WebSocket Reconnection
- [ ] Open browser dev tools network tab
- [ ] Kill WebSocket connection (block in network or restart API)
- [ ] Wait for reconnection
- [ ] Trigger status change after reconnection
- [ ] Verify UI still updates
- **Expected:** WebSocket reconnects gracefully, updates resume
- **Notes:**

---

## Test Suite 6: Cross-Feature Integration
**Objective:** Test navigation and feature interaction

### TC-019: Navigation Flow
- [ ] Navigate from inbox to project detail
- [ ] Use breadcrumb to return to inbox
- [ ] Use browser back button
- [ ] Use browser forward button
- [ ] Test search in inbox (if available)
- **Expected:** All navigation methods work correctly
- **Notes:**

### TC-020: Multi-Tab Behavior
- [ ] Open same project in two browser tabs
- [ ] Make change in tab 1 (task status, send chat message)
- [ ] Verify tab 2 updates via WebSocket
- **Expected:** Real-time updates work across tabs
- **Notes:**

### TC-021: Mobile Responsive (Optional)
- [ ] Resize browser to mobile width (~375px)
- [ ] Verify pipeline status layout adapts
- [ ] Verify chat panel shows as overlay (not side panel)
- [ ] Test navigation on mobile layout
- **Expected:** Responsive layouts work on mobile widths
- **Notes:**

---

## Test Suite 7: Performance & Error Handling
**Objective:** Verify app handles edge cases and performs well

### TC-022: Console Errors
- [ ] Open browser dev tools console
- [ ] Navigate through entire app flow
- [ ] Document any console errors or warnings
- **Expected:** No critical console errors during normal usage
- **Notes:**

### TC-023: Network Failures
- [ ] Attempt action with API server stopped
- [ ] Verify user-friendly error message shown
- [ ] Restart API server
- [ ] Verify app recovers gracefully
- **Expected:** Network errors handled with appropriate user feedback
- **Notes:**

### TC-024: Loading Performance
- [ ] Time page load from URL entry to interactive
- [ ] Time project detail page render
- [ ] Time document viewer render
- [ ] Time chat message send/receive round trip
- **Expected:** All interactions feel snappy (< 2s for page loads, < 500ms for actions)
- **Notes:**

---

## Summary Template
**Total Tests:** 24
**Passed:** ___
**Failed:** ___
**Blocked:** ___
**Critical Issues:** ___

### Top Findings
1.
2.
3.

### Critical Blockers
-

### Recommended Fixes
-

### Overall Assessment
☐ **Ready for Production** - All critical features work
☐ **Needs Minor Fixes** - Non-blocking issues found
☐ **Needs Major Work** - Critical features broken
