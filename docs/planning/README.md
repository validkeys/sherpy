# Sherpy Flow UI Refactor - Planning Documentation

**Project Status:** Planning Complete - Ready to Execute  
**Last Updated:** 2026-04-28  
**Timeline:** 20-26 days (4-5 weeks)

---

## Quick Start

### For Executives/Stakeholders
👉 **Read:** [EXECUTIVE_SUMMARY.md](./EXECUTIVE_SUMMARY.md) - High-level overview, timeline, budget, risks

### For Product Managers
👉 **Read:** 
1. [EXECUTIVE_SUMMARY.md](./EXECUTIVE_SUMMARY.md) - Overall scope and timeline
2. [NEXT_ACTIONS.md](./NEXT_ACTIONS.md) - Immediate actions needed
3. [requirements/business-requirements.yaml](./requirements/business-requirements.yaml) - What we're building

### For Developers
👉 **Read:**
1. [NEXT_ACTIONS.md](./NEXT_ACTIONS.md) - How to get started
2. [implementation/IMPLEMENTATION_SUMMARY.md](./implementation/IMPLEMENTATION_SUMMARY.md) - Developer-focused summary
3. [implementation/milestones.yaml](./implementation/milestones.yaml) - Milestone definitions
4. [implementation/tasks/](./implementation/tasks/) - Detailed task breakdowns

### For Tech Leads
👉 **Read:**
1. [PLAN_REVIEW_CHANGES.md](./PLAN_REVIEW_CHANGES.md) - What changed from original plan
2. [requirements/technical-requirements.yaml](./requirements/technical-requirements.yaml) - Technical decisions
3. [artifacts/style-anchors/](./artifacts/style-anchors/) - Code patterns to follow

---

## Document Index

### 📋 Executive Documents

| Document | Purpose | Audience | Read Time |
|----------|---------|----------|-----------|
| [EXECUTIVE_SUMMARY.md](./EXECUTIVE_SUMMARY.md) | High-level overview, timeline, budget, risks | Executives, PMs, Stakeholders | 10 min |
| [NEXT_ACTIONS.md](./NEXT_ACTIONS.md) | Immediate next steps and execution plan | All team members | 15 min |
| [PLAN_REVIEW_CHANGES.md](./PLAN_REVIEW_CHANGES.md) | Detailed change log from plan review | Tech leads, curious devs | 10 min |

### 📐 Requirements Documents

| Document | Purpose | Audience | Read Time |
|----------|---------|----------|-----------|
| [requirements/business-requirements.yaml](./requirements/business-requirements.yaml) | What we're building and why | PMs, designers, all team | 20 min |
| [requirements/technical-requirements.yaml](./requirements/technical-requirements.yaml) | How we're building it (tech stack, architecture) | Developers, tech leads | 25 min |

### 🗓️ Implementation Planning

| Document | Purpose | Audience | Read Time |
|----------|---------|----------|-----------|
| [implementation/IMPLEMENTATION_SUMMARY.md](./implementation/IMPLEMENTATION_SUMMARY.md) | Developer-focused plan summary | Developers, tech leads | 15 min |
| [implementation/milestones.yaml](./implementation/milestones.yaml) | 6 milestone definitions with success criteria | Developers, PMs | 10 min |
| [implementation/tasks/milestone-m0.tasks.yaml](./implementation/tasks/milestone-m0.tasks.yaml) | M0: Foundation (20 tasks, 3-4 days) | Developers | 30 min |
| [implementation/tasks/milestone-m1.tasks.yaml](./implementation/tasks/milestone-m1.tasks.yaml) | M1: Sidebar (15 tasks, 3-4 days) | Developers | 25 min |
| [implementation/tasks/milestone-m2.tasks.yaml](./implementation/tasks/milestone-m2.tasks.yaml) | M2: Chat (21 tasks, 4-5 days) | Developers | 30 min |
| [implementation/tasks/milestone-m3.tasks.yaml](./implementation/tasks/milestone-m3.tasks.yaml) | M3: Files (13 tasks, 3-4 days) | Developers | 20 min |
| [implementation/tasks/milestone-m4.tasks.yaml](./implementation/tasks/milestone-m4.tasks.yaml) | M4: Database (23 tasks, 4-5 days) | Developers | 35 min |
| [implementation/tasks/milestone-m5.tasks.yaml](./implementation/tasks/milestone-m5.tasks.yaml) | M5: Polish (24 tasks, 4-5 days) | Developers | 30 min |

### 🎨 Style Anchors & Patterns

