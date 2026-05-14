---
name: implementation-planner
description: Generates detailed implementation plans with milestones and tasks from business and technical requirements. Embeds best practices including task sizing (30m-2.5h), style anchors, TDD requirements, and quality constraints. Outputs milestones.yaml and milestone-m*.tasks.yaml files ready for development.
---

# Implementation Planner

This skill generates comprehensive implementation plans with milestones, tasks, and best practices enforcement.

## Prerequisites

- Completed `business-requirements.yaml`
- Completed `technical-requirements.yaml`
- Recommended: `style-anchors/index.yaml` from style-anchors-collection skill

## Planning Process

### Phase 0: Ordering Strategy Selection

Before analyzing requirements or generating milestones, ask the user which ordering strategy they want to use. Present this prompt verbatim:

---

Before I generate your implementation plan, I need to understand how you want milestones ordered. Choose a strategy:

1. **Multi-PR / Trunk-Based** — Each milestone is independently PR-able and merged to `develop`/`main` continuously. Milestones must each be shippable on their own. Best for teams using trunk-based development.
2. **Single Feature Branch** — All milestones live on one long-lived branch with a single PR at the end. Ordering is purely by technical dependency. Best for isolated features that must not touch main until complete.
3. **Value-First (Demo-Driven)** — Milestones reordered to surface user-visible features as early as possible, even at the cost of deferring some infrastructure. Best for projects needing early stakeholder demos or feedback.
4. **Risk-First** — Highest-uncertainty or most technically unknown milestones come first to surface blockers early. Best for projects with significant unknowns.
5. **Vertical Slice / Walking Skeleton** — First milestone delivers a thin end-to-end slice spanning all architectural layers. Subsequent milestones flesh out each area. Best for validating architecture early.
6. **Foundation-First (Sequential)** — Infrastructure and tooling first, then features, then polish. Strict sequential ordering. Best for greenfield builds with clear requirements.

Or say **"recommend one"** and I'll choose based on your requirements.

---

Record the user's selection as `ordering_strategy`. If the user says "recommend one", analyze the requirements and select the most appropriate strategy, explaining your reasoning. Apply the corresponding ordering rules throughout Phase 2 (Milestone Identification).

**Ordering rules per strategy:**

- **Multi-PR / Trunk-Based**: Each milestone must have a "shippable" success criterion and must not depend on any other in-progress (unmerged) milestone. Milestones are sequenced so each can be independently reviewed and merged.
- **Single Feature Branch**: Order purely by technical dependency. No shippability constraint per milestone.
- **Value-First**: Sort milestones by user-facing impact descending. Bundle required foundation work into the first milestone as a prerequisite setup block.
- **Risk-First**: Sort milestones by uncertainty/risk score descending. High-risk milestones are m0 or m1; de-risk early.
- **Vertical Slice**: First milestone spans all architectural layers for one thin feature (e.g., one API endpoint + UI + persistence). Remaining milestones group by feature area.
- **Foundation-First**: Current default ordering. Infrastructure → core features → advanced features → polish/release.

### Input Analysis

1. **Load Requirements**

   - Parse business requirements for functional scope
   - Parse technical requirements for architectural decisions
   - Load style anchors from `{base_directory}/artifacts/style-anchors/index.yaml` (if exists)
   - Identify dependencies and constraints

2. **Identify Milestones**

   - Group related features into logical milestones
   - Apply the ordering rules for the chosen `ordering_strategy` when sequencing milestones and setting `dependencies`
   - Establish dependency order
   - Define milestone deliverables

3. **Generate Tasks**

   - Break down milestones into atomic tasks
   - Apply task sizing rules (30m - 2.5h)
   - Define task dependencies
   - Select relevant style anchors from index.yaml based on task type and file patterns
   - Embed style anchor references in task instructions
   - Add final code review task for each milestone

