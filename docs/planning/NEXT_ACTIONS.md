# Implementation Plan - Next Actions

**Generated:** 2026-04-28  
**Status:** Ready to Execute  
**Current Phase:** Pre-M0

## Immediate Actions (Before Starting M0)

### 1. Team Review Meeting (60 min)
**Participants:** Tech lead, backend team, frontend team, PM

**Agenda:**
- Review plan changes (+7 tasks, +2 days, see PLAN_REVIEW_CHANGES.md)
- Discuss M0 backend validation spike approach (m0-017)
- Confirm backend team availability for validation testing
- Get team buy-in on updated timeline (21-27 days)

**Decisions Needed:**
- [ ] Approve updated plan with 20-26 day timeline
- [ ] Assign owner for backend validation coordination
- [ ] Confirm start date for M0

### 2. Backend Validation Preparation (2-3 hours)
**Owner:** [Assign - ideally tech lead or full-stack developer]

**Tasks:**
- [ ] Get API documentation or Swagger/OpenAPI spec
- [ ] Get database schema documentation
- [ ] Request test credentials for API access
- [ ] Get WebSocket endpoint URL and auth mechanism docs
- [ ] Confirm skill invocation mechanism (API endpoint? CLI wrapper?)
- [ ] Set up test environment access

**Deliverable:** Backend validation preparation checklist complete

### 3. Development Environment Setup (1-2 hours)
**Owner:** [Each developer]

**Tasks:**
- [ ] Clone repository to local machine
- [ ] Install Node.js (version specified in package.json)
- [ ] Install dependencies: `npm install`
- [ ] Verify development environment: `npm run dev`
- [ ] Read CLAUDE.md (once created in M0)
- [ ] Read project-structure.yaml (once created in M0)

## M0 Execution Plan

### Start Conditions
- [ ] Team review meeting complete
- [ ] Backend validation preparation complete
- [ ] Development environment working
- [ ] All M0 dependencies ready

### Critical Path

**Week 1 - Foundation (Days 1-2):**
```
Day 1:
- m0-001: Move web to web-legacy (30 min)
- m0-002: Create fresh React + Vite project (45 min)
- m0-003: Install core dependencies (60 min)
- m0-004: Configure Tailwind CSS (45 min)
- m0-005: Configure ESLint and Prettier (45 min)
- m0-006: Configure testing framework (60 min)

Day 2:
- m0-007: Create bulletproof-react folder structure (45 min)
- m0-008: Create project-structure.yaml (60 min)
- m0-009: Update CLAUDE.md (30 min)
- m0-010: Set up routing (60 min)
- m0-011: Create app shell with providers (60 min)
- m0-012: Create shared UI utilities (45 min)
```

**Week 1 - Validation & Docs (Days 3-4):**
```
Day 3:
- m0-013: Add shadcn Button component (45 min)
- m0-014: Configure environment variables (30 min)
- m0-015: Create API client foundation (90 min)
- m0-016: Create error boundary architecture (90 min)

Day 4:
- m0-017: Backend validation spike (120 min) ⚠️ CRITICAL
  └─ If blockers found: PAUSE, coordinate with backend, resolve
- m0-018: Document migration strategy (45 min)
- m0-019: Define performance budgets (60 min)
- m0-020: Final code review and cleanup (120 min)
```

### Go/No-Go Decision Point

**After m0-017 (Backend Validation Spike):**

**If GREEN (all validations pass):**
- ✅ Proceed to m0-018, m0-019, m0-020
- ✅ Complete M0
- ✅ Start M1 (sidebar feature)

**If YELLOW (minor issues found):**
- 🟡 Document issues in backend-validation-report.md
- 🟡 Create workaround tasks if possible
- 🟡 Assess impact on M1-M4 timeline
- 🟡 Get team approval to proceed

**If RED (critical blockers found):**
- 🔴 PAUSE development immediately
- 🔴 Document blockers in backend-validation-report.md
- 🔴 Escalate to backend team and PM
- 🔴 Do NOT proceed to M1 until resolved
- 🔴 Re-estimate timeline after resolution

**Critical Blocker Examples:**
- WebSocket authentication doesn't work
- Skill invocation NOT programmatic (CLI only)
- pipelineStatus field missing from database
- API endpoints return 404 or auth errors
- Documents API not implemented

## M1-M5 Execution Plan

### M1: Sidebar (Days 5-8)
**Start Condition:** M0 complete, backend validation GREEN

**Focus:** Build fixed sidebar with 10 workflow steps

**Key Milestones:**
- Day 5-6: Sidebar component structure
- Day 7: Jotai state management
- Day 8: Integration tests, code review

### M2: Chat Integration (Days 9-13)
**Start Condition:** M1 complete

**Focus:** Tabbed main area with @assistant-ui chat

**Key Milestones:**
- Day 9-10: Tabs component and chat UI
- Day 11-12: WebSocket integration and skill invocation
- Day 13: Integration tests, code review

**🎯 DEMO-READY AFTER M2**

### M3: Files Tab (Days 14-17)
**Start Condition:** M2 complete

**Focus:** File tree view and document preview

**Key Milestones:**
- Day 14-15: Tree view component
- Day 16: Preview pane with YAML/Markdown rendering
- Day 17: Integration tests, code review

### M4: Database Integration (Days 18-22)
**Start Condition:** M3 complete

