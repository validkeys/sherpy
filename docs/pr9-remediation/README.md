# PR #9 Code Review Remediation - Implementation Plan

**Created:** 2026-05-14  
**Branch:** feat/sherpy-prompt-command  
**Ordering Strategy:** Single Feature Branch  
**Total Estimated Time:** 6.5 hours

---

## Overview

This implementation plan addresses all concerns raised in the PR #9 code review for the sherpy prompt command feature. The plan systematically tackles 8 functional requirements and 4 non-functional requirements across 6 milestones.

## Quick Start

```bash
# Navigate to implementation directory
cd docs/pr9-remediation

# Review requirements
cat requirements/business-requirements.yaml
cat requirements/technical-requirements.yaml

# Review milestones
cat implementation/milestones.yaml

# Start with milestone m0
cat implementation/tasks/milestone-m0.tasks.yaml
```

## Structure

```
docs/pr9-remediation/
├── README.md (this file)
├── requirements/
│   ├── business-requirements.yaml     # 8 FR, 4 NFR requirements
│   └── technical-requirements.yaml    # Technical decisions & architecture
├── artifacts/
│   └── style-anchors/
│       └── index.yaml                 # Code patterns for implementation
├── implementation/
│   ├── milestones.yaml                # 6 milestones overview
│   └── tasks/
│       ├── milestone-m0.tasks.yaml    # Code Quality (6 tasks, 2h)
│       ├── milestone-m1.tasks.yaml    # Repository Cleanup (6 tasks, 45m)
│       ├── milestone-m2.tasks.yaml    # Documentation (6 tasks, 1.5h)
│       ├── milestone-m3.tasks.yaml    # Security Review (5 tasks, 1.25h)
│       ├── milestone-m4.tasks.yaml    # CI/CD (4 tasks, 1h)
│       └── milestone-m5.tasks.yaml    # Final Validation (5 tasks, 30m)
└── code-reviews/                       # Created during implementation
    └── *.yaml                          # Milestone review artifacts
```

## Requirements Summary

### Functional Requirements (FR)

| ID | Priority | Requirement | Milestone |
|----|----------|-------------|-----------|
| FR-1 | Critical | Remove committed binary | m1 |
| FR-2 | High | Fix orphaned prompts warning | m0 |
| FR-3 | Medium | Deduplicate stripFrontmatter | m0 |
| FR-4 | High | Update repository references | m2 |
| FR-5 | Medium | Add CHANGELOG entry | m2 |
| FR-6 | Low | Document go:generate workflow | m2 |
| FR-7 | Medium | Add CI check for generated files | m4 |
| FR-8 | High | Review path traversal security | m3 |

### Non-Functional Requirements (NFR)

| ID | Category | Requirement | Coverage |
|----|----------|-------------|----------|
| NFR-1 | Security | Path traversal validated | m3 |
| NFR-2 | Maintainability | No code duplication, DRY | m0 |
| NFR-3 | Quality | Clean test output | m0 |
| NFR-4 | Documentation | Complete and accurate | m2 |

## Milestones

### m0: Code Quality & Refactoring (2 hours)
**Dependencies:** None  
**Tasks:** 6

Extract shared utilities, eliminate code duplication, fix orphaned prompt warnings.

**Key Deliverables:**
- prompt/frontmatter.go (shared utility)
- prompt/frontmatter_test.go (comprehensive tests)
- Updated registry.go and gen_prompts.go
- Filtered non-pipeline skills in generation

### m1: Repository Cleanup (45 minutes)
**Dependencies:** None  
**Tasks:** 6

Remove accidentally committed sherpy binary from Git history.

**Key Deliverables:**
- Binary removed from all Git history
- Backup branch for safety
- Cleanup report documenting verification

⚠️  **Warning:** This milestone rewrites Git history. Force push required.

### m2: Documentation Updates (1.5 hours)
**Dependencies:** m0  
**Tasks:** 6