4. **Apply Best Practices**
   - TDD requirements
   - Style anchor references
   - Quality constraints
   - Drift prevention rules
   - Comprehensive code reviews

## Best Practices (Embedded)

### Core Principles

**Layered Verification**

> Models optimize locally; enforce global constraints with layered verification (prompt → IDE → commit → CI → runtime).

**Style Anchors**

- Always include 2-3 exemplary files as templates
- Reference exact paths and line numbers
- Prefer concrete repository examples (code + tests + README)
- Enforce anchors early to prevent architectural drift

**Task Sizing**

- Split work into 30m–2.5h atomic tasks (30–150 minutes optimal)
- Limit scope to specific files
- Commit after each small task
- Revert immediately on drift
- If a task is shorter than 30m, either increase estimate or split it with rationale

**Affirmative Instructions**

- State permitted actions explicitly
- Avoid negative framing
- Use "ONLY use X, Y, Z" instead of "Don't use A, B, C"

**Tiered Rules**

- Global: User preferences (format, language, length)
- Project: Persistent rules in CLAUDE.md or .cursor/rules/
- Context-aware: Auto-attached rules per directory or file pattern

### Quality Constraints

**TDD as Anchor**

- Require TDD checklist before implementation
- Tests → minimal code → more tests → refactor
- When tests fail, return failing output with instruction: "Revise implementation to pass this test while keeping all previously passing tests. Do not modify the test. Do not add dependencies."

**Drift Handling**

- Stop and revert immediately on unexpected dependencies or unfamiliar patterns
- Do not fix mid-stream
- Document learnings and update persistent rules after each session

**Prompt Positioning**

- Put critical specs, style anchors, and hard rules at the beginning
- Reiterate them at the end of prompts
- Avoid burying requirements in the middle

**External Data Validation**

- Never use type assertions on external data
- Validate all external inputs with proper error handling
- Use schema validation instead of runtime assertions

## Output Formats

### Milestones Structure

Generate `milestones.yaml` with version, project metadata, ordering strategy, and a `milestones` array. Each milestone has: `id` (m0, m1...), `name`, `description`, `dependencies`, `estimated_duration`, `tasks_file`, and `success_criteria`. Optional fields include `acceptance_criteria` (functional, non_functional, testing, documentation) and `exit_checklist`.

See **[references/milestones-spec.md](references/milestones-spec.md)** for the complete document specification with all fields, ordering strategies, and optional fields.

See **[references/milestones-example.yaml](references/milestones-example.yaml)** for a full example.

**Note on Optional Fields:**
- `success_criteria` (required): High-level planning acceptance criteria
- `acceptance_criteria` (optional): Detailed delivery criteria with requirement tracing, testing requirements, and documentation expectations. Use when rigorous milestone sign-off is needed.
- `exit_checklist` (optional): Binary go/no-go checklist for code review. Use when formal gate-driven process is required.

Most projects use only `success_criteria`. Add detailed acceptance criteria when:
- Project requires audit-ready requirement traceability
- Multiple stakeholders need clear sign-off criteria
- QA team needs explicit testing requirements per milestone
- Code review process requires detailed checklists

**To add detailed criteria after generation:** Run `/definition-of-done` to enhance milestones.yaml with acceptance_criteria and exit_checklist fields derived from your requirements.

### Tasks Structure

Generate `milestone-m*.tasks.yaml` with style anchors, global constraints, quality gates, and a `tasks` array. Each task has: `id` (mN-NNN format), `name`, `description`, `estimate_minutes` (30-150), `type` (code/test/docs/config), `dependencies`, `files` (create/modify/touch_only), `style_anchor_refs`, and detailed `instructions`.

See **[references/milestone-tasks-spec.md](references/milestone-tasks-spec.md)** for the complete document specification with task structure, quality gates, and TDD checklists.

See **[references/milestone-tasks-example.yaml](references/milestone-tasks-example.yaml)** for a full example.

## Task Sizing Guidelines

### Optimal Task Duration

