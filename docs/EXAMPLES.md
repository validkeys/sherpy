# Sherpy Examples

This document provides complete examples of using Sherpy skills in real-world scenarios.

## Example 1: Building a Task Automation CLI

This example walks through creating a task automation CLI tool from start to finish.

### Business Requirements Interview

**Starting the interview:**

```bash
/business-requirements-interview
```

**Sample interaction:**

```
## Problem Definition

**Question:** What is the primary problem your project aims to solve?

**Options:**
1. Automate manual workflow (Recommended)
2. Improve existing solution
3. New capability
4. Type your own answer

You: 1 - Automate manual workflow

---

## User Personas

**Question:** Who are your primary target users?

**Options:**
1. Individual developers (Recommended)
2. Development teams
3. Enterprise organizations
4. Type your own answer

You: 1 - Individual developers

---

## Scope Definition

**Question:** What is the initial scope for this project?

**Options:**
1. MVP/Proof of concept (Recommended)
2. Full-featured release
3. Iterative enhancement
4. Type your own answer

You: 1 - MVP/Proof of concept

[... interview continues ...]
```

**Result:** `business-requirements.yaml`

```yaml
project: task-automation-cli
version: "1.0.0"

overview:
  problem: Developers spend time on repetitive manual tasks
  value_proposition: Automate workflows to save time and reduce errors
  scope:
    in_scope:
      - Workflow definition in YAML
      - Task execution with dependencies
      - Progress tracking
    out_of_scope:
      - Web UI
      - Multi-user collaboration

personas:
  - name: Solo Developer
    goals:
      - Automate repetitive tasks
      - Ensure consistency
    pain_points:
      - Manual errors
      - Forgotten steps

functional_requirements:
  - id: FR-1
    description: Define workflows in YAML
    priority: high
  - id: FR-2
    description: Execute tasks in dependency order
    priority: high

success_criteria:
  - criterion: Time saved
    metric: Hours per week
    target: 5 hours/week saved
```

### Technical Requirements Interview

**Starting the interview:**

```bash
/technical-requirements-interview business-requirements.yaml
```

**Sample interaction:**

```
## Architecture & Patterns

**Question:** What architecture pattern best fits this project?

**Options:**
1. Monolithic application (Recommended)
2. Microservices
3. Serverless functions
4. Plugin-based
5. Type your own answer

You: 1 - Monolithic application

---

## Technology Stack

**Question:** Which programming language should be used?

**Options:**
1. TypeScript (Recommended)
2. Python
3. Go
4. Rust
5. Type your own answer

You: 1 - TypeScript

[... interview continues ...]
```

**Result:** `technical-requirements.yaml`

```yaml
architecture:
  pattern: Monolithic CLI application
  components:
    - name: CLI Interface
      responsibility: Command parsing
    - name: Workflow Engine
      responsibility: Task execution

technology_stack:
  language: TypeScript
  runtime: Node.js 18+
  frameworks:
    - Effect-TS
    - Commander.js

testing:
  strategy: TDD
  types:
    unit:
      framework: vitest
      coverage_target: 80%
```

### Implementation Planning

**Generating the plan:**

```bash
/implementation-planner \
  business-requirements.yaml \
  technical-requirements.yaml
```

**Result:** `milestones.yaml`

```yaml
milestones:
  - id: m0
    name: Foundation & Setup
    dependencies: []
    estimated_duration: 1 week
    tasks_file: milestone-m0.tasks.yaml

  - id: m1
    name: Workflow Definition
    dependencies: [m0]
    estimated_duration: 2 weeks
    tasks_file: milestone-m1.tasks.yaml

  - id: m2
    name: Task Execution Engine
    dependencies: [m1]
    estimated_duration: 2 weeks
    tasks_file: milestone-m2.tasks.yaml
```

**Result:** `milestone-m0.tasks.yaml`

