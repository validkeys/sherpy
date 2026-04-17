---
name: definition-of-done
description: Enhances milestones.yaml with detailed acceptance criteria for each milestone. Derives functional acceptance criteria, non-functional gates, testing requirements, documentation requirements, and exit checklists from business and technical requirements. Updates milestones.yaml in place with optional acceptance_criteria and exit_checklist fields.
---

# Definition of Done

Enhances existing `milestones.yaml` with detailed acceptance criteria for each milestone. Bridges the gap between "the plan says we're building X" and "we know for certain that X is done." Adds optional `acceptance_criteria` and `exit_checklist` fields to each milestone, derived directly from requirements — not generic checklists.

## Prerequisites

- `{base_directory}/implementation/milestones.yaml` (output from `/implementation-planner`)
  - Must contain milestone definitions with `id`, `name`, `description`, `success_criteria`
  - Skill will add optional `acceptance_criteria` and `exit_checklist` fields
- `{base_directory}/requirements/business-requirements.yaml` (output from `/business-requirements-interview`)
- Optional: `{base_directory}/requirements/technical-requirements.yaml` for NFR-derived gates

## Usage

```
/definition-of-done [base-directory]
```

If no directory is provided, auto-detect by looking for `implementation/milestones.yaml` in the current directory.

If not found, prompt the user: "Where are your planning artifacts located?"

Wait for the user to provide a path before proceeding. Store as `base_directory`.

## Process

### Step 1: Determine Base Directory and Load Artifacts

If no directory parameter was provided, check if `implementation/milestones.yaml` exists in the current directory.

- If found, use current directory as `base_directory`
- If not found, prompt: "Where are your planning artifacts located?" and wait for user response

Once `base_directory` is determined:

Read `{base_directory}/implementation/milestones.yaml` and extract each milestone's `id`, `name`, `description`, and any `deliverables` or `tasks` references.

Read `{base_directory}/requirements/business-requirements.yaml` and map each functional requirement to the milestone(s) most likely to deliver it. Use the milestone name and description to make this determination — do not guess at task-level details.

If `{base_directory}/requirements/technical-requirements.yaml` exists, read it to extract non-functional requirements (performance targets, security requirements, test coverage thresholds).

### Step 2: Derive Acceptance Criteria per Milestone

For each milestone, generate criteria in five categories:

**1. Functional Criteria**
Specific, observable behaviors that must be true when the milestone is done. Derive these from the business requirements mapped to this milestone. Each criterion must be:
- Verifiable without ambiguity ("users can log in with email and password" ✓ vs "login works" ✗)
- Tied to a requirement ID where possible
- Written as "Given/When/Then" or declarative present tense

**2. Non-Functional Criteria**
Performance, security, reliability, or accessibility requirements that apply to this milestone's output. Pull from `technical-requirements.yaml` NFRs if present. Only include NFRs that are *testable at this milestone's scope* — do not apply system-wide SLAs to early foundational milestones.

**3. Testing Requirements**
What test coverage must exist before this milestone is considered done:
- Unit test coverage for new modules/functions introduced
- Integration tests for any new service boundaries crossed
- E2E scenarios for any user-facing flows delivered
- Regression: confirm no existing tests are broken

**4. Documentation Requirements**
What documentation artifacts are expected from this milestone:
- Inline code comments for complex logic
- API documentation for any new endpoints
- README updates if setup/usage changes
- Architecture diagram updates if structure changes

**5. Exit Checklist**
A short, concrete checklist used at code review / milestone sign-off. This is the quick reference — summarize the above into yes/no checks.

### Step 3: Identify Cross-Milestone Gates

If any requirement spans multiple milestones (e.g., "end-to-end encryption" requires work in m1, m3, and m5), note it as a cross-milestone gate: the full requirement is only verifiable at the *last* milestone that contributes to it. Add a `cross_milestone_note` to each intermediate milestone.

### Step 4: Update milestones.yaml with Acceptance Criteria

Read the existing `{base_directory}/implementation/milestones.yaml` file completely.

For each milestone in the `milestones` array, add two optional fields:

1. **acceptance_criteria** object with five categories:
```yaml
acceptance_criteria:
  functional:
    - criterion: "[verifiable statement]"
      requirement_ref: "BR-FUNC-001"
  non_functional:
    - criterion: "[measurable threshold]"
      requirement_ref: "NFR-PERF-002"
  testing:
    unit: "[coverage expectation]"
    integration: "[test expectations or N/A]"
    e2e: "[E2E expectations or N/A]"
    regression: "All existing tests pass"
  documentation:
    - "[specific artifact]"
  cross_milestone_notes:
    - "[spanning requirement note]"  # if applicable
```

2. **exit_checklist** array with 3-10 binary checks:
```yaml
exit_checklist:
  - "[ ] [Functional check with requirement ref]"
  - "[ ] All tests pass (≥X% coverage)"
  - "[ ] [Documentation check]"
  - "[ ] PR approved by at least one reviewer"
```