- **Minimum: 30 minutes**
  - If task is shorter, document rationale
  - Consider merging with related tasks
- **Optimal: 30-150 minutes**
  - Atomic, well-scoped changes
  - Can be completed in one session
  - Clear success criteria
- **Maximum: 150 minutes (2.5 hours)**
  - If task is longer, split into smaller tasks
  - Identify natural breakpoints
  - Create dependencies between subtasks

### Task Sizing Examples

**Too Small (< 30m)**

```yaml
- id: m1-001
  name: Add export statement
  estimate_minutes: 10
  rationale: "Simple addition but critical for module system"
```

**Optimal (30-150m)**

```yaml
- id: m1-002
  name: Implement user authentication service
  estimate_minutes: 90
  dependencies: [m1-001]
```

**Too Large (> 150m) - SPLIT**

```yaml
# BEFORE (too large):
- id: m1-003
  name: Build complete API layer
  estimate_minutes: 300

# AFTER (properly split):
- id: m1-003
  name: Define API interface and types
  estimate_minutes: 60

- id: m1-004
  name: Implement API routes
  estimate_minutes: 90
  dependencies: [m1-003]

- id: m1-005
  name: Add API middleware and error handling
  estimate_minutes: 60
  dependencies: [m1-004]
```

## Code Review Task Requirement

### Final Milestone Task

**IMPORTANT**: Every milestone MUST include a final code review task as its last task. This task ensures quality control and alignment with style anchors before moving to the next milestone.

### Code Review Task Template

```yaml
- id: [milestone]-[last-number]
  name: Comprehensive code review for [milestone-name]
  description: |
    Conduct a thorough code review of all work completed in this milestone.
    Review against style anchors, architectural decisions, and best practices.
    Document findings and create actionable recommendations.
  estimate_minutes: 60
  type: code-review
  dependencies: [all other tasks in this milestone]
  files:
    create:
      - code-reviews/[yyyy-mm-dd]-{n}-code-review.yaml
    modify: []
    touch_only: [all files created/modified in this milestone]
  instructions: |
    **Objective:**
    Review all code, tests, and documentation created or modified during this milestone
    for quality, consistency, and alignment with project standards.

    **Review Checklist:**
    1. **Style Anchor Compliance:**
       - [ ] Code follows patterns defined in style anchors
       - [ ] Naming conventions are consistent
       - [ ] File structure matches established patterns
       - [ ] Import organization follows standards

    2. **Code Quality:**
       - [ ] No code duplication or unnecessary complexity
       - [ ] Clear, meaningful variable and function names
       - [ ] Appropriate use of types (no any, proper generics)
       - [ ] Error handling is comprehensive and consistent
       - [ ] No magic numbers or hardcoded values

    3. **Testing:**
       - [ ] All new code has corresponding tests
       - [ ] Tests follow TDD patterns from style anchors
       - [ ] Edge cases are covered
       - [ ] Test names are descriptive

    4. **Architecture:**
       - [ ] Follows technical requirements decisions
       - [ ] Service patterns are consistent
       - [ ] Dependencies are properly injected
       - [ ] No circular dependencies

    5. **Documentation:**
       - [ ] JSDoc comments for public APIs
       - [ ] Complex logic is explained
       - [ ] README updated if needed
       - [ ] Examples are accurate

    **Review Process:**
    1. Review each file modified in this milestone
    2. Compare against referenced style anchors
    3. Run all quality gates (lint, typecheck, tests)
    4. Document problems with specific file:line references
    5. Provide recommended solutions with code examples
    6. Create code-reviews/[yyyy-mm-dd]-{n}-code-review.yaml

    **Output Format:**
    ```yaml
    milestone: [milestone-id]
    milestone_name: [milestone-name]
    review_date: [yyyy-mm-dd]
    reviewer: claude-code

    summary:
      files_reviewed: [count]
      issues_found: [count]
      critical_issues: [count]
      overall_quality: [excellent|good|fair|needs-improvement]

    style_anchor_compliance:
      - anchor: [path/to/anchor:lines]
        status: [compliant|partial|non-compliant]
        notes: |
          [Specific observations]

    issues:
      - severity: [critical|major|minor]
        category: [style|architecture|testing|documentation|security]
        file: [path:line]
        description: |
          [Clear description of the problem]
        recommendation: |
          [Specific solution with code example if applicable]
        related_anchor: [path/to/anchor:lines]

      - severity: major
        category: testing
        file: src/example.ts:45
        description: |
          Missing error case test for invalid input scenario
        recommendation: |
          Add test case:
          ```typescript
          it.effect("should reject invalid input", () =>
            Effect.gen(function* () {
              const result = yield* service.process({ invalid: true })
              expect(result).toMatchError(ValidationError)
            })
          )
          ```
        related_anchor: test/example.test.ts:20-35

    strengths:
      - [What was done well]
      - [Good patterns observed]

    recommendations:
      - priority: [high|medium|low]
        action: |
          [Specific action to take]
        impact: |
          [Why this matters]

    sign_off:
      ready_for_next_milestone: [yes|no|with-fixes]
      blocking_issues: [list of critical issues that must be fixed]
      notes: |
        [Additional context or observations]
    ```

    **Constraints:**
    - ONLY review code from this milestone
    - Reference specific style anchors when citing issues
    - Provide actionable, specific recommendations
    - Include code examples in recommendations when possible

    **Validation:**
    ```bash
    # Ensure all quality gates pass
    npm run lint
    npm run typecheck
    npm test

    # Verify review file is created
    ls code-reviews/[yyyy-mm-dd]-*.yaml
    ```
    Expected: All quality gates pass, review file exists with complete analysis

    **Drift Policy:**
    If critical issues are found that violate style anchors or architectural
    decisions, mark as blocking and recommend fixes before proceeding to next milestone.

  validation:
    commands:
      - npm run lint
      - npm run typecheck
      - npm test
    expected_output: All quality gates pass
    on_failure: Document failures in review and mark milestone as needing fixes
```

