# Sherpy Flow UI Refactor - Executive Summary

**Project:** Sherpy Flow UI Refactor  
**Date:** 2026-04-28  
**Status:** Planning Complete - Ready to Execute  
**Timeline:** 20-26 days (4-5 weeks)

---

## What We're Building

A complete UI overhaul of the Sherpy workflow planning tool with:

1. **Fixed Sidebar** (1/3 width) showing 10 workflow steps with progress indicators
2. **Tabbed Main Area** with Chat and Files views
3. **Guided Chat Experience** with automatic skill invocation (no manual commands)
4. **Files Tab** with hierarchical tree view and inline preview
5. **State Persistence** allowing users to resume projects
6. **Accessibility Compliant** (WCAG 2.1 AA)

**Goal:** Replace confusing manual workflow with guided, automated experience that ensures users complete all planning steps correctly.

---

## Timeline Overview

### Total Duration: 20-26 Days (4-5 Weeks)

```
M0: Foundation & Validation     [Days 1-4]   ████░░░░░░░░░░░░░░░░░░░░░░
M1: Sidebar Feature             [Days 5-8]   ░░░░████░░░░░░░░░░░░░░░░░░
M2: Chat Integration            [Days 9-13]  ░░░░░░░░█████░░░░░░░░░░░░░
    ⭐ DEMO-READY AFTER M2 (~10-13 days)
M3: Files Tab                   [Days 14-17] ░░░░░░░░░░░░░████░░░░░░░░░
M4: Database Integration        [Days 18-22] ░░░░░░░░░░░░░░░░░█████░░░░
M5: Polish & Accessibility      [Days 23-26] ░░░░░░░░░░░░░░░░░░░░░░████
    🚀 PRODUCTION-READY AFTER M5 (~20-26 days)
```

### Key Milestones

| Milestone | Duration | Tasks | Purpose | Deliverable |
|-----------|----------|-------|---------|-------------|
| **M0** | 3-4 days | 20 | Foundation + Backend Validation | Clean setup, validated backend |
| **M1** | 3-4 days | 15 | First visible feature | Working sidebar |
| **M2** | 4-5 days | 21 | Core value delivery | Guided chat + auto-skills |
| **M3** | 3-4 days | 13 | Secondary feature | Files viewing |
| **M4** | 4-5 days | 23 | Production infrastructure | State persistence |
| **M5** | 4-5 days | 24 | Production quality | Polish + accessibility |

**Total:** 116 tasks, ~118 hours

---

## Technology Stack

### Frontend
- **React 19** - Latest React with modern patterns
- **Vite** - Fast build tooling
- **TypeScript** - Type safety throughout
- **Jotai** - Atomic state management
- **React Query** - Server state caching
- **@assistant-ui/react** - Streaming chat UI
- **shadcn/ui** - Accessible component library
- **Tailwind CSS** - Utility-first styling

### Architecture
- **Bulletproof React** - Feature-based organization
- **Three-part API pattern** - Fetcher + queryOptions + hook
- **Error boundaries** - Graceful error handling
- **WebSocket streaming** - Real-time AI responses

---

## Risk Mitigation Strategy

### Critical Risk: Backend Integration Assumptions

**Original Plan Risk:** Discover backend incompatibilities in M2-M4 (days 9-22)  
**Cost of Late Discovery:** 5-10 days of rework

**Solution: M0 Backend Validation Spike (Day 3)**
- Validates all API endpoints exist and work
- Tests WebSocket connection and authentication
- Confirms programmatic skill invocation mechanism
- Verifies database schema (pipelineStatus field)
- **Blocks M1 start if critical issues found**

**Impact:** Catches integration issues before feature development, prevents costly rework.

### Other Risk Mitigations

1. **Error Boundary Architecture (M0):**
   - Consistent error handling across all features
   - Graceful recovery from failures
   - Better debugging

2. **Resume Capability Split (M4):**
   - Complex feature broken into 3 focused subtasks
   - Better progress tracking
   - Reduced underestimation risk

3. **Performance Budgets (M0):**
   - Bundle size limits defined upfront
   - Cache size limits established
   - Prevents late-stage performance scramble

4. **Migration Strategy (M0):**
   - Documents transition from old app
   - Rollback plan defined
   - Reduces deployment risk

5. **WebSocket Testing Strategy (M4):**
   - Testing approach documented
   - Mock utilities provided
   - Enables confident testing

---

## Value-First Approach

### Why This Ordering?

Instead of building infrastructure first, we deliver visible features early:

1. **M0:** Foundation (must be first)
2. **M1:** Sidebar (first visible differentiation)
3. **M2:** Chat (core product value) ⭐ **DEMO-READY**
4. **M3:** Files (secondary value)
5. **M4:** Database (infrastructure - deferred)
6. **M5:** Polish (production quality)

### Benefits

