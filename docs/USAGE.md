# Sherpy Usage Guide

This guide explains how to use Sherpy skills in your AI-assisted development workflow.

## Installation

### Install All Skills

```bash
npx skills add validkeys/sherpy
```

### Install Individual Skills

```bash
npx skills add validkeys/sherpy@business-requirements-interview
npx skills add validkeys/sherpy@technical-requirements-interview
npx skills add validkeys/sherpy@implementation-planner
```

## Complete Workflow

### Step 1: Business Requirements Interview

Start by gathering business requirements through a structured interview.

```bash
/business-requirements-interview
```

**What happens:**

1. Skill asks one question at a time
2. Each question has multiple-choice options + free-form input
3. Answers are tracked in `business-interview.jsonl`
4. Final output: `business-requirements.yaml`

**Example interaction:**

```
AI: ## Problem Definition

**Question:** What is the primary problem your project aims to solve?

**Options:**
1. Automate manual workflow (Recommended) - Replace time-consuming manual processes
2. Improve existing solution - Enhance current tooling
3. New capability - Build something entirely new
4. Type your own answer

You: 1

AI: [Records answer, asks next question...]
```

**Output file:** `business-requirements.yaml`

```yaml
project: my-project
version: "1.0.0"

overview:
  problem: Automate manual workflow
  value_proposition: Save time and reduce errors
  scope:
    in_scope:
      - Task automation
      - Progress tracking
    out_of_scope:
      - Web UI
      - Multi-user support

personas:
  - name: Developer
    goals:
      - Automate repetitive tasks
    pain_points:
      - Manual processes are error-prone

functional_requirements:
  - id: FR-1
    description: Execute defined workflows
    priority: high
```

### Step 2: Technical Requirements Interview

With business requirements complete, derive technical specifications.

```bash
/technical-requirements-interview path/to/business-requirements.yaml
```

**What happens:**

1. Skill loads business requirements as context
2. Asks targeted technical questions
3. Answers tracked in `technical-interview.jsonl`
4. Final output: `technical-requirements.yaml`

**Example interaction:**

```
AI: ## Architecture & Patterns

**Question:** What architecture pattern best fits this project?

**Options:**
1. Monolithic application (Recommended) - Single deployable unit
2. Microservices - Multiple independent services
3. Plugin-based - Extensible architecture
4. Type your own answer

You: 1

AI: [Records answer, asks next question...]
```

**Output file:** `technical-requirements.yaml`

```yaml
project: my-project
version: "1.0.0"
business_requirements_ref: ./business-requirements.yaml

architecture:
  pattern: Monolithic application
  description: Single CLI tool with pluggable system

technology_stack:
  language: TypeScript
  runtime: Node.js 18+
  frameworks:
    - Effect-TS
```

### Step 3: Implementation Planning

Generate detailed implementation plans with milestones and tasks.

```bash
/implementation-planner \
  path/to/business-requirements.yaml \
  path/to/technical-requirements.yaml
```

**What happens:**

1. Skill analyzes both requirement documents
2. Identifies logical milestones based on functionality
3. Creates dependency-ordered milestone breakdown
4. For each milestone, generates detailed task breakdown
5. Applies best practices (task sizing, TDD, style anchors)

**Output files:**

- `milestones.yaml` - Milestone overview
- `milestone-m0.tasks.yaml` - Foundation tasks
- `milestone-m1.tasks.yaml` - Core feature tasks
- etc.

**Example milestone:**

```yaml
# milestones.yaml
milestones:
  - id: m0
    name: Foundation & Project Setup
    dependencies: []
    tasks_file: milestone-m0.tasks.yaml

  - id: m1
    name: Core Features
    dependencies: [m0]
    tasks_file: milestone-m1.tasks.yaml
```

**Example tasks:**

```yaml
# milestone-m1.tasks.yaml
tasks:
  - id: m1-001
    name: Implement user authentication
    estimate_minutes: 90
    type: code
    dependencies: []

  - id: m1-002
    name: Add authorization middleware
    estimate_minutes: 60
    dependencies: [m1-001]
```

## Automatic Gap Analysis

After each phase, the skills automatically perform a **gap analysis** to ensure quality and completeness:

### What Gets Checked

**After Business Requirements:**

- ✅ Problem statement clarity
- ✅ Persona completeness
- ✅ Requirement testability
- ✅ Success criteria measurability
- ✅ Undocumented assumptions
- ✅ Scope realism

**After Technical Requirements:**

- ✅ Business alignment
- ✅ Architecture completeness
- ✅ Trade-off documentation
- ✅ Security considerations
- ✅ Testing strategy
- ✅ Open questions blocking

**After Implementation Planning:**

- ✅ Task sizing (30m - 2.5h rule)
- ✅ Requirement coverage
- ✅ Dependency correctness
- ✅ Missing task types (tests, docs, integration)
- ✅ Parallel execution opportunities

### Gap Analysis Output

Each phase generates a report like:

```yaml
gap_analysis:
  completeness_score: 8/10
  consistency_score: 9/10

  gaps_found:
    - category: Personas
      issue: "Missing admin user persona"
      severity: medium
      recommendation: "Add admin persona for user management features"

  strong_areas:
    - "Clear problem definition"
    - "Well-defined success criteria"

  ready_for_next_phase: yes
```