### Code Review Naming Convention

Code review files should be named with:
- Date: YYYY-MM-DD format of when the review was conducted
- Sequence number: Incrementing number for multiple reviews on same date
- Format: `code-reviews/YYYY-MM-DD-{n}-code-review.yaml`

Examples:
- `code-reviews/2025-01-27-1-code-review.yaml` (first review on Jan 27)
- `code-reviews/2025-01-27-2-code-review.yaml` (second review same day)
- `code-reviews/2025-01-28-1-code-review.yaml` (first review next day)

### Integration with Milestone Flow

1. **During Milestone Planning:**
   - Count total tasks planned for milestone
   - Add code review task as final task
   - Set all other tasks as dependencies

2. **During Development:**
   - Complete all implementation tasks
   - Run final code review task
   - Address any blocking issues found
   - Sign off on milestone completion

3. **Before Next Milestone:**
   - Verify code review sign-off is "yes" or "with-fixes"
   - If "with-fixes", address blocking issues first
   - Only proceed when quality standards are met

## Style Anchor Integration

### Loading Style Anchors

If `{base_directory}/artifacts/style-anchors/index.yaml` exists:

1. **Load the index:**
   ```
   Read {base_directory}/artifacts/style-anchors/index.yaml
   ```

2. **Parse anchor data:**
   - Extract categories and anchors
   - Load usage_matrix for pattern mapping
   - Build lookup table by task type and file patterns

3. **For each task generated:**
   - Determine task type (code/test/docs/config)
   - Match file patterns in task against anchor applies_to rules
   - Query usage_matrix for recommended anchors
   - Select top 2-3 most relevant anchors

### Style Anchor Selection Logic

