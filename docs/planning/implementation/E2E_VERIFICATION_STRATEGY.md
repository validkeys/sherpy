# E2E Verification Strategy

**Purpose:** Guarantee milestone deliverables work in real browsers before marking complete

**Generated:** 2026-04-29  
**Applies To:** All milestones (M1-M5)

---

## Problem Statement

Current quality gates rely on:
- Unit tests (isolated, mocked dependencies)
- Integration tests (mocked API/WebSocket)
- Manual testing (human verification, not reproducible)

**Gap:** No automated verification that features work end-to-end in real browser with real backend.

---

## Solution: Automated E2E with agent-browser

### agent-browser Skill

Uses Playwright-based automation to:
- Launch real browser (Chrome/Firefox)
- Navigate to running app
- Interact with UI (click, type, scroll)
- Take screenshots
- Verify visual elements
- Validate state changes

### When to Run E2E Tests

**Before milestone completion** (after all tasks done, before marking complete):

```
M1-014: Manual Testing
↓
**NEW: M1-014b: Automated E2E Verification**
↓
M1-015: Code Review
↓
✅ Mark M1 Complete
```

---

## M1 E2E Test Plan

**Preconditions:**
1. Backend server running (port 3100, 3101)
2. Web dev server running (`npm run dev`)
3. No console errors in backend logs

**Test Cases:**

### TC-001: Sidebar Renders
- Open http://localhost:5173
- Verify sidebar visible
- Verify sidebar width ~33% of viewport
- Take screenshot: `m1-sidebar-initial.png`

### TC-002: All 10 Steps Display
- Count visible step elements (expect 10)
- Verify step names match WORKFLOW_STEPS
- Verify status icons present (○ → ✓)
- Screenshot: `m1-all-steps.png`

### TC-003: Current Step Highlighted
- Verify first step ('Intake') has current styling
- Check for visual highlight (background color, border, etc.)
- Screenshot: `m1-current-step.png`

### TC-004: Step Navigation Click
- Click on step 3 ('Business Requirements')
- Wait 500ms for state update
- Verify step 3 now has current styling
- Verify step 1 no longer highlighted
- Screenshot: `m1-step-navigation.png`

### TC-005: Multiple Navigation
- Click through steps: 1 → 5 → 3 → 10 → 1
- After each click, verify correct step highlighted
- No console errors

### TC-006: Status Icons Update
- Click steps in order: 1 → 2 → 3
- Verify previous steps show complete icon (✓)
- Verify current step shows current icon (→)
- Verify future steps show pending icon (○)
- Screenshot: `m1-status-icons.png`

### TC-007: State Persistence
- Navigate to step 5
- Refresh page (F5)
- Verify step 5 still current after reload
- Verify localStorage has workflow data

### TC-008: Keyboard Navigation
- Tab to first step
- Press Enter
- Verify navigation works
- Tab to third step
- Press Enter
- Verify step 3 becomes current

### TC-009: Responsive Layout
- Resize viewport to 1920x1080
- Verify sidebar still 1/3 width
- Resize to 1366x768
- Verify layout maintains
- Screenshot: `m1-responsive.png`

### TC-010: No Errors
- Check browser console (no errors)
- Check network tab (no failed requests)
- Verify no React error boundaries triggered

---

## Implementation Approach

### Step 1: Ensure Servers Running

```bash
# Check backend
curl http://127.0.0.1:3100/api/health

# Check WebSocket
curl http://127.0.0.1:3101/health

# Check web dev server
curl http://localhost:5173
```

### Step 2: Run E2E Tests via agent-browser

```
Use agent-browser skill to:
1. Navigate to http://localhost:5173
2. Execute each test case
3. Capture screenshots
4. Report results
```

### Step 3: Review Results

**Pass Criteria:**
- All 10 test cases pass
- Screenshots show correct UI state
- No console errors
- No network errors

**Fail Criteria:**
- Any test case fails
- Console errors present
- Layout incorrect
- State doesn't persist

### Step 4: Document Results

Create file: `docs/testing/e2e-results/M1_E2E_RESULTS.md`

Contains:
- Test run timestamp
- Pass/fail for each test case
- Screenshots (embedded or linked)
- Console logs if errors
- Action items if failures

---

## Benefits

1. **Confidence:** Automated proof features work end-to-end
2. **Reproducible:** Can re-run tests anytime
3. **Regression Detection:** Catch breaks in later milestones
4. **Visual Proof:** Screenshots show actual UI state
5. **Fast Feedback:** Catches integration issues immediately

---

## Milestone-Specific Test Plans

### M1: Sidebar Navigation
- 10 test cases (defined above)
- Focus: rendering, state, navigation

### M2: Chat Integration
- 15 test cases (TBD)
- Focus: WebSocket, streaming, auto-skills

### M3: Files Tab
- 12 test cases (TBD)
- Focus: tree view, file preview, navigation

### M4: Persistence
- 18 test cases (TBD)
- Focus: API integration, resume, state sync

### M5: Polish
- 20 test cases (TBD)
- Focus: accessibility, keyboard, error handling

---

## Tools and Commands

### agent-browser Skill
- Trigger: Use `/agent-browser` or agent-browser skill
- Capabilities: Navigate, click, type, screenshot, verify
- Browser: Chrome (default) or Firefox

### Manual Fallback
If agent-browser unavailable:
- Run Playwright tests manually
- Use browser DevTools for verification
- Document steps in testing checklist

---

## Success Criteria

**M1 Deliverable Guarantee:**
- ✅ All unit tests pass (>80% coverage)
- ✅ All integration tests pass
- ✅ TypeScript compiles (no errors)
- ✅ ESLint passes (no errors)
- ✅ Manual testing checklist complete
- ✅ **NEW: E2E test suite passes (10/10)**
- ✅ Code review complete

Only after ALL criteria met → Mark M1 complete

---

## Notes

- E2E tests run against **real backend** (not mocked)
- Tests assume backend already validated (M0-020 spike)
- Screenshots saved to `docs/testing/screenshots/`
- Test results saved to `docs/testing/e2e-results/`
- Re-run E2E tests before pushing to main

---

## Future Enhancements

1. **CI/CD Integration:** Run E2E tests in GitHub Actions
2. **Visual Regression:** Compare screenshots across commits
3. **Performance Metrics:** Capture load times, render metrics
4. **Accessibility Audit:** Run axe-core during E2E tests
5. **Cross-Browser:** Test in Chrome, Firefox, Safari
