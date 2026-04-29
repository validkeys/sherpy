# Implementation Plan Summary

**Project:** Sherpy Flow UI Refactor  
**Generated:** 2026-04-28  
**Updated:** 2026-04-28 (Post-Review)  
**Ordering Strategy:** Value-First (Demo-Driven)

## Overview

Complete implementation plan with 6 milestones and 116 detailed tasks, estimated at 20-26 days total duration.

**Key Updates:**
- Enhanced M0 with backend validation spike, error boundaries, migration docs, and performance budgets
- Split M4 resume capability into 3 focused subtasks for better tracking
- Added WebSocket testing strategy documentation
- Updated estimates to reflect increased scope and risk mitigation

## Milestone Breakdown

### M0: Clean Slate Setup & Migration Preparation
- **Duration:** 3-4 days (20.5 hours)
- **Tasks:** 20 tasks (was 16)
- **Purpose:** Foundation setup + critical risk mitigation before features
- **Key Deliverables:**
  - Move existing web → web-legacy
  - Fresh React 19 + Vite project
  - Install all dependencies (jotai, bunshi, react-query, assistant-ui, shadcn)
  - **project-structure.yaml** created ✓
  - **CLAUDE.md** updated with structure reference ✓
  - Bulletproof-react folder structure established
  - Basic routing and app shell
  - **Error boundary architecture** (NEW)
  - **Backend validation spike** - validates APIs, WebSocket, skill invocation (NEW)
  - **Migration strategy documentation** (NEW)
  - **Performance budgets** defined (NEW)

### M1: Sidebar with Workflow Navigation
- **Duration:** 3-4 days (10.5 hours)
- **Tasks:** 15 tasks
- **Purpose:** First visible feature - guided workflow concept
- **Key Deliverables:**
  - Fixed sidebar (1/3 width) with 10 workflow steps
  - Status indicators (✓ → ○)
  - Clickable step navigation
  - Jotai state management
  - Integration tests

### M2: Chat Integration with Auto-Skill Invocation
- **Duration:** 4-5 days (12 hours)
- **Tasks:** 21 tasks
- **Purpose:** Core value delivery - chat + auto-skills
- **Key Deliverables:**
  - Tabbed main area (Chat/Files)
  - @assistant-ui/react integration
  - WebSocket with JWT auth
  - Auto-skill invocation on step navigation
  - Streaming AI responses
  - Hybrid chat (guided + free-form)

**🎯 MVP/Demo-Ready After M2** - Stakeholders can demo end-to-end workflow (10-13 days)

### M3: Files Tab with Tree View and Preview
- **Duration:** 3-4 days (12.75 hours)
- **Tasks:** 13 tasks
- **Purpose:** Secondary value - artifact review
- **Key Deliverables:**
  - Files tab with hierarchical tree view
  - Expand/collapse folders
  - Split-pane layout (30/70)
  - YAML syntax highlighting
  - Markdown rendering
  - React Query for document fetching

### M4: Database Integration and State Persistence
- **Duration:** 4-5 days (26 hours)
- **Tasks:** 23 tasks (was 20)
- **Purpose:** Infrastructure (deferred after visible features)
- **Key Deliverables:**
  - Projects API (CRUD with pipelineStatus)
  - Documents API (generate, list, get)
  - Chat messages API
  - **Resume capability split into 3 focused subtasks:**
    - Project selector UI (m4-017)
    - Project loader hook (m4-018)
    - State hydration logic (m4-019)
  - **WebSocket testing strategy** documented (NEW)
  - React Query cache management
  - Integration tests with mocked API

### M5: Polish, Accessibility, and Advanced Features
- **Duration:** 4-5 days (36 hours / 4.5 days)
- **Tasks:** 24 tasks
- **Purpose:** Final polish and production quality
- **Key Deliverables:**
  - Keyboard navigation shortcuts
  - Cascade update mechanism
  - WCAG 2.1 AA compliance
  - Error handling polish
  - Toast notifications
  - Loading states refinement
  - Comprehensive accessibility audit
  
**Note:** Duration corrected from "3-4 days" to match actual 36 hour estimate (4.5 days)

**🚀 Production-Ready After M5** (21-27 days)

## Timeline Summary