**By Task Type:**
```
task.type == "code" → usage_matrix.task_types[type="code"].recommended_anchors
task.type == "test" → usage_matrix.task_types[type="test"].recommended_anchors
task.type == "api"  → usage_matrix.task_types[type="api"].recommended_anchors
```

**By File Pattern:**
```
For each anchor in anchors:
  For each pattern in anchor.applies_to.file_patterns:
    If task.files match pattern:
      Include this anchor
```

**By Milestone Type:**
```
For each anchor in anchors:
  If milestone.type in anchor.applies_to.milestone_types OR "all" in milestone_types:
    Consider this anchor
```

### Embedding Anchors in Task Instructions

When generating task YAML, include style anchor references:

```yaml
instructions: |
  **Objective:**
  [Task objective]

  **Style Anchors:**
  Follow these established patterns:
  - See `artifacts/style-anchors/[anchor-id].md` - [anchor.name]
  - See `artifacts/style-anchors/[anchor-id].md` - [anchor.name]

  Reference files:
  - `[anchor.source.path]:[anchor.source.lines]` - [what it demonstrates]

  **Implementation Steps:**
  1. [Step 1]
  2. [Step 2]

  **Constraints:**
  - ONLY use: [specific libraries/approaches]
  - Follow pattern in: [anchor reference]
  - File scope: ONLY modify listed files

  [Rest of task instructions...]
```

### What Makes a Good Style Anchor

1. **Concrete** - Real file paths, not abstract descriptions
2. **Specific** - Line numbers for precision
3. **Complete** - Code + tests + documentation
4. **Current** - Reflects current best practices
5. **Exemplary** - Demonstrates the pattern correctly

### If No Style Anchors Exist

If `{base_directory}/artifacts/style-anchors/index.yaml` does not exist:

- Display warning: "⚠️  No style anchors found. Tasks will be generated without concrete code examples. Consider running /style-anchors-collection first to reduce drift risk."
- Generate tasks with generic best practices instead
- Include placeholder for style anchors in task instructions:
  ```yaml
  instructions: |
    **Style Anchors:**
    (No style anchors collected. Follow general best practices from technical requirements)
  ```

## Quality Gate Configuration

### Pre-Commit Hooks

```yaml
quality_gates:
  - stage: pre-commit
    commands:
      - npm run lint
      - npm run typecheck
      - npm test
    must_pass: true
```

### CI Pipeline

```yaml
quality_gates:
  - stage: ci
    commands:
      - npm run lint
      - npm run typecheck
      - npm test
      - npm run test:integration
    coverage_threshold: 80
```

### Task Completion

```yaml
quality_gates:
  - stage: task-completion
    criteria:
      - All tests passing
      - No lint errors
      - No type errors
      - Code formatted
      - Documentation updated
      - Commit message follows convention
```

## Usage

Generate implementation plan:

```
/implementation-planner [base-directory]
```

If no directory is provided, auto-detect by looking for `requirements/business-requirements.yaml` in the current directory.

If not found, prompt the user: "Where are your requirements documents located?"

Wait for the user to provide a path before proceeding. Store as `base_directory`.

The skill will:

1. Ask user to choose a milestone ordering strategy (Phase 0)
2. Load and analyze both requirement documents from `{base_directory}/requirements/`
3. Load style anchors from `{base_directory}/artifacts/style-anchors/index.yaml` (if exists)
4. Identify logical milestones based on functionality, sequenced by the chosen strategy
5. Create dependency-ordered milestone breakdown
6. For each milestone:
   - Generate detailed task breakdown
   - Select and embed relevant style anchor references based on task type and file patterns
   - Apply task sizing rules
   - Add TDD and quality constraints
   - Add final code review task as last task
7. Output `milestones.yaml` to `{base_directory}/implementation/`
8. Output `milestone-m*.tasks.yaml` files to `{base_directory}/implementation/tasks/`
9. If generated, output `FEATURE_FLAGS.md` and `UPDATES.md` to `{base_directory}/artifacts/`