| Document | Purpose | Audience | Read Time |
|----------|---------|----------|-----------|
| [artifacts/style-anchors/index.yaml](./artifacts/style-anchors/index.yaml) | Index of all 6 style anchors | Developers | 5 min |
| [artifacts/style-anchors/feature-module-structure.md](./artifacts/style-anchors/feature-module-structure.md) | Feature-based folder structure pattern | Developers | 10 min |
| [artifacts/style-anchors/react-query-api-layer.md](./artifacts/style-anchors/react-query-api-layer.md) | Three-part API pattern (fetcher + options + hook) | Developers | 10 min |
| [artifacts/style-anchors/react-query-mutations.md](./artifacts/style-anchors/react-query-mutations.md) | Mutation pattern with cache invalidation | Developers | 10 min |
| [artifacts/style-anchors/jotai-feature-state.md](./artifacts/style-anchors/jotai-feature-state.md) | Jotai atoms with Bunshi DI | Developers | 8 min |
| [artifacts/style-anchors/shadcn-component-pattern.md](./artifacts/style-anchors/shadcn-component-pattern.md) | shadcn component with CVA variants | Developers | 8 min |
| [artifacts/style-anchors/assistant-ui-integration.md](./artifacts/style-anchors/assistant-ui-integration.md) | @assistant-ui chat integration | Developers | 10 min |
| [bulletproof-react-style-anchors.md](./bulletproof-react-style-anchors.md) | Comprehensive bulletproof-react reference | Developers | 30 min |
| [style-anchors-quick-reference.md](./style-anchors-quick-reference.md) | Quick style anchor lookup | Developers | 5 min |
| [ui-refactor-feature-mapping.md](./ui-refactor-feature-mapping.md) | How patterns apply to sidebar/chat features | Developers | 10 min |

### 📝 Supporting Artifacts

| Document | Purpose | Audience | When Created |
|----------|---------|----------|--------------|
| [artifacts/IMPLEMENTATION_NOTES.md](./artifacts/IMPLEMENTATION_NOTES.md) | Implementation guidance and notes | Developers | ✅ Created |
| `artifacts/backend-validation-report.md` | Backend validation findings | All team | M0 task m0-017 |
| `artifacts/migration-strategy.md` | Migration from web-legacy | Developers, ops | M0 task m0-018 |
| `artifacts/performance-budgets.md` | Performance limits and monitoring | Developers | M0 task m0-019 |
| `artifacts/websocket-testing-strategy.md` | WebSocket testing approach | Developers | M4 task m4-020 |

---

## Plan Statistics

### Overview
- **Total Milestones:** 6 (M0 through M5)
- **Total Tasks:** 116 detailed tasks
- **Total Hours:** ~118 hours
- **Timeline:** 20-26 days (4-5 weeks)
- **Demo-Ready:** After M2 (~10-13 days)
- **Production-Ready:** After M5 (~20-26 days)

### Milestone Breakdown

| ID | Name | Duration | Tasks | Hours | Purpose |
|----|------|----------|-------|-------|---------|
| M0 | Foundation & Validation | 3-4 days | 20 | 20.5 | Setup + backend validation |
| M1 | Sidebar Feature | 3-4 days | 15 | 10.5 | First visible feature |
| M2 | Chat Integration | 4-5 days | 21 | 12.0 | Core value delivery |
| M3 | Files Tab | 3-4 days | 13 | 12.75 | Secondary feature |
| M4 | Database Integration | 4-5 days | 23 | 26.0 | State persistence |
| M5 | Polish & Accessibility | 4-5 days | 24 | 36.0 | Production quality |

### Key Deliverables by Milestone

**M0 (Foundation):**
- Fresh React 19 + Vite setup
- All dependencies installed
- Error boundary architecture
- **Backend validation spike** ⚠️ CRITICAL
- Migration strategy documented
- Performance budgets defined

**M1 (Sidebar):**
- Fixed sidebar showing 10 workflow steps
- Status indicators (✓ → ○)
- Clickable step navigation
- Jotai state management

**M2 (Chat):** ⭐ DEMO-READY
- Tabbed main area (Chat/Files)
- @assistant-ui chat integration
- WebSocket with streaming
- Auto-skill invocation on step click

**M3 (Files):**
- File tree view with folders
- Document preview (YAML/Markdown)
- React Query integration

**M4 (Database):**
- Projects API (CRUD)
- Documents API (generate, list, get)
- Chat messages API
- **Resume capability** (load existing projects)

**M5 (Polish):** 🚀 PRODUCTION-READY
- Keyboard navigation shortcuts
- Cascade update mechanism
- WCAG 2.1 AA compliance
- Error handling polish
- Loading states refined

---

## Critical Success Factors

### 1. Backend Validation Must Pass (M0, Day 3-4)
**This is the most important gate in the entire plan.**

- Complete task m0-017 (backend validation spike)
- Validates: API endpoints, WebSocket, skill invocation, database schema
- **If blockers found:** PAUSE before M1, coordinate with backend
- **Do not skip this task**

### 2. Follow Task Order
- Complete tasks sequentially within each milestone
- Do not skip ahead or combine tasks
- Especially critical for M4 resume capability (3 sequential subtasks)

### 3. Maintain Quality Gates
```bash
# Before every commit
npm run lint
npm run type-check
npm run test
```

### 4. Review at Milestone Boundaries
- Complete milestone code review task
- Verify all success criteria met
- Hold go/no-go meeting before next milestone

---

## Getting Started

### For First-Time Readers