| Milestone | Duration | Tasks | Total Hours | Cumulative Days |
|-----------|----------|-------|-------------|-----------------|
| M0        | 3-4 days | 20    | 20.5        | 3-4             |
| M1        | 3-4 days | 15    | 10.5        | 6-8             |
| M2        | 4-5 days | 21    | 12.0        | 10-13           |
| M3        | 3-4 days | 13    | 12.75       | 13-17           |
| M4        | 4-5 days | 23    | 26.0        | 17-22           |
| M5        | 4-5 days | 24    | 36.0        | 21-27           |
| **Total** | **20-26 days** | **116** | **~118 hours** | **20-26** |

**Changes from Original Plan:**
- M0: +4 tasks, +6 hours (backend validation, error boundaries, docs)
- M4: +3 tasks, +4 hours (resume capability split, WebSocket testing docs)
- M5: Duration label corrected (was 3-4, now 4-5 to match 36h estimate)
- **Net change:** +7 tasks, +10 hours, +2-5 days

## Value-First Strategy Benefits

1. **Early Demos:** M0-M2 delivers working sidebar + chat in 10-13 days (with backend validation)
2. **Stakeholder Feedback:** Can validate UX and workflow before infrastructure
3. **Reduced Risk:** Core features proven before investing in persistence layer
4. **Backend Validation Early:** M0 spike catches integration issues before M1-M3 feature work
5. **Flexibility:** Can ship early if timeline pressure requires (M0-M3 is usable)
6. **Motivation:** Team sees visible progress from day one

## Risk Mitigation Improvements

The updated plan includes several risk mitigation enhancements:

1. **M0 Backend Validation Spike (120 min):**
   - Validates all API endpoints before feature development
   - Tests WebSocket connection and authentication
   - Confirms programmatic skill invocation mechanism
   - Verifies database schema (pipelineStatus field)
   - **Prevents costly rework in M1-M4 if assumptions are wrong**

2. **Error Boundary Architecture (90 min):**
   - React error boundaries for graceful failures
   - Error classification and recovery strategies
   - User-friendly error messages
   - **Improves UX and debugging throughout development**

3. **Migration Strategy Documentation (45 min):**
   - Documents transition from web-legacy
   - Identifies shared dependencies
   - Plans routing migration and rollback
   - **Prevents issues during deployment**

4. **Performance Budgets (60 min):**
   - Bundle size limits
   - React Query cache limits
   - WebSocket message batching
   - **Prevents performance degradation**

5. **Resume Capability Split (3 tasks):**
   - Breaks complex feature into focused subtasks
   - Project selector UI (m4-017)
   - Loader hook (m4-018)
   - State hydration (m4-019)
   - **Reduces risk, improves tracking**

6. **WebSocket Testing Strategy (45 min):**
   - Documents mocking approach
   - Provides test utilities
   - **Enables confident testing of streaming chat**

## Critical Path

All milestones are sequential (no parallel opportunities in this plan):

```
M0 → M1 → M2 → M3 → M4 → M5
```

**Why Sequential?**
- M0 provides foundation for all features
- M1 provides sidebar needed by M2 auto-invocation
- M2 provides chat infrastructure needed by M3
- M3 provides UI completion before adding persistence (M4)
- M4 provides data layer before polish features (M5)

## Quality Assurance

Every milestone includes:
- ✓ TDD with test coverage requirements (70-85%)
- ✓ Style anchor references in all tasks
- ✓ Quality gates (lint, typecheck, test, build)
- ✓ Comprehensive code review as final task
- ✓ Integration tests for feature behavior
- ✓ Manual testing checklists

## Style Anchors Integrated

All tasks reference relevant style anchors:
- **feature-module-structure** - Feature-based organization
- **react-query-api-layer** - Three-part API pattern
- **react-query-mutations** - Mutation with cache invalidation
- **jotai-feature-state** - Client state management
- **shadcn-component-pattern** - UI components with CVA
- **assistant-ui-integration** - Chat streaming

## Key Features of Task Breakdowns

1. **Proper Sizing:** All tasks 30-150 minutes
2. **Clear Dependencies:** Tasks properly sequenced with parallel opportunities noted
3. **TDD Integration:** Code tasks followed by test tasks
4. **Validation Commands:** Every task has verification steps
5. **Drift Prevention:** Constraints and quality gates at every stage
6. **Detailed Instructions:** Step-by-step guidance with code examples
7. **Success Criteria:** Measurable completion criteria per task