## Planning Best Practices

### Milestone Identification

1. **Start with foundation** - Infrastructure and tooling first
2. **Build vertically** - Complete features end-to-end
3. **Minimize dependencies** - Parallel work where possible
4. **Deliver value early** - Working software in early milestones
5. **Respect constraints** - Timeline, resources, complexity

### Task Breakdown

1. **Single responsibility** - Each task does one thing
2. **Clear dependencies** - Explicit task ordering
3. **Testable** - Every task has validation criteria
4. **Bounded scope** - Limited files and complexity
5. **Reversible** - Easy to revert if needed

### Dependency Management

1. **Minimize critical path** - Parallelize where possible
2. **Clear interfaces** - Well-defined contracts between tasks
3. **Document assumptions** - What each task expects from predecessors
4. **Plan for failure** - What happens if dependencies fail

## Example Workflow

### Input Files

```
project/
├── business-requirements.yaml
├── technical-requirements.yaml
└── examples/
    ├── service.ts
    ├── service.test.ts
    └── schema.ts
```

### Command

```bash
/implementation-planner \
  business-requirements.yaml \
  technical-requirements.yaml \
  --style-anchors ./examples
```

### Output Files

Create directories if they don't exist:
```bash
mkdir -p {base_directory}/implementation/tasks
mkdir -p {base_directory}/artifacts
```

Output structure:
```
{base_directory}/
├── implementation/
│   ├── milestones.yaml
│   └── tasks/
│       ├── milestone-m0.tasks.yaml  # Foundation
│       ├── milestone-m1.tasks.yaml  # Core features
│       ├── milestone-m2.tasks.yaml  # Advanced features
│       └── milestone-m3.tasks.yaml  # Polish & release
└── artifacts/
    ├── FEATURE_FLAGS.md     # If generated
    ├── UPDATES.md          # If generated
    └── style-anchor-references.yaml  # If generated
```

## Review & Gap Analysis

After generating milestones and task files, automatically perform a gap analysis:

### Completeness Check

**Milestone Structure:**

- [ ] All milestones have clear deliverables
- [ ] Dependencies are correctly ordered
- [ ] No circular dependencies
- [ ] Timeline is realistic
- [ ] Success criteria are testable

**Task Breakdown:**

- [ ] All requirements covered by tasks
- [ ] Task sizing follows 30-150 minute rule
- [ ] Dependencies between tasks are explicit
- [ ] File scopes are clearly defined
- [ ] Each task has validation criteria

**Task Quality:**

- [ ] Instructions are clear and actionable
- [ ] Constraints are explicit
- [ ] TDD checklist included for code tasks
- [ ] Validation commands specified
- [ ] Drift policy stated

### Alignment Check

**Business Requirements:**

- [ ] All functional requirements mapped to tasks
- [ ] Priority aligns with business priorities
- [ ] MVP scope clearly defined
- [ ] Success criteria can be verified

**Technical Requirements:**

- [ ] Architecture decisions reflected in structure
- [ ] Technology choices enforced in constraints
- [ ] Testing strategy implemented
- [ ] Security requirements addressed

### Task Sizing Analysis

**Check for violations:**

- Tasks < 30 minutes - merge or document rationale
- Tasks > 150 minutes - split into smaller tasks
- Critical path has appropriate task sizes

**Generate sizing report:**

```yaml
task_sizing_analysis:
  total_tasks: [count]
  average_duration: [minutes]

  too_small:
    - task_id: [id]
      estimate: [minutes]
      rationale: [why it's small]
      recommendation: [merge with X or accept]

  too_large:
    - task_id: [id]
      estimate: [minutes]
      recommendation: [split into X, Y, Z]

  optimal_range:
    count: [number]
    percentage: [%]
```

### Dependency Analysis

**Critical Path:**

- [ ] Identify critical path through milestones
- [ ] Check for parallel execution opportunities
- [ ] Verify no unnecessary dependencies
- [ ] Ensure dependencies are minimal but sufficient