Update repository references, add CHANGELOG, document contributor workflow.

**Key Deliverables:**
- CHANGELOG.md (new)
- CONTRIBUTING.md (new/updated)
- README.md, USAGE.md updated
- All references use validkeys/sherpy

### m3: Security Review & Documentation (1.25 hours)
**Dependencies:** m0  
**Tasks:** 5

Review path traversal policy, document rationale, evaluate alternatives.

**Key Deliverables:**
- Security analysis document
- Enhanced code documentation
- README security section
- Test coverage validation

### m4: CI/CD Automation (1 hour)
**Dependencies:** m0, m2  
**Tasks:** 4

Add GitHub Actions workflow to validate generated content is current.

**Key Deliverables:**
- .github/workflows/validate-generated.yml
- CI integration assessment
- Workflow testing documentation

### m5: Final Validation & Review (30 minutes)
**Dependencies:** m1, m2, m3, m4  
**Tasks:** 5

Comprehensive validation of all remediation work and preparation for re-review.

**Key Deliverables:**
- FR verification checklist
- NFR verification checklist
- Final test results
- Remediation summary report
- Final code review

## Execution Order

The milestones follow **Single Feature Branch** ordering (technical dependency):

```
Start
  ↓
  m0 (Code Quality) ← Foundation for m2, m3, m4
  ↓
  ├─→ m1 (Repository Cleanup) ← Independent, can run anytime
  │
  ├─→ m2 (Documentation) ← Depends on m0
  │   ↓
  ├─→ m3 (Security Review) ← Depends on m0
  │   ↓
  │   m4 (CI/CD) ← Depends on m0, m2
  │   ↓
  └─→ m5 (Final Validation) ← Depends on all
```

**Parallel Execution:**
- m1 can run independently anytime
- m2 and m3 can run in parallel after m0
- m4 must wait for m0 and m2
- m5 must wait for all others

## Task Sizing

All tasks follow **30-150 minute sizing rule**:

| Milestone | Tasks | Total Time | Avg per Task |
|-----------|-------|------------|--------------|
| m0 | 6 | 120 min | 37.5 min |
| m1 | 6 | 45 min | 7.5 min |
| m2 | 6 | 90 min | 15 min |
| m3 | 5 | 75 min | 15 min |
| m4 | 4 | 60 min | 15 min |
| m5 | 5 | 30 min | 6 min |
| **Total** | **32** | **390 min** | **12.2 min** |

**Note:** Some m1 and m5 tasks are < 30 minutes as they are verification/documentation tasks rather than implementation.

## Code Review Integration

Each milestone includes a comprehensive code review task:

1. **During milestone:** Complete all implementation tasks
2. **Final task:** Run comprehensive code review
3. **Output:** Create code-reviews/YYYY-MM-DD-N-code-review.yaml
4. **Sign-off:** Document readiness for next milestone

**Review artifacts:**
- m0: 2026-05-14-1-code-review.yaml
- m1: 2026-05-14-2-code-review.yaml
- m2: 2026-05-14-3-code-review.yaml
- m3: 2026-05-14-4-code-review.yaml
- m4: 2026-05-14-5-code-review.yaml
- m5: 2026-05-14-6-code-review.yaml (final)

## Style Anchors

Implementation references 6 style anchors:

1. **shared-utility-extraction** - Extract duplicated code
2. **go-generate-filter** - Filter items during generation
3. **test-cleanup-pattern** - Clean test output
4. **changelog-entry** - CHANGELOG.md format
5. **git-remove-from-history** - Safe history rewriting
6. **github-actions-validation** - CI validation workflow

See: `artifacts/style-anchors/index.yaml`

## Quality Gates

### Pre-Commit (per milestone)
- Code compiles
- Tests pass
- No warnings in output
- Files follow conventions

### CI (final)
- All unit tests pass
- Integration tests pass
- No warnings in test output
- Generated content current
- Coverage maintained