1. **Understand the problem:** Read [business-requirements.yaml](./requirements/business-requirements.yaml)
2. **See the solution:** Read [EXECUTIVE_SUMMARY.md](./EXECUTIVE_SUMMARY.md)
3. **Know what's next:** Read [NEXT_ACTIONS.md](./NEXT_ACTIONS.md)
4. **Dive into details:** Read your role-specific docs above

### For Developers Starting Implementation

1. **Read:** [NEXT_ACTIONS.md](./NEXT_ACTIONS.md) - Pre-M0 checklist
2. **Read:** [implementation/IMPLEMENTATION_SUMMARY.md](./implementation/IMPLEMENTATION_SUMMARY.md) - Plan overview
3. **Read:** [technical-requirements.yaml](./requirements/technical-requirements.yaml) - Tech stack
4. **Read:** [style-anchors/index.yaml](./artifacts/style-anchors/index.yaml) - Code patterns
5. **Start:** [tasks/milestone-m0.tasks.yaml](./implementation/tasks/milestone-m0.tasks.yaml) - First 20 tasks

### For Team Leads Reviewing the Plan

1. **Read:** [EXECUTIVE_SUMMARY.md](./EXECUTIVE_SUMMARY.md) - Overall plan
2. **Read:** [PLAN_REVIEW_CHANGES.md](./PLAN_REVIEW_CHANGES.md) - What changed and why
3. **Review:** [implementation/milestones.yaml](./implementation/milestones.yaml) - Milestone structure
4. **Scan:** [implementation/tasks/](./implementation/tasks/) - Task quality
5. **Approve or request changes**

---

## Plan Quality Indicators

### ✅ Strengths

- **Comprehensive risk mitigation** - Backend validation spike, error boundaries, performance budgets
- **Realistic estimates** - 116 properly-sized tasks (30-150 min each)
- **Value-first delivery** - Demo-ready in 2 weeks, production in 4-5 weeks
- **Clear quality gates** - TDD, coverage requirements, milestone reviews
- **Detailed documentation** - Every task has step-by-step instructions
- **Pattern-driven** - 6 style anchors prevent drift and ensure consistency

### ⚠️ Dependencies to Watch

- **Backend availability** - M0 validation requires backend team coordination
- **API stability** - M4 integration assumes stable API contracts
- **WebSocket reliability** - M2 chat depends on WebSocket working correctly
- **Skill invocation** - Auto-skills depend on programmatic invocation support

All dependencies validated in M0 before feature development begins.

---

## Change History

### 2026-04-28: Post-Review Updates
- Added M0 backend validation spike (m0-017) - **CRITICAL**
- Added M0 error boundary architecture (m0-016)
- Added M0 migration strategy docs (m0-018)
- Added M0 performance budgets (m0-019)
- Split M4 resume capability into 3 subtasks (m4-017, m4-018, m4-019)
- Added M4 WebSocket testing strategy (m4-020)
- Fixed M5 duration label (3-4 → 4-5 days to match 36h estimate)
- Updated totals: 109→116 tasks, 18-24→20-26 days

**Impact:** +7 tasks, +2 days, significantly reduced risk

### 2026-04-28: Initial Plan
- Created complete implementation plan
- 109 tasks across 6 milestones
- 18-24 day timeline
- Style anchors collected
- Requirements documented

---

## Questions?

### About the Plan
- **Tech Lead:** Review [PLAN_REVIEW_CHANGES.md](./PLAN_REVIEW_CHANGES.md)
- **Developers:** Check [implementation/](./implementation/) folder
- **Stakeholders:** Read [EXECUTIVE_SUMMARY.md](./EXECUTIVE_SUMMARY.md)

### About Getting Started
- **Everyone:** Read [NEXT_ACTIONS.md](./NEXT_ACTIONS.md)
- **Team setup:** See "Team Structure" in [EXECUTIVE_SUMMARY.md](./EXECUTIVE_SUMMARY.md)

### About Specific Tasks
- Open relevant task file in [implementation/tasks/](./implementation/tasks/)
- Each task has detailed instructions, constraints, and success criteria

---

## Approval Status

### Sign-Offs Needed

- [ ] **Tech Lead** - Architecture and technical approach
- [ ] **Backend Team** - Validation coordination and API contracts
- [ ] **Product Manager** - Scope, timeline, and deliverables
- [ ] **Stakeholders** - Budget and resource allocation

### Ready to Start When

- [ ] All approvals received
- [ ] Backend validation preparation complete
- [ ] Team members assigned
- [ ] Start date scheduled
- [ ] Development environments set up

---

## Contact & Support

### For Plan Questions
- **Created by:** Claude Sonnet 4.5 (AI Planning Assistant)
- **Date:** 2026-04-28
- **Status:** Complete and ready for review

### For Implementation Support
- **Style Anchors:** See [artifacts/style-anchors/](./artifacts/style-anchors/)
- **Task Help:** Each task has detailed instructions
- **Blockers:** Escalate to tech lead immediately

---

**Current Status:** 📋 Planning Complete - Awaiting Approval

**Next Step:** Schedule team review meeting to approve plan and begin M0 preparation

**Target Start:** [To be determined after approvals]
