---
name: implementation-planner
description: Generates detailed implementation plans with milestones and tasks from business and technical requirements. Embeds best practices including task sizing (30m-2.5h), style anchors, TDD requirements, and quality constraints. Outputs milestones.yaml and milestone-m*.tasks.yaml files ready for development.
---

# Implementation Planner

This skill generates comprehensive implementation plans with milestones, tasks, and best practices enforcement.

## Prerequisites

- Completed `business-requirements.yaml`
- Completed `technical-requirements.yaml`
- Optional but recommended: Style anchor code examples

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
   - Add style anchors and constraints

4. **Apply Best Practices**
   - TDD requirements
   - Style anchor references
   - Quality constraints
   - Drift prevention rules

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

Generate `milestones.yaml`:

```yaml
version: "1.0.0"
project: [project-name]
generated: [timestamp]

business_requirements: [path/to/business-requirements.yaml]
technical_requirements: [path/to/technical-requirements.yaml]

meta:
  ordering_strategy: [multi-pr|single-feature-branch|value-first|risk-first|vertical-slice|foundation-first]
  ordering_rationale: "[One sentence explaining why this strategy was chosen]"

milestones:
  - id: m0
    name: [Milestone Name]
    description: |
      [What this milestone delivers]
    dependencies: [] # Empty for first milestone
    estimated_duration: [timeframe]
    tasks_file: milestone-m0.tasks.yaml
    success_criteria:
      - [Criterion 1]
      - [Criterion 2]

  - id: m1
    name: [Milestone Name]
    description: |
      [What this milestone delivers]
    dependencies: [m0] # References previous milestone
    estimated_duration: [timeframe]
    tasks_file: milestone-m1.tasks.yaml
    success_criteria:
      - [Criterion 1]
      - [Criterion 2]
```

### Tasks Structure

Generate `milestone-m*.tasks.yaml`:

````yaml
milestone: [milestone-id]
name: [Milestone Name]
generated: [timestamp]

style_anchors:
  - path: [path/to/example/file.ts]
    lines: [10-50]
    description: |
      [What pattern this demonstrates]
      [Why it's a good example]
  - path: [path/to/test/file.test.ts]
    lines: [1-30]
    description: |
      [Testing pattern example]

global_constraints:
  allowed_patterns:
    - [Pattern 1 - e.g., "Use Effect.Service for all services"]
    - [Pattern 2 - e.g., "Use Schema.Class for all data validation"]
  forbidden_patterns:
    - [Anti-pattern 1 - e.g., "Direct async/await in service methods"]
    - [Anti-pattern 2 - e.g., "Type assertions on external data"]
  tdd_required: true
  max_task_duration_minutes: 150
  commit_strategy: "Commit after each task"

quality_gates:
  - stage: pre-commit
    commands:
      - [linter command]
      - [type checker command]
      - [test command]
  - stage: task-completion
    criteria:
      - All tests passing
      - No lint errors
      - Code formatted
      - Documentation updated

tasks:
  - id: [milestone]-001
    name: [Task name]
    description: |
      [What to implement]
      [Why it's needed]
    estimate_minutes: 60
    type: [code/test/docs/config]
    dependencies: [] # or list of task IDs
    files:
      create:
        - [path/to/new/file.ts]
        - [path/to/new/file.test.ts]
      modify:
        - [path/to/existing/file.ts]
      touch_only:
        - [files to reference but not modify]
    instructions: |
      **Objective:**
      [Clear statement of what needs to be done]

      **Implementation Steps:**
      1. [Step 1]
      2. [Step 2]
      3. [Step 3]

      **Constraints:**
      - ONLY use: [specific libraries/approaches]
      - Follow pattern in: [style anchor reference]
      - File scope: ONLY modify listed files

      **TDD Checklist:**
      - [ ] Write failing test first
      - [ ] Implement minimum code to pass
      - [ ] Refactor if needed
      - [ ] All tests passing

      **Validation:**
      ```bash
      [command to run]
      ```
      Expected: [what success looks like]

      **Drift Policy:**
      If you encounter unexpected patterns or dependencies, STOP immediately.
      Do not fix mid-stream. Report the issue and await guidance.

    validation:
      commands:
        - [test command]
        - [linter command]
      expected_output: [success criteria]
      on_failure: [what to do if validation fails]

  - id: [milestone]-002
    name: [Task name]
    dependencies: [[milestone]-001]
    ...
````

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

## Style Anchor Integration

### What Makes a Good Style Anchor

1. **Concrete** - Real file paths, not abstract descriptions
2. **Specific** - Line numbers for precision
3. **Complete** - Code + tests + documentation
4. **Current** - Reflects current best practices
5. **Exemplary** - Demonstrates the pattern correctly

### Style Anchor Examples

```yaml
style_anchors:
  - path: src/services/UserService.ts
    lines: 10-50
    description: |
      Example of Effect.Service pattern with:
      - Dependency injection via Effect.Service
      - All methods returning Effect types
      - Proper error handling with tagged errors

  - path: test/services/UserService.test.ts
    lines: 1-40
    description: |
      Example of testing Effect services:
      - Using it.effect from @effect/vitest
      - Providing service dependencies
      - Testing both success and failure cases
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
/implementation-planner path/to/business-requirements.yaml path/to/technical-requirements.yaml
```

With style anchors:

```
/implementation-planner path/to/business-requirements.yaml path/to/technical-requirements.yaml --style-anchors ./examples
```

The skill will:

1. Ask user to choose a milestone ordering strategy (Phase 0)
2. Load and analyze both requirement documents
3. Identify logical milestones based on functionality, sequenced by the chosen strategy
4. Create dependency-ordered milestone breakdown
4. For each milestone:
   - Generate detailed task breakdown
   - Add style anchor references
   - Apply task sizing rules
   - Add TDD and quality constraints
5. Output `milestones.yaml` and `milestone-m*.tasks.yaml` files

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

```
project/
├── milestones.yaml
├── milestone-m0.tasks.yaml  # Foundation
├── milestone-m1.tasks.yaml  # Core features
├── milestone-m2.tasks.yaml  # Advanced features
└── milestone-m3.tasks.yaml  # Polish & release
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

See [examples/](./examples/) for sample milestone and task files.
