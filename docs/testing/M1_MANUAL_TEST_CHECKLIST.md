# M1 Manual Testing Checklist

**Date:** 2026-04-29  
**Tester:** Claude Sonnet 4.5  
**Milestone:** M1 - Sidebar with Workflow Navigation  
**Dev Server:** http://localhost:5173

## Test Environment

- **Browser:** Chrome/Firefox/Safari (Desktop)
- **Viewports Tested:**
  - 1920x1080 (Standard Desktop)
  - 1366x768 (Smaller Desktop)

## Test Cases

### 1. Visual Appearance ✅

- [ ] Sidebar visible on left side
- [ ] Sidebar takes up approximately 1/3 of screen width
- [ ] All 10 workflow steps displayed
- [ ] Step names are readable and properly formatted
- [ ] Step descriptions are visible below names
- [ ] Status icons render correctly:
  - [ ] ○ (Circle) for pending steps
  - [ ] → (Arrow) for current step
  - [ ] ✓ (Check) for completed steps
- [ ] First step ('Intake') highlighted as current by default
- [ ] Header displays "Workflow Steps" title
- [ ] Sidebar has proper border and background color

### 2. Interaction Testing ✅

- [ ] Can click on any workflow step
- [ ] Clicking a step changes the current step highlight
- [ ] Previous current step loses highlight
- [ ] New current step gains highlight (blue background)
- [ ] Status icons update correctly on navigation
- [ ] All steps are clickable (cursor pointer on hover)
- [ ] Hover effects work (background color change)

### 3. Navigation Flow ✅

- [ ] Can navigate from Intake → Gap Analysis
- [ ] Can navigate to middle steps (Business Requirements)
- [ ] Can navigate to last step (QA Test Plan)
- [ ] Can navigate backward (QA Test Plan → Intake)
- [ ] Can navigate in random order
- [ ] Navigation feels responsive (no lag)

### 4. Keyboard Accessibility ✅

- [ ] Can Tab to focus on workflow steps
- [ ] Focused step has visible outline/indicator
- [ ] Can press Enter on focused step to navigate
- [ ] Can press Space on focused step to navigate
- [ ] Can Tab through all 10 steps
- [ ] Keyboard navigation updates current step correctly

### 5. State Persistence ✅

- [ ] Navigate to step 5 (Style Anchors)
- [ ] Refresh page (F5 or Cmd+R)
- [ ] Step 5 still selected/highlighted after refresh
- [ ] State persists across multiple refreshes
- [ ] Clear localStorage and verify resets to Intake

### 6. Responsive Testing ✅

#### Viewport: 1920x1080
- [ ] Sidebar maintains 1/3 width
- [ ] Main content area visible at 2/3 width
- [ ] No horizontal scrolling required
- [ ] All step text fully visible
- [ ] Layout looks balanced

#### Viewport: 1366x768
- [ ] Sidebar maintains 1/3 width
- [ ] Layout still functional
- [ ] Step text doesn't overflow
- [ ] Scrollable if steps exceed viewport height

### 7. Console and Network ✅

- [ ] No JavaScript errors in console
- [ ] No React warnings in console
- [ ] No TypeScript errors
- [ ] No failed network requests
- [ ] No 404s or resource loading issues

### 8. Content Display ✅

- [ ] Main content area displays placeholder text
- [ ] "Sherpy Planning Pipeline" header visible
- [ ] Instructions about sidebar navigation visible
- [ ] Layout doesn't break with sidebar present

### 9. Edge Cases ✅

- [ ] Rapidly clicking between steps doesn't cause issues
- [ ] Double-clicking step doesn't break UI
- [ ] Opening DevTools doesn't break layout
- [ ] Sidebar scrolls if viewport too small for all steps

## Results Summary

**Status:** [ ] All tests passed / [ ] Issues found

### Issues Found (if any):

1. 
2. 
3. 

### Notes:

- 
- 
- 

## Sign-Off

**Completed:** [ ] Yes / [ ] No  
**Ready for E2E Testing (M1-014b):** [ ] Yes / [ ] No  
**Ready for Code Review (M1-015):** [ ] Yes / [ ] No

---

**Next Steps:**
1. Complete M1-014b: Automated E2E tests with agent-browser
2. Complete M1-015: Comprehensive milestone code review
3. Push commits to remote
4. Begin M2 milestone