- **Early stakeholder demos** after M2 (10-13 days)
- **Early feedback** on UX before infrastructure investment
- **Visible progress** motivates team
- **Flexibility** to ship M0-M3 early if needed
- **Reduced risk** of building wrong thing

---

## Plan Updates (Post-Review)

### What Changed

The plan was reviewed and strengthened with additional risk mitigation:

**Added to M0 (Foundation):**
- Backend validation spike (120 min) - **CRITICAL RISK MITIGATION**
- Error boundary architecture (90 min)
- Migration strategy documentation (45 min)
- Performance budgets (60 min)

**Enhanced in M4 (Database):**
- Resume capability split into 3 focused subtasks
- WebSocket testing strategy documentation

**Fixed:**
- M5 duration label corrected to match hour estimate

### Impact

- **Tasks:** 109 → 116 (+7 tasks, +6.4%)
- **Timeline:** 18-24 days → 20-26 days (+2 days at midpoint, +9.5%)
- **Hours:** ~108 → ~118 (+10 hours, +9.3%)
- **Confidence:** Medium → High (with backend validation)
- **Risk Level:** Medium-High → Low-Medium

**Assessment:** Additional 2 days provides high-confidence buffer for successful delivery with significantly reduced risk.

---

## Success Criteria

### M2 Demo-Ready (Day 10-13)
- ✅ Sidebar shows all 10 workflow steps
- ✅ Clicking step invokes skill automatically
- ✅ Chat displays AI responses with streaming
- ✅ Guided interview flow working
- ✅ Basic error handling in place

**Audience:** Product stakeholders, design team  
**Goal:** Validate UX and workflow approach

### M5 Production-Ready (Day 20-26)
- ✅ All features complete and tested
- ✅ State persists to database
- ✅ Users can resume projects
- ✅ WCAG 2.1 AA compliant
- ✅ Keyboard navigation working
- ✅ Error handling polished
- ✅ Performance within budgets
- ✅ All tests passing (>80% coverage)

**Audience:** Full stakeholders, QA team  
**Goal:** Sign-off for production deployment

---

## Critical Success Factors

### 1. Backend Validation Must Pass (Day 3-4)

**Most Important Gate in Entire Plan**

- Complete M0-017 (backend validation spike) successfully
- If critical blockers found → PAUSE, resolve before M1
- Do not proceed to M1 without green light

**Why Critical:** Prevents 5-10 days of rework if integration assumptions wrong.

### 2. Follow Task Order for Resume Capability (M4)

**Three Subtasks Must Be Done Sequentially:**
- m4-017: Project selector UI
- m4-018: Project loader hook  
- m4-019: State hydration logic

**Why Critical:** Prevents underestimation and tracking issues.

### 3. Maintain Quality Gates

**Before Every Commit:**
```bash
npm run lint       # Must pass
npm run type-check # Must pass
npm run test       # Must pass
```

**Why Critical:** Technical debt compounds quickly if quality gates skipped.

### 4. Stay in Scope

- Stick to task instructions
- Defer nice-to-haves to M5
- No premature optimization
- No scope expansion without plan update

**Why Critical:** Scope creep is primary cause of timeline slips.

---

## Team Structure (Recommended)

### Roles Needed

- **Frontend Developer(s):** 1-2 (React/TypeScript experience)
- **Backend Coordinator:** 1 (for M0 validation spike)
- **Tech Lead:** 1 (reviews, architecture decisions)
- **QA/Testing:** 1 (part-time, especially M5)
- **Designer:** 1 (part-time, UX validation after M2)

### Time Commitment

- **Full-time:** Frontend developers
- **Part-time:** Backend coordinator (M0 only), QA (M5 primarily)
- **Review time:** Tech lead (~2-3 hours/week for reviews)

---

## Budget Estimate

### Development Time

- **Total hours:** ~118 hours
- **At 1 developer full-time:** 20-26 days (4-5 weeks)
- **At 2 developers parallel (where possible):** 15-20 days (3-4 weeks)

**Note:** Not all tasks can be parallelized due to dependencies.

### Cost Estimate (Example)

Assuming $100/hour blended rate:

- **Development:** 118 hours × $100 = $11,800
- **Reviews:** 12 hours × $150 = $1,800
- **QA:** 20 hours × $80 = $1,600
- **PM/Coordination:** 15 hours × $120 = $1,800

**Total:** ~$17,000

*(Adjust rates based on actual team costs)*

---

## Next Steps

### Immediate (This Week)

1. **Team Review Meeting** (60 min)
   - Review this plan
   - Get team buy-in
   - Assign roles
   - Confirm start date

2. **Backend Validation Prep** (2-3 hours)
   - Get API documentation
   - Request test credentials
   - Confirm skill invocation mechanism
   - Set up test environment

3. **Development Environment Setup** (1-2 hours)
   - Clone repo
   - Install dependencies
   - Verify environment working

### Week 1 (Days 1-5)

