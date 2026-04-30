# M2 Milestone - E2E Test Results

**Test Date:** 2026-04-30  
**Application URL:** http://localhost:5173  
**Test Method:** agent-browser automated E2E testing

---

## Test Summary

| Test ID | Feature | Status | Notes |
|---------|---------|--------|-------|
| M2-TEST-001 | Tabbed Main Area | ✅ PASS | Tab switching works smoothly |
| M2-TEST-002 | Chat UI Rendering | ⚠️ PARTIAL | UI renders but no messages displayed |
| M2-TEST-003 | WebSocket Connection | ❌ NOT TESTED | Requires backend server |
| M2-TEST-004 | Auto-Skill Invocation | ❌ FAIL | Button clicks don't trigger chat messages |
| M2-TEST-005 | Streaming AI Responses | ❌ NOT TESTED | No backend connection |
| M2-TEST-006 | Loading States | ❌ NOT TESTED | No backend connection |
| M2-TEST-007 | Hybrid Chat Mode | ⚠️ PARTIAL | Composer accepts input, no response |
| M2-TEST-008 | WebSocket Error Handling | ❌ NOT TESTED | Requires backend server |
| M2-TEST-009 | Complete Workflow Step Flow | ❌ FAIL | Steps don't trigger AI interactions |
| M2-TEST-010 | UI Layout & Responsiveness | ✅ PASS | Layout renders correctly |

---

## Detailed Test Results

### ✅ M2-TEST-001: Tabbed Main Area

**Status:** PASS

**Steps Executed:**
1. ✅ Opened application at http://localhost:5173
2. ✅ Verified Chat tab is active by default (marked as `[selected]`)
3. ✅ Verified Files tab is visible in tab list
4. ✅ Clicked Files tab - tab switched successfully
5. ✅ Verified Files tab content displays ("Project Files" heading)
6. ✅ Clicked Chat tab - returned to Chat successfully
7. ✅ Verified Chat tab content displays

**Observations:**
- Tabs render with clear labels: "Chat" and "Files"
- Active state properly indicated with `[selected]` attribute
- Tab switching is instant (no page reload)
- Only active tab content is visible
- Keyboard navigation support confirmed (tablist role with focusable elements)

**Screenshots:**
- `initial-state.png` - Chat tab active by default
- `files-tab-active.png` - Files tab after clicking
- `chat-tab-return.png` - Return to Chat tab

---

### ⚠️ M2-TEST-002: Chat UI with @assistant-ui Thread

**Status:** PARTIAL PASS

**Steps Executed:**
1. ✅ Navigated to Chat tab
2. ✅ Verified Thread component area renders
3. ✅ Verified welcome message displays: "Welcome to Sherpy"
4. ✅ Verified chat input field is visible at bottom
5. ✅ Verified placeholder text: "Answer the question or ask your own..."

**Issues Found:**
- ❌ Expected welcome message text: "Let's start the sherpy workflow. I'll guide you through each step."
- ❌ Actual welcome message text: "Welcome to Sherpy"
- ⚠️ No chat messages visible in thread (empty message list)
- ✅ Composer and Send button render correctly
- ✅ Send button properly disabled when input is empty
- ✅ Send button enabled when text is entered

**Observations:**
- Chat interface displays with proper structure
- Input field is accessible and styled correctly
- UI matches shadcn design system
- Thread structure missing: `hasThread: false`, `hasMessages: 0`

---

### ❌ M2-TEST-003: WebSocket Connection with Authentication

**Status:** NOT TESTED

**Reason:** Backend API server not running. Test requires:
- WebSocket server at ws://localhost:<port>
- Authentication endpoint
- projectId and token parameters

**Next Steps:**
1. Start backend API server
2. Verify WebSocket endpoint configuration
3. Check browser Network tab for WS connection
4. Verify authentication parameters in connection URL

---

### ❌ M2-TEST-004: Auto-Skill Invocation from Sidebar

**Status:** FAIL

**Steps Executed:**
1. ✅ Viewed sidebar with workflow steps 1-10
2. ✅ Clicked "Navigate to Intake" button
3. ❌ No message appeared in chat
4. ❌ No skill command sent to chat
5. ❌ No AI response

**Issues Found:**
- Button clicks don't trigger chat messages
- No skill invocation observed
- Chat thread remains empty after button click
- Possible integration issue between sidebar buttons and chat system

**Expected Behavior:**
- Click should send message: "Continue Sherpy Flow: Intake"
- Chat should display the skill invocation message
- AI should begin responding

**Actual Behavior:**
- Button click has no visible effect
- Chat remains at initial state
- No loading indicators appear

---

### ⚠️ M2-TEST-007: Hybrid Chat Mode (Guided + Free-form)

**Status:** PARTIAL PASS

**Steps Executed:**
1. ✅ Typed free-form message: "Test message for M2 milestone"
2. ✅ Verified Send button enabled
3. ✅ Clicked Send button
4. ✅ Message cleared from composer
5. ❌ No message appeared in chat thread
6. ❌ No AI response

**Observations:**
- ✅ Custom composer accepts text input
- ✅ Send button enabled/disabled logic works correctly
- ✅ Placeholder text visible: "Answer the question or ask your own..."
- ❌ Message not persisted in chat thread after sending
- ❌ No WebSocket or API communication observed

**Possible Issues:**
- Message submission not connected to chat runtime
- Missing WebSocket connection to backend
- React Query mutation not triggering
- AssistantRuntimeProvider not properly initialized

---

### ✅ M2-TEST-010: UI Layout and Responsiveness

**Status:** PASS