**Dependency graph validation:**

```yaml
dependency_analysis:
  critical_path: [m0 → m1 → m3 → m5]
  critical_path_duration: [time]

  parallel_opportunities:
    - [m2 and m3 can run in parallel]
    - [m4 can start after m1]

  dependency_issues:
    - task: [id]
      issue: [unnecessary dependency / missing dependency]
      recommendation: [fix]
```

### Gap Identification

**Common Gaps to Check:**

- Missing infrastructure tasks (setup, tooling)
- Missing test tasks
- Missing documentation tasks
- Missing error handling tasks
- Missing configuration tasks
- Missing deployment/release tasks
- Undocumented assumptions in tasks
- Missing style anchors for new patterns
- Tasks without clear file boundaries
- Missing integration tasks between components

### Coverage Analysis

**Requirement Coverage Matrix:**

```yaml
requirement_coverage:
  functional_requirements:
    FR-1: [m1-001, m1-002] # Tasks covering this requirement
    FR-2: [m1-003]
    FR-3: [gap] # Not covered!

  non_functional_requirements:
    performance: [m2-001, m2-002]
    security: [m1-005]
    usability: [gap] # Not covered!
```

### Style Anchor Validation

- [ ] Style anchors reference existing files (if provided)
- [ ] Style anchors demonstrate correct patterns
- [ ] Line numbers are accurate
- [ ] Descriptions are helpful

### Review Output

Generate a comprehensive gap analysis report:

```yaml
gap_analysis:
  completeness_score: [1-10]
  alignment_score: [1-10]
  feasibility_score: [1-10]

  critical_gaps:
    - category: [category]
      issue: [description]
      impact: [high/medium/low]
      affected_requirements: [FR-1, FR-2, etc]
      recommendation: [how to fix]

  missing_coverage:
    requirements:
      - [FR-X not covered]
      - [NFR-Y not covered]

    task_types:
      - [Missing: integration tests]
      - [Missing: documentation]

  sizing_issues:
    too_small_count: [n]
    too_large_count: [n]
    recommendations: [list]

  dependency_issues:
    - [description]

  strong_areas:
    - [what's well-planned]

  optimization_opportunities:
    - [parallel execution: m2 and m3]
    - [combine tasks: m1-002 and m1-003]

  suggestions:
    - [improvement suggestions]

  ready_for_development: [yes/no/with-modifications]

  estimated_timeline:
    optimistic: [time]
    realistic: [time]
    pessimistic: [time]
```

If critical gaps found, ask:

> "I've identified some gaps in the implementation plan:
>
> **Critical Issues:**
>
> - [Issue 1]
> - [Issue 2]
>
> **Missing Coverage:**
>
> - [Requirement FR-X not covered]
> - [No integration tests planned]
>
> Would you like to:
>
> 1. Add missing tasks now (I'll generate them)
> 2. Review and manually adjust the plan
> 3. Proceed with development (address gaps as needed)"

## Integration with Development

### Starting a Milestone

```bash
# Load milestone tasks into context
Read milestone-m1.tasks.yaml

# Review style anchors
Read examples/service.ts:10-50
Read examples/service.test.ts:1-40

# Begin first task
# Task m1-001: Implement core service
```

### Completing a Task

1. Run validation commands
2. Verify all criteria met
3. Commit changes
4. Update task status
5. Move to next task

### Handling Drift

If you encounter unexpected patterns:

1. **STOP** - Do not continue
2. **DOCUMENT** - What was unexpected
3. **REVERT** - Return to last known good state
4. **REPORT** - Ask for guidance
5. **UPDATE** - Add rule to prevent recurrence

## Examples

See **[references/milestones-example.yaml](references/milestones-example.yaml)** and **[references/milestone-tasks-example.yaml](references/milestone-tasks-example.yaml)** for sample output files.