## Getting Started

1. **Review Plan:** Read `milestones.yaml` and all task files
2. **Start M0:** Begin with `tasks/milestone-m0.tasks.yaml`
3. **Task-by-Task:** Work through tasks sequentially
4. **Commit Often:** Commit after each completed task
5. **Quality Gates:** Run validation commands before committing
6. **Code Review:** Complete milestone code review before moving to next milestone

## Files Generated

```
docs/planning/
├── implementation/
│   ├── milestones.yaml                    # Master milestone definition
│   ├── IMPLEMENTATION_SUMMARY.md          # This file
│   └── tasks/
│       ├── milestone-m0.tasks.yaml        # 16 tasks, 14.5h
│       ├── milestone-m1.tasks.yaml        # 15 tasks, 10.5h
│       ├── milestone-m2.tasks.yaml        # 21 tasks, 12h
│       ├── milestone-m3.tasks.yaml        # 13 tasks, 12.75h
│       ├── milestone-m4.tasks.yaml        # 20 tasks, 22h
│       └── milestone-m5.tasks.yaml        # 24 tasks, 36h
├── requirements/
│   ├── business-requirements.yaml
│   └── technical-requirements.yaml
└── artifacts/
    ├── style-anchors/
    │   ├── index.yaml
    │   ├── feature-module-structure.md
    │   ├── react-query-api-layer.md
    │   ├── react-query-mutations.md
    │   ├── jotai-feature-state.md
    │   ├── shadcn-component-pattern.md
    │   └── assistant-ui-integration.md
    ├── bulletproof-react-style-anchors.md
    ├── style-anchors-quick-reference.md
    ├── ui-refactor-feature-mapping.md
    └── IMPLEMENTATION_NOTES.md
```

## Next Steps

**Immediate:**
1. Review this summary and all milestone task files
2. Validate task estimates and dependencies
3. Begin M0 implementation

**During Development:**
1. Follow task instructions precisely
2. Reference style anchors for patterns
3. Run quality gates before committing
4. Complete code reviews at milestone boundaries
5. Update task status as you progress

**Post M2 (Demo-Ready):**
1. Schedule stakeholder demo
2. Gather feedback on UX and workflow
3. Adjust M3-M5 based on learnings

**Post M5 (Production-Ready):**
1. Final QA and accessibility audit
2. Performance testing
3. User acceptance testing
4. Deployment preparation

---

## Critical Recommendations

### Before Starting M1

1. **Complete M0 Backend Validation Spike:**
   - DO NOT proceed to M1 until backend validation spike (m0-017) completes
   - If critical blockers found (skill invocation not programmatic, pipelineStatus missing, WebSocket auth broken), PAUSE and resolve
   - Document findings in `docs/planning/artifacts/backend-validation-report.md`
   - Green light from backend validation required before M1 start

2. **Review Error Boundary Architecture:**
   - Error boundaries must be in place before feature development
   - Prevents difficult debugging later
   - Provides recovery patterns for features

3. **Confirm Performance Budgets:**
   - Team agreement on bundle size limits
   - React Query cache strategy understood
   - WebSocket message handling planned

### During M4 Implementation

1. **Resume Capability - Follow Task Order:**
   - m4-017: Project selector UI first
   - m4-018: Loader hook second
   - m4-019: State hydration third
   - Do not attempt to combine these tasks

2. **WebSocket Testing:**
   - Review testing strategy document (m4-020) before writing tests
   - Use provided mocks for consistency
   - Do not attempt real WebSocket connections in tests

### Monitoring Throughout

1. **Watch for Scope Creep:**
   - Stick to task instructions
   - Defer "nice-to-haves" to M5 or later
   - No premature optimization

2. **Quality Gates:**
   - Run quality gates before each commit
   - Do not skip tests "to save time"
   - Fix TypeScript errors immediately

3. **Documentation:**
   - Keep CLAUDE.md and project-structure.yaml updated
   - Document deviations from plan
   - Update task status as you go

---

**Total Plan:** 116 tasks across 6 milestones, 20-26 days estimated duration.

**Demo-Ready:** After M2 (~10-13 days)  
**Production-Ready:** After M5 (~21-27 days)

**Confidence Level:** High (with backend validation completion)  
**Risk Level:** Low-Medium (mitigated by M0 validation spike)