````yaml
tasks:
  - id: m0-001
    name: Initialize project structure
    estimate_minutes: 30
    type: config
    dependencies: []
    files:
      create:
        - package.json
        - tsconfig.json
        - .gitignore
    instructions: |
      Initialize Node.js project with TypeScript.

      **Validation:**
      ```bash
      npm install
      npx tsc --version
      ```

  - id: m0-002
    name: Configure development tooling
    estimate_minutes: 60
    type: config
    dependencies: [m0-001]
    files:
      create:
        - .eslintrc.json
        - .prettierrc
        - vitest.config.ts
    instructions: |
      Set up ESLint, Prettier, and Vitest.

      **Validation:**
      ```bash
      npm run lint
      npm run format
      npm test
      ```
````

### Development Execution

**Starting milestone m0:**

```
Read milestone-m0.tasks.yaml
```

**Working on task m0-001:**

```
Following task m0-001: Initialize project structure

1. Creating package.json with TypeScript dependencies
2. Creating tsconfig.json with strict mode
3. Creating .gitignore for Node.js

Running validation:
✓ npm install successful
✓ TypeScript compiler available
✓ Task m0-001 complete

Committing: "chore: initialize project structure"
```

**Working on task m0-002:**

```
Following task m0-002: Configure development tooling

1. Creating .eslintrc.json with TypeScript rules
2. Creating .prettierrc for code formatting
3. Creating vitest.config.ts for testing

Running validation:
✓ npm run lint passing
✓ npm run format applied
✓ npm test passing (empty test suite)
✓ Task m0-002 complete

Committing: "chore: configure development tooling"
```

---

## Example 2: Building a REST API Service

This example shows planning a REST API with authentication.

### Business Requirements (Summary)

```yaml
project: user-auth-api
overview:
  problem: Need secure user authentication for web applications
  scope:
    in_scope:
      - User registration and login
      - JWT token authentication
      - Password reset flow
functional_requirements:
  - id: FR-1
    description: User registration with email verification
    priority: high
  - id: FR-2
    description: Login with JWT tokens
    priority: high
```

### Technical Requirements (Summary)

```yaml
architecture:
  pattern: Layered architecture
  components:
    - API Layer (REST endpoints)
    - Service Layer (business logic)
    - Data Layer (PostgreSQL)

technology_stack:
  language: TypeScript
  frameworks:
    - Fastify (API framework)
    - TypeORM (database)
    -jsonwebtoken (auth)

security:
  authentication:
    method: JWT tokens
  secrets:
    storage: Environment variables
```

### Implementation Plan (Summary)

```yaml
milestones:
  - id: m0
    name: API Foundation
    tasks:
      - Setup Fastify server
      - Configure TypeORM
      - Create database migrations

  - id: m1
    name: User Management
    tasks:
      - User registration endpoint
      - Email verification
      - Password hashing

  - id: m2
    name: Authentication
    tasks:
      - Login endpoint
      - JWT generation
      - Auth middleware

  - id: m3
    name: Security & Polish
    tasks:
      - Rate limiting
      - Input validation
      - Error handling
      - API documentation
```

---

## Example 3: Resuming an Interrupted Interview

This example shows how to resume an interview that was stopped mid-way.

### Scenario

You started a business requirements interview but had to stop after question 5.

### Current State

`business-interview.jsonl`:

```json
{"id":1,"category":"Problem Definition","question":"What is the primary problem?","answer":"Automate manual workflow","timestamp":"2025-01-27T10:00:00Z"}
{"id":2,"category":"User Personas","question":"Who are your primary target users?","answer":"Individual developers","timestamp":"2025-01-27T10:05:00Z"}
{"id":3,"category":"Scope","question":"What is the initial scope?","answer":"MVP/Proof of concept","timestamp":"2025-01-27T10:10:00Z"}
{"id":4,"category":"Success Criteria","question":"How will you measure success?","answer":"Time saved on tasks","timestamp":"2025-01-27T10:15:00Z"}
{"id":5,"category":"Constraints","question":"What are your timeline constraints?","answer":"3 months to MVP","timestamp":"2025-01-27T10:20:00Z"}
```