### Addressing Gaps

If critical gaps are found, you'll be asked:

> "I've identified some gaps. Would you like to:
>
> 1. Address them now (I'll ask follow-up questions)
> 2. Proceed to next phase (address later)
> 3. Review and decide"

**Best Practice:** Address critical gaps (severity: high) before moving to the next phase. Minor gaps can be addressed later.

## Resuming Interviews

If you need to stop and resume later, the interview progress is saved.

**Resume business interview:**

```bash
/business-requirements-interview
```

The skill will:

- Check for existing `business-interview.jsonl`
- Resume from the last question
- Continue where you left off

**Resume technical interview:**

```bash
/technical-requirements-interview path/to/business-requirements.yaml
```

Same process - resumes from `technical-interview.jsonl` if it exists.

## Using Style Anchors

For implementation planning, you can provide style anchors (example code files).

```bash
/implementation-planner \
  path/to/business-requirements.yaml \
  path/to/technical-requirements.yaml \
  --style-anchors ./examples
```

**What style anchors do:**

- Provide concrete code examples for patterns
- Help maintain consistency across the codebase
- Reduce architectural drift
- Speed up development by showing "the right way"

**Best practices for style anchors:**

- Include 2-3 exemplary files
- Show both implementation and tests
- Include README if relevant
- Reference specific line numbers where helpful

## Task Execution

Once you have implementation plans, start development:

### Starting a Milestone

```
Read milestone-m1.tasks.yaml
```

This loads the milestone tasks into context.

### Working on a Task

1. **Read task instructions** - Understand the objective
2. **Review constraints** - Know what's allowed
3. **Check style anchors** - See the pattern
4. **Follow TDD checklist** - Write tests first
5. **Validate** - Run the validation commands
6. **Commit** - One task = one commit

### Completing a Milestone

1. Complete all tasks in order
2. Run full test suite
3. Verify all quality gates pass
4. Commit milestone completion
5. Move to next milestone

## Best Practices

### During Interviews

1. **Be specific** - Detailed answers lead to better requirements
2. **Think broadly** - Consider edge cases and future needs
3. **Prioritize** - Not everything can be in V1
4. **Document assumptions** - Make implicit assumptions explicit
5. **Consider constraints** - Be realistic about limitations

### During Planning

1. **Start with foundation** - Infrastructure before features
2. **Build vertically** - Complete features end-to-end
3. **Minimize dependencies** - Parallelize where possible
4. **Deliver value early** - Working software in early milestones
5. **Respect constraints** - Timeline, resources, complexity

### During Development

1. **Follow TDD** - Tests first, always
2. **Respect task scope** - Only modify listed files
3. **Commit frequently** - One task = one commit
4. **Validate often** - Run tests after each change
5. **Document decisions** - Update docs as you go

### Handling Drift

If you encounter unexpected patterns during development:

1. **STOP** - Do not continue
2. **DOCUMENT** - What was unexpected
3. **REVERT** - Return to last known good state
4. **REPORT** - Ask for guidance
5. **UPDATE** - Add rule to prevent recurrence

## File Structure

After completing the full workflow, you'll have:

```
project/
├── business-requirements.yaml        # From step 1
├── business-interview.jsonl          # Interview transcript
├── technical-requirements.yaml        # From step 2
├── technical-interview.jsonl          # Interview transcript
├── milestones.yaml                    # From step 3
├── milestone-m0.tasks.yaml            # Foundation tasks
├── milestone-m1.tasks.yaml            # Core feature tasks
├── milestone-m2.tasks.yaml            # Advanced feature tasks
└── src/                               # Your implementation
    ├── (generated from tasks)
```

## Customization

### Custom Interview Questions

The skills use standard question templates, but you can provide custom answers via the "Type your own answer" option.

### Custom Task Constraints

When generating implementation plans, you can add custom constraints:

1. Edit the `global_constraints` section in task files
2. Add project-specific rules to `allowed_patterns`
3. Add anti-patterns to `forbidden_patterns`
4. Adjust `max_task_duration_minutes` as needed

### Custom Quality Gates

Add custom quality gates to task files:

```yaml
quality_gates:
  - stage: pre-commit
    commands:
      - npm run lint
      - npm run typecheck
      - npm test
      - npm run security:check # Your custom check
```

## Troubleshooting

### Interview won't start

- Check that you're in the correct directory
- Ensure the skill is installed: `npx skills list`
- Try reinstalling: `npx skills add validkeys/sherpy --force`

### Can't resume interview

- Check that JSONL file exists
- Verify JSONL file is valid JSON (one object per line)
- If corrupted, delete JSONL and start fresh

### Implementation plan seems incomplete

- Verify business and technical requirements are complete
- Check for missing dependencies or open questions
- Add more detail to requirements and regenerate

### Tasks are too large/small

- Edit task files directly to adjust `estimate_minutes`
- Split large tasks by adding more tasks with dependencies
- Merge small tasks if they're closely related

## Next Steps

- See [EXAMPLES.md](./EXAMPLES.md) for complete workflow examples
- Review skill-specific documentation in each skill's directory
- Join our community for tips and support