**Important:** Preserve all existing fields in milestones.yaml:
- `version`, `project`, `generated`, `business_requirements`, `technical_requirements`
- `meta` section with `ordering_strategy` and `ordering_rationale`
- All existing milestone fields: `id`, `name`, `description`, `dependencies`, `estimated_duration`, `tasks_file`, `success_criteria`
- Optional `project_metadata` if present

Write the enhanced milestones.yaml back to `{base_directory}/implementation/milestones.yaml`.

**Backup Strategy:**
Before overwriting, create backup at `{base_directory}/implementation/milestones.yaml.backup` with timestamp.

### Step 5: Gap Analysis

Report inline after updating milestones.yaml:

```
## Definition of Done Enhancement Complete

**Project:** [name]
**Milestones Enhanced:** [n]/[n]
**Functional Requirements Mapped:** [n]/[n]

**Acceptance Criteria Added:**
- Functional: [n] criteria across [n] milestones
- Non-Functional: [n] NFR criteria
- Testing: [n] milestones with test requirements
- Documentation: [n] milestones with doc requirements

**Criteria Quality:**
[✓ / ✗] All functional criteria are verifiable (no vague language)
[✓ / ✗] NFR criteria tied to specific thresholds (not just "must be fast")
[✓ / ✗] Every milestone has at least one testing requirement
[✓ / ✗] Cross-milestone requirements identified

**Unmapped Requirements:** [none / list requirements not tied to any milestone]

**Updated File:** implementation/milestones.yaml
**Backup Created:** implementation/milestones.yaml.backup.[timestamp]

**Recommendations:** [none / list]
```

## Output Format

### Enhanced milestones.yaml Structure

This skill adds two optional fields to each milestone in the existing `milestones.yaml`:

**Before enhancement:**
```yaml
milestones:
  - id: m1
    name: "User Authentication"
    description: |
      Build authentication system...
    dependencies: [m0]
    estimated_duration: "5-6 hours"
    tasks_file: milestone-m1.tasks.yaml
    success_criteria:
      - "Users can sign up and log in"
      - "Password security meets requirements"
```

**After enhancement:**
```yaml
milestones:
  - id: m1
    name: "User Authentication"
    description: |
      Build authentication system...
    dependencies: [m0]
    estimated_duration: "5-6 hours"
    tasks_file: milestone-m1.tasks.yaml
    success_criteria:
      - "Users can sign up and log in"
      - "Password security meets requirements"

    # NEW: Detailed acceptance criteria added by /definition-of-done
    acceptance_criteria:
      functional:
        - criterion: "Users can create account with email and password"
          requirement_ref: BR-FUNC-001
        - criterion: "Users can log in and receive JWT token valid for 24h"
          requirement_ref: BR-FUNC-002
      non_functional:
        - criterion: "Passwords hashed using bcrypt with cost factor ≥12"
          requirement_ref: NFR-SEC-001
        - criterion: "/auth/login responds within 300ms for 95% of requests"
          requirement_ref: NFR-PERF-001
      testing:
        unit: "≥85% coverage for auth service and JWT utilities"
        integration: "Test auth service ↔ user database interaction"
        e2e: "Happy path: signup → login → protected access → logout"
        regression: "All existing tests pass"
      documentation:
        - "API documentation for /auth/signup, /auth/login, /auth/logout"
        - "Authentication flow diagram"
      cross_milestone_notes:
        - "Role-based access control foundation in m1, full RBAC at m2"

    # NEW: Exit checklist added by /definition-of-done
    exit_checklist:
      - "[ ] Users can sign up and log in (BR-FUNC-001, BR-FUNC-002)"
      - "[ ] Password security meets requirements (bcrypt ≥12, NFR-SEC-001)"
      - "[ ] All unit tests pass with ≥85% coverage"
      - "[ ] Integration tests cover auth ↔ database"
      - "[ ] E2E test covers full signup → login flow"
      - "[ ] API documentation complete"
      - "[ ] PR approved by at least one reviewer"
```

### Preserved Fields

The skill preserves all existing milestones.yaml content:
- Root metadata: `version`, `project`, `generated`, `business_requirements`, `technical_requirements`
- `meta` section: `ordering_strategy`, `ordering_rationale`
- All milestone fields: `id`, `name`, `description`, `dependencies`, `estimated_duration`, `tasks_file`, `success_criteria`
- Optional sections: `overview`, `project_metadata`, `risks_and_mitigation`

### Backup File

A timestamped backup is created before modification:
- Location: `{base_directory}/implementation/milestones.yaml.backup.YYYYMMDD-HHMMSS`
- Contains: Complete original milestones.yaml before enhancement

## Example

See `/docs/specifications/milestones/example.yaml` for milestone m1 with complete acceptance_criteria and exit_checklist.