### Resuming

```bash
/business-requirements-interview
```

**AI Response:**

```
Found existing interview progress (5 questions completed).
Resuming from question 6...

## Dependencies

**Question:** What external dependencies does this project have?

**Options:**
1. None - Fully self-contained (Recommended)
2. Cloud services - Depends on external APIs
3. Database - Requires persistent storage
4. Type your own answer
```

The interview continues from where you left off. All previous answers are retained.

---

## Example 4: Customizing Task Constraints

This example shows how to customize task constraints for a project with specific requirements.

### Scenario

Your project has strict requirements:

- Must use a specific logging library
- Cannot use certain npm packages
- Has specific performance requirements

### Customizing Tasks

Edit `milestone-m1.tasks.yaml`:

```yaml
global_constraints:
  allowed_patterns:
    - "Use Schema.Class for all data structures"
    - "Use winston for all logging (required by company policy)"
    - "Use Effect.Service for all services"
  forbidden_patterns:
    - "NO console.log (use winston instead)"
    - NO moment.js (use date-fns)
    - "NO lodash (use native Array methods)"
    - "NO any types"
  performance_requirements:
    - "All API responses < 100ms"
    - "Database queries < 50ms"
  max_task_duration_minutes: 120 # Stricter than default 150

tasks:
  - id: m1-001
    name: Implement logging service
    instructions: |
      **Constraints:**
      - ONLY use: winston (required)
      - Follow company logging standard
      - Include correlation IDs
      - Structured JSON format

      **Performance:**
      - Logging overhead < 5ms per call
      - Async writes to avoid blocking
```

### Impact

When the AI agent works on these tasks, it will:

1. Use winston for logging (not console.log)
2. Avoid moment.js and lodash
3. Ensure performance targets are met
4. Stop and report if it encounters forbidden patterns

---

## Example 5: Handling Drift During Implementation

This example shows what happens when unexpected patterns are encountered during development.

### Scenario

You're implementing task m1-002, which specifies using Effect-TS patterns. The AI agent encounters code that uses plain promises instead.

### Drift Detection

**AI Agent:**

```
Working on task m1-002: Implement user service

I've started implementing the service, but I encountered existing code
that uses plain async/await instead of Effect patterns:

File: src/services/LegacyService.ts
Lines: 15-30

This code uses:
- async/await (forbidden pattern)
- Promise-based error handling (not Effect-based)

According to the drift policy:
> Stop and revert immediately on unexpected patterns

**Action Required:**
Should I:
1. Refactor LegacyService to use Effect patterns first?
2. Work around the legacy code for now?
3. Update constraints to allow this pattern?
```

### Resolution

**Option 1: Refactor (Recommended)**

```
You: Refactor LegacyService first

AI: Understood. Creating new task:
- Task m1-002a: Refactor LegacyService to Effect pattern
- Then continue with m1-002

This ensures consistency and prevents drift.
```

**Option 2: Document Exception**

```
You: Work around it for now, add to technical debt

AI: Understood. I'll:
1. Document the exception in code comments
2. Create a tech debt ticket
3. Continue with m1-002
4. Add constraint note for future tasks
```

---

## Example 6: Multi-Person Project

This example shows how a team can use Sherpy skills collaboratively.

### Scenario

A team of 3 developers is building a new feature:

- Alice: Product lead, conducts interviews
- Bob: Tech lead, reviews technical decisions
- Carol: Developer, implements tasks

### Workflow

**Step 1: Alice gathers requirements**

```bash
/business-requirements-interview
```

Alice completes the interview, creates PR with `business-requirements.yaml`.

**Step 2: Team review**
Team reviews requirements in PR, suggests changes.

**Step 3: Bob defines technical approach**