**Focus:** API integration and resume capability

**Key Milestones:**
- Day 18-19: Projects and Documents APIs
- Day 20: Chat Messages API
- Day 21: Resume capability (3 subtasks)
- Day 22: Integration tests, code review

### M5: Polish & Accessibility (Days 23-27)
**Start Condition:** M4 complete

**Focus:** Keyboard nav, cascade updates, accessibility

**Key Milestones:**
- Day 23-24: Keyboard navigation and shortcuts
- Day 25: Cascade update mechanism
- Day 26-27: Accessibility audit and polish

**🚀 PRODUCTION-READY AFTER M5**

## Quality Gates

### Daily Quality Gate (Before Each Commit)
```bash
npm run lint      # ESLint must pass
npm run type-check # TypeScript must pass
npm run test      # All tests must pass
```

### Milestone Quality Gate (End of Each Milestone)
```bash
npm run lint
npm run type-check
npm run test
npm run build     # Build must succeed
```

**Plus manual verification:**
- [ ] All milestone success criteria met
- [ ] Code review completed
- [ ] Documentation updated
- [ ] No technical debt introduced without documenting

## Communication Plan

### Daily Standup
**Format:** Async or sync (15 min)

**Share:**
- Tasks completed yesterday
- Tasks planned today
- Blockers or questions

### Milestone Reviews
**After M0, M1, M2, M3, M4:**

**Format:** 30-60 min team review

**Review:**
- Milestone success criteria verification
- Code quality assessment
- Timeline tracking (on track / at risk / behind)
- Blockers or risks identified
- Adjustments needed

**Deliverable:** Go/no-go decision for next milestone

### Demo Sessions
**After M2 (Demo-Ready):**
- **Audience:** Stakeholders, PM, design team
- **Format:** Live demo + Q&A
- **Duration:** 30-45 min
- **Goal:** Validate UX and workflow approach

**After M5 (Production-Ready):**
- **Audience:** Stakeholders, PM, QA team
- **Format:** Comprehensive demo + acceptance testing
- **Duration:** 60-90 min
- **Goal:** Sign-off for production deployment

## Risk Monitoring

### High-Risk Areas to Watch

1. **M0 Backend Validation (m0-017)**
   - **Monitor:** Validation report findings
   - **Escalate if:** Any critical blockers found
   - **Owner:** Backend validation lead

2. **M2 WebSocket Integration**
   - **Monitor:** Connection stability, auth, streaming
   - **Escalate if:** WebSocket frequently disconnects or auth fails
   - **Owner:** Full-stack developer

3. **M4 Resume Capability**
   - **Monitor:** State hydration correctness across features
   - **Escalate if:** State sync fails or performance degrades
   - **Owner:** Frontend lead

4. **M5 Accessibility Compliance**
   - **Monitor:** WCAG 2.1 AA audit results
   - **Escalate if:** Major accessibility violations found
   - **Owner:** Accessibility champion

### Weekly Risk Review
**Every Friday:** Review risks, update mitigation plans

**Questions:**
- Are we on track for timeline?
- Any new risks identified this week?
- Any existing risks escalating?
- Do we need to adjust plan?

## Success Metrics

### Velocity Tracking
- **Target:** 8-10 tasks/week average
- **Measure:** Actual tasks completed per week
- **Flag if:** <6 tasks/week (potential timeline slip)

### Quality Metrics
- **Target:** >80% test coverage
- **Target:** 0 TypeScript errors
- **Target:** 0 critical ESLint errors
- **Flag if:** Coverage drops below 70%

### Timeline Tracking
- **Target:** Complete each milestone within estimated duration
- **Measure:** Actual days vs. estimated days per milestone
- **Flag if:** Milestone exceeds estimate by >1 day

## Resources

### Documentation
- `docs/planning/implementation/IMPLEMENTATION_SUMMARY.md` - Overview
- `docs/planning/implementation/milestones.yaml` - Milestone definitions
- `docs/planning/implementation/tasks/milestone-m*.tasks.yaml` - Task details
- `docs/planning/PLAN_REVIEW_CHANGES.md` - Changes from original plan
- `docs/planning/requirements/business-requirements.yaml` - What we're building
- `docs/planning/requirements/technical-requirements.yaml` - How we're building it
- `docs/planning/artifacts/style-anchors/` - Code patterns to follow

### Tools
- **React Query DevTools:** In-browser cache inspector
- **Vite Dev Server:** Fast HMR for development
- **Vitest:** Test framework with UI mode
- **ESLint + Prettier:** Code quality and formatting

### Support
- **Questions about plan:** Review docs/planning/ directory
- **Questions about patterns:** Check style-anchors/
- **Questions about backend:** Coordinate with backend team
- **Blockers:** Escalate to tech lead immediately

## Checklist: Ready to Start M0?

- [ ] Team review meeting completed
- [ ] Plan approved with updated timeline (21-27 days)
- [ ] Backend validation preparation complete
- [ ] Backend team coordinator assigned
- [ ] Test credentials and API access secured
- [ ] Development environments set up
- [ ] Start date scheduled
- [ ] Daily standup cadence established
- [ ] Milestone review schedule set
- [ ] All team members briefed on plan

**If all checked:** 🚀 Ready to start M0!

**If any unchecked:** Complete those items before starting.

---

**Next Action:** Schedule team review meeting to approve plan and prepare for M0 start.