**Steps Executed:**
1. ✅ Viewed application at default viewport (1050x613)
2. ✅ Verified sidebar is on left (116px width)
3. ✅ Verified main tabs area is on right (700px width)
4. ✅ Verified layout is full height
5. ✅ Verified no unnecessary scrollbars on outer container

**Measurements:**
- Viewport: 1050x613
- Sidebar: 116px
- Main Area: 700px
- Ratio: ~1:6 (sidebar:main)

**Observations:**
- ✅ Sidebar and main area properly proportioned
- ✅ Full height layout achieved
- ✅ No overlapping or clipped content
- ✅ Visual hierarchy is clear
- ⚠️ Sidebar narrower than expected (1/3 width would be ~350px)

**Note:** Expected ratio was 1:2 (sidebar 1/3, main 2/3), but actual layout is different. This may be intentional or a design change.

---

## Critical Issues Found

### 🚨 Issue 1: Message Submission Not Working
**Severity:** HIGH  
**Description:** When sending messages via the composer, they don't appear in the chat thread.

**Evidence:**
- Typed message clears from composer
- Chat thread remains empty (`hasMessages: 0`)
- No API calls observed

**Possible Root Causes:**
1. AssistantRuntimeProvider not properly connected to chat system
2. Missing WebSocket connection to backend
3. React Query mutation not configured
4. Custom composer not integrated with @assistant-ui runtime

**Files to Investigate:**
- `packages/web/src/features/chat/components/custom-composer.tsx`
- `packages/web/src/shared/components/assistant-ui/thread.tsx`
- `packages/web/src/shared/pages/project.tsx` (runtime provider setup)

---

### 🚨 Issue 2: Auto-Skill Invocation Not Working
**Severity:** HIGH  
**Description:** Clicking workflow step buttons in sidebar doesn't trigger chat messages or skill invocations.

**Evidence:**
- Clicked "Navigate to Intake" button
- No message sent to chat
- Chat thread unchanged

**Possible Root Causes:**
1. Event handlers not connected to chat system
2. Missing integration between sidebar and chat runtime
3. Skill invocation logic not implemented
4. Button onClick handlers not calling chat API

**Files to Investigate:**
- Sidebar workflow step components
- Chat API integration layer
- Event handler connections

---

### ⚠️ Issue 3: Welcome Message Mismatch
**Severity:** LOW  
**Description:** Welcome message differs from test specification.

**Expected:** "Let's start the sherpy workflow. I'll guide you through each step."  
**Actual:** "Welcome to Sherpy"

**Action:** Update welcome message or test specification to match.

---

### 🔍 Issue 4: No WebSocket Connection
**Severity:** HIGH (Blocking)  
**Description:** Cannot test WebSocket-dependent features without backend server.

**Tests Blocked:**
- M2-TEST-003: WebSocket Connection
- M2-TEST-005: Streaming AI Responses
- M2-TEST-006: Loading States
- M2-TEST-008: WebSocket Error Handling

**Next Steps:**
1. Start backend API server
2. Configure WebSocket endpoint
3. Verify authentication flow
4. Re-run blocked tests

---

## Test Environment

```
Application URL: http://localhost:5173
Browser: Chrome (Headless via agent-browser)
Viewport: 1050x613
Dev Server: Running
Backend API: Not running
Auth Mode: DEV_MODE (assumed)
```

---

## Screenshots

All screenshots saved to: `/workspace/.claude/worktrees/ui-refactor/test-results/`

1. `initial-state.png` - Chat tab active by default
2. `files-tab-active.png` - Files tab switched
3. `chat-tab-return.png` - Return to Chat tab
4. `after-intake-click.png` - After clicking Intake button (no change)
5. `after-send-message.png` - After sending test message (no messages visible)
6. `full-page.png` - Full page screenshot

---

## Next Steps

### Priority 1: Fix Message Submission (Critical)
1. Investigate why messages aren't appearing in chat thread
2. Verify AssistantRuntimeProvider configuration
3. Check ComposerPrimitive integration with runtime
4. Test message mutation in React Query layer

### Priority 2: Fix Auto-Skill Invocation (Critical)
1. Verify sidebar button event handlers
2. Implement skill invocation integration with chat
3. Test message submission from sidebar clicks
4. Add loading indicators during skill invocation

### Priority 3: Start Backend Server (Blocking)
1. Start backend API server for WebSocket testing
2. Configure WebSocket endpoint
3. Verify authentication flow
4. Re-run WebSocket-dependent tests (003, 005, 006, 008)

### Priority 4: Update Unit Tests (High)
1. Fix mocks in `chat-container.test.tsx`
2. Fix mocks in `custom-composer.test.tsx`
3. Add integration test for @assistant-ui API

### Priority 5: Update Welcome Message (Low)
1. Update welcome message to match spec OR
2. Update test spec to match actual message

---

## Validation Checklist

- [x] Test scenarios documented
- [ ] All 10 test scenarios completed (4 blocked, 2 failed, 2 partial, 2 passed)
- [x] Console errors checked (no errors found)
- [ ] All features work as described (critical issues found)
- [x] Visual design assessed
- [ ] Performance acceptable (unable to test without backend)
- [ ] WebSocket connection stable (unable to test without backend)
- [ ] Error handling works correctly (unable to test without backend)
- [ ] Ready for M3 (NO - critical issues must be fixed first)

---

## Conclusion

**Overall Status:** ⚠️ PARTIAL PASS - Critical issues found

The M2 milestone shows progress on UI structure (tabs, layout, composer rendering) but has critical integration issues:

1. **Messages don't persist in chat thread** after sending
2. **Sidebar buttons don't trigger skill invocations**
3. **WebSocket features untestable** without backend server

**Recommendation:** Fix message submission and auto-skill invocation before proceeding to M3. Start backend server to complete WebSocket testing.