```bash
/technical-requirements-interview business-requirements.yaml
```

Bob completes technical interview, creates PR with `technical-requirements.yaml`.

**Step 4: Team review**
Team reviews technical decisions, approves approach.

**Step 5: Generate implementation plan**

```bash
/implementation-planner \
  business-requirements.yaml \
  technical-requirements.yaml
```

Creates comprehensive task breakdown.

**Step 6: Parallel development**

- Carol works on milestone m1 tasks
- Bob works on milestone m2 tasks (in parallel)
- Tasks are atomic and well-defined
- No conflicts due to clear file boundaries

**Step 7: Integration**

- Milestones completed independently
- Integration happens at milestone boundaries
- Clear dependencies prevent blocking

---

## Example 7: Style Anchors in Practice

This example shows how style anchors improve implementation quality.

### Without Style Anchors

```yaml
tasks:
  - id: m1-001
    name: Create user service
    instructions: |
      Implement a user service using Effect-TS patterns.
```

**Result:** AI might create:

- Inconsistent error handling
- Missing dependency injection
- No tests
- Different patterns than rest of codebase

### With Style Anchors

```yaml
style_anchors:
  - path: examples/user-service.ts
    lines: 10-60
    description: Example of proper service pattern
  - path: examples/user-service.test.ts
    lines: 1-40
    description: Example of service testing

tasks:
  - id: m1-001
    name: Create user service
    instructions: |
      Implement following the pattern in examples/user-service.ts

      **Pattern to follow:**
      - Effect.Service with sync factory
      - All methods return Effect types
      - Proper error handling with TaggedError
      - Tests use it.effect pattern
```

**Result:** AI creates:

- Consistent with existing codebase
- Proper dependency injection
- Complete test coverage
- Same patterns as style anchors

---

## Tips from Real Usage

### Interview Tips

1. **Don't rush** - Take time to think through each answer
2. **Be honest about constraints** - Unrealistic constraints cause problems later
3. **Document assumptions** - Future you will thank present you
4. **Use free-form answers** - Options are guides, not requirements

### Planning Tips

1. **Start small** - Smaller milestones are easier to complete
2. **Think about testing** - Include test tasks alongside code tasks
3. **Consider documentation** - Add docs tasks to each milestone
4. **Plan for polish** - Final milestone for testing and refinement

### Development Tips

1. **Follow task scope** - Don't drift beyond listed files
2. **Run validation often** - Catch issues early
3. **Commit per task** - Makes rollback easy
4. **Update docs as you go** - Don't leave docs for the end

### Team Tips

1. **Review requirements together** - Shared understanding is crucial
2. **Review task breakdown** - Ensure tasks are well-defined
3. **Communicate about drift** - Report unexpected patterns immediately
4. **Update constraints** - Learn from each milestone

---

## Common Patterns

### Pattern: MVP First

```yaml
milestones:
  - id: m0
    name: Foundation
  - id: m1
    name: Core MVP features
  - id: m2
    name: MVP polish & testing
  - id: m3
    name: Additional features
  - id: m4
    name: Advanced features
```

Deliver working MVP in m2, then iterate.

### Pattern: Vertical Slices

```yaml
milestones:
  - id: m1
    name: User authentication (complete)
  - id: m2
    name: Data management (complete)
  - id: m3
    name: API endpoints (complete)
```

Each milestone delivers complete feature end-to-end.

### Pattern: Foundation → Features → Polish

```yaml
milestones:
  - id: m0-m2
    name: Infrastructure and foundation
  - id: m3-m5
    name: Feature development
  - id: m6-m7
    name: Testing, documentation, polish
```

Build solid foundation, add features, then refine.

---

## Getting Help

- **Documentation**: See [USAGE.md](./USAGE.md) for detailed usage
- **Examples**: Review the examples/ directories in each skill
- **Community**: Join our community for tips and support
- **Issues**: Report bugs or request features on GitHub