- **Days 1-4:** Complete M0 (Foundation + Validation)
- **Day 3-4:** Backend validation spike - **GO/NO-GO DECISION**
- **Day 5:** Start M1 (Sidebar) if validation passes

### Week 2-3 (Days 6-15)

- **Days 5-8:** Complete M1 (Sidebar)
- **Days 9-13:** Complete M2 (Chat) → **DEMO-READY**
- **Days 14-15:** Start M3 (Files)

### Week 3-4 (Days 16-22)

- **Days 14-17:** Complete M3 (Files)
- **Days 18-22:** Complete M4 (Database)

### Week 4-5 (Days 23-26)

- **Days 23-26:** Complete M5 (Polish) → **PRODUCTION-READY**

---

## Questions & Answers

### Q: Can we ship faster than 26 days?

**A:** Yes, potentially. M0-M3 (13-17 days) is usable without persistence. However, users can't resume projects without M4. Recommend full M0-M5 for production.

### Q: What's the biggest risk?

**A:** Backend integration assumptions. Mitigated by M0 backend validation spike (Day 3-4). If validation passes, risk is low.

### Q: Can we parallelize work with 2 developers?

**A:** Limited parallelization due to dependencies. M1-M3 are somewhat parallelizable (sidebar, chat, files are independent), but M0 and M4 are mostly sequential. Best case: 15-20 days with 2 devs.

### Q: What if backend validation finds blockers?

**A:** PAUSE development, coordinate with backend team to resolve. Do not proceed to M1 until resolved. Re-estimate timeline after resolution.

### Q: Is 116 tasks too many?

**A:** No. Tasks are properly sized (30-150 min each). Detailed task breakdown reduces risk of underestimation and improves tracking.

### Q: What about testing?

**A:** Testing integrated throughout (TDD approach). Every code task followed by test task. Coverage target: >80%. Quality gates enforce this.

### Q: What if we discover issues during development?

**A:** Error boundaries provide graceful handling. Task instructions include constraints to prevent common issues. Regular milestone reviews catch problems early.

---

## Approval & Sign-Off

### Plan Prepared By
- **Name:** Claude Sonnet 4.5
- **Role:** AI Planning Assistant
- **Date:** 2026-04-28

### Pending Approvals

- [ ] **Tech Lead:** Architecture and approach approved
- [ ] **Backend Team:** Validation coordination agreed
- [ ] **Product Manager:** Timeline and scope approved
- [ ] **Stakeholders:** Budget and deliverables approved

### Go-Ahead Decision

**Once all approvals received:**
- [ ] Schedule M0 start date
- [ ] Assign team members
- [ ] Complete backend validation prep
- [ ] Begin M0 implementation

---

## Documentation Structure

All planning artifacts located in `docs/planning/`:

```
docs/planning/
├── EXECUTIVE_SUMMARY.md          ← This file (high-level overview)
├── NEXT_ACTIONS.md                ← Immediate next steps
├── PLAN_REVIEW_CHANGES.md         ← Detailed change log
├── implementation/
│   ├── IMPLEMENTATION_SUMMARY.md  ← Developer-focused summary
│   ├── milestones.yaml            ← Milestone definitions
│   └── tasks/
│       ├── milestone-m0.tasks.yaml  ← 20 tasks (3-4 days)
│       ├── milestone-m1.tasks.yaml  ← 15 tasks (3-4 days)
│       ├── milestone-m2.tasks.yaml  ← 21 tasks (4-5 days)
│       ├── milestone-m3.tasks.yaml  ← 13 tasks (3-4 days)
│       ├── milestone-m4.tasks.yaml  ← 23 tasks (4-5 days)
│       └── milestone-m5.tasks.yaml  ← 24 tasks (4-5 days)
├── requirements/
│   ├── business-requirements.yaml
│   └── technical-requirements.yaml
└── artifacts/
    ├── style-anchors/              ← Code patterns
    ├── backend-validation-report.md  ← Created in M0
    ├── migration-strategy.md         ← Created in M0
    └── performance-budgets.md        ← Created in M0
```

---

## Conclusion

This is a **well-scoped, de-risked, executable plan** for delivering a production-ready UI refactor in 20-26 days (4-5 weeks).

### Key Strengths

✅ **Comprehensive risk mitigation** (backend validation, error boundaries)  
✅ **Value-first delivery** (demo-ready in 2 weeks)  
✅ **Realistic estimates** (properly sized tasks, buffer included)  
✅ **Clear quality gates** (TDD, coverage, reviews)  
✅ **Detailed documentation** (116 tasks with full instructions)

### Recommended Action

**Approve and proceed** with backend validation preparation this week, targeting M0 start early next week.

---

**Confidence Level:** High (with M0 backend validation completion)  
**Risk Level:** Low-Medium (significantly reduced vs. original plan)  
**Recommended Decision:** ✅ Approve and Proceed