### Pre-Merge (m5)
- All FR requirements complete
- All NFR requirements met
- Test suite passes cleanly
- Binary not in Git history
- Documentation accurate and complete

## Success Criteria

**Code Review Approval:**
- ✅ All 8 FR requirements addressed
- ✅ All 4 NFR requirements met
- ✅ No regressions introduced
- ✅ Test suite passes with zero warnings
- ✅ Binary removed from Git history
- ✅ Documentation comprehensive and accurate

**Technical Metrics:**
- Test coverage: Maintained or improved
- Build time: No significant increase
- Binary size: No significant increase (< 5%)
- Repository size: Reduced by ~6MB

**Process Metrics:**
- 32 tasks completed
- 6 code reviews conducted
- 0 critical issues remaining
- 100% requirement coverage

## Usage

### Starting a Milestone

```bash
# Read milestone overview
cat implementation/milestones.yaml | grep -A 10 "id: m0"

# Read task file
cat implementation/tasks/milestone-m0.tasks.yaml

# Review style anchors
cat artifacts/style-anchors/index.yaml
```

### Executing Tasks

```bash
# Follow task instructions in order
# Each task includes:
# - Objective
# - Implementation steps
# - Constraints
# - Validation commands
# - Drift policy

# Example: Run task validation
go test ./prompt/... -v
```

### Completing a Milestone

```bash
# Run milestone code review task
# Create code-reviews/YYYY-MM-DD-N-code-review.yaml

# Verify all tasks complete
# Check success criteria met

# Proceed to next milestone
```

## Critical Warnings

### ⚠️  Git History Rewrite (m1)

Milestone m1 rewrites Git history to remove the binary. This requires:

1. **Backup branch:** Created automatically in m1-002
2. **Force push:** Required after history rewrite
3. **Team coordination:** If others working on branch
4. **Recovery plan:** Documented in m1

**Force push command:**
```bash
git push origin feat/sherpy-prompt-command --force-with-lease
```

### ⚠️  Single Feature Branch Strategy

All work happens on `feat/sherpy-prompt-command` branch:
- No intermediate PRs
- All milestones on same branch
- Single final PR for review
- Force push required after m1

## Recovery

### If Something Goes Wrong

**During m1 (history rewrite):**
```bash
# Restore from backup
git reset --hard backup/feat-sherpy-prompt-pre-cleanup
```

**During any milestone:**
```bash
# Check what changed
git status
git diff

# Revert specific files
git checkout -- [file]

# Revert all uncommitted changes
git reset --hard HEAD
```

## Validation

### Pre-Implementation Checklist

- [ ] Requirements documents reviewed
- [ ] Style anchors understood
- [ ] Milestone dependencies clear
- [ ] Task sizing understood
- [ ] Quality gates defined

### Post-Implementation Checklist

- [ ] All tasks completed
- [ ] All code reviews passed
- [ ] FR verification complete
- [ ] NFR verification complete
- [ ] Test suite passes
- [ ] Binary removed from history
- [ ] Documentation accurate
- [ ] Remediation summary created
- [ ] Ready for re-review

## Next Steps After Completion

1. **Push changes:**
   ```bash
   git push origin feat/sherpy-prompt-command --force-with-lease
   ```

2. **Request re-review:**
   - Comment on PR #9
   - Reference docs/pr9-remediation/REMEDIATION-SUMMARY.md
   - Tag original reviewers
   - Request re-approval

3. **Monitor CI:**
   - Verify validate-generated.yml passes
   - Check all tests pass
   - Confirm no warnings

## Questions?

- **Implementation details:** See task YAML files in implementation/tasks/
- **Requirements:** See requirements/*.yaml
- **Code reviews:** See code-reviews/*.yaml (created during implementation)
- **Final summary:** See REMEDIATION-SUMMARY.md (created in m5)

---

**Plan Status:** Ready for execution  
**Generated by:** claude-sonnet-4.5  
**Date:** 2026-05-14
