---
name: technical-requirements-interview
description: Conducts structured interviews to derive technical requirements from business requirements. Requires completed business-requirements.yaml as input. Asks targeted technical questions about architecture, technology stack, data model, APIs, security, testing, and deployment. Generates technical-requirements.yaml output.
---

# Technical Requirements Interview

This skill guides you through a structured interview to derive technical requirements from business requirements.

## Prerequisites

- Completed `business-requirements.yaml` file
- Clear understanding of the problem domain

## Interview Process

### Rules

1. **One question at a time** - Never ask multiple questions in a single turn
2. **Business context first** - Load and understand business requirements before asking technical questions
3. **Provide options** - Each question includes 2-5 recommended options plus free-form input
4. **Track progress** - All Q&A pairs are immediately appended to `technical-interview.jsonl`
5. **Resume capability** - If JSONL exists, continue from last question
6. **Structured output** - Generate `technical-requirements.yaml` upon completion

### Interview Categories

The interview covers these areas in order:

1. **Architecture & Patterns**

   - Overall architecture style
   - Application structure
   - Component organization

2. **Technology Stack**

   - Programming language
   - Frameworks and libraries
   - Package management

3. **Data Model & Storage**

   - Data persistence strategy
   - Database selection
   - Schema design approach

4. **API Design**

   - API style (REST, GraphQL, RPC)
   - API framework
   - Versioning strategy

5. **Security & Authentication**

   - Authentication method
   - Authorization approach
   - Secrets management

6. **Testing Strategy**

   - Testing approach (TDD, BDD, etc.)
   - Test types (unit, integration, e2e)
   - Testing frameworks

7. **Development & Tooling**

   - Development workflow
   - Code quality tools
   - CI/CD approach

8. **Deployment & Distribution**
   - Deployment target
   - Packaging strategy
   - Release process

## Question Format

Each question follows this structure:

```
## [Category Name]

**Question:** [Clear, specific question]

**Options:**
1. [Option 1] (Recommended) - [Brief description and rationale]
2. [Option 2] - [Brief description]
3. [Option 3] - [Brief description]
4. Type your own answer
```

## Example Questions

### Architecture

```
## Architecture & Patterns

**Question:** What architecture pattern best fits this project?

**Options:**
1. Monolithic application (Recommended) - Single deployable unit, simpler to develop and deploy initially
2. Microservices - Multiple independent services, better scaling but higher complexity
3. Serverless functions - Event-driven, scales automatically, but vendor lock-in
4. Plugin-based - Core engine with extensible plugins for flexibility
5. Type your own answer
```

### Technology Stack

```
## Technology Stack

**Question:** Which programming language should be used?

**Options:**
1. TypeScript (Recommended) - Type-safe JavaScript, excellent tooling, large ecosystem
2. Python - Readable, extensive libraries, good for data processing and scripting
3. Go - Fast compilation, excellent concurrency, simple deployment
4. Rust - Memory safety without garbage collection, high performance
5. Type your own answer
```

### Data Storage

```
## Data Model & Storage

**Question:** What data persistence strategy is appropriate?

**Options:**
1. File-based storage (Recommended) - Simple, portable, no database dependency
2. SQLite - Embedded relational database, good for local tools
3. PostgreSQL - Full-featured relational database, better for complex queries
4. NoSQL (MongoDB, etc.) - Flexible schema, good for document-based data
5. In-memory only - Fast but no persistence, suitable for ephemeral data
6. Type your own answer
```

## JSONL Format

Track all questions and answers in `technical-interview.jsonl`:

```json
{"id":1,"category":"Architecture & Patterns","question":"What architecture pattern best fits this project?","answer":"Monolithic application - Single deployable unit, simpler to develop and deploy initially","question_number":"Q1","timestamp":"2025-01-27T11:00:00Z"}
{"id":2,"category":"Technology Stack","question":"Which programming language should be used?","answer":"TypeScript - Type-safe JavaScript, excellent tooling, large ecosystem","question_number":"Q2","timestamp":"2025-01-27T11:05:00Z"}
```

## Output Format

Generate `technical-requirements.yaml` with this structure:

```yaml
project: [project-name]
version: "1.0.0"
generated: [timestamp]
business_requirements_ref: [path-to-business-requirements.yaml]

architecture:
  pattern: [architecture-pattern]
  description: |
    [Detailed description of architecture approach]
  components:
    - name: [Component 1]
      responsibility: [What it does]
    - name: [Component 2]
      responsibility: [What it does]

technology_stack:
  language: [programming-language]
  runtime: [node/python/jvm/etc]
  frameworks:
    - [framework 1]
    - [framework 2]
  libraries:
    core:
      - [library 1]
      - [library 2]
    development:
      - [dev library 1]
  package_manager: [npm/pip/cargo/etc]

project_structure:
  type: [monorepo/multi-repo/single-repo]
  layout: |
    [Description of directory structure]
  key_directories:
    - path: [path]
      purpose: [what goes here]

data_model:
  strategy: [file/database/memory/etc]
  database: [type-if-applicable]
  schema_approach: [description]
  migrations: [strategy]

api:
  style: [REST/GraphQL/RPC/CLI]
  framework: [framework-name]
  versioning: [strategy]
  documentation: [approach]

security:
  authentication:
    method: [none/token/oauth/etc]
    implementation: [how]
  authorization:
    model: [none/rbac/abac/etc]
    implementation: [how]
  secrets:
    storage: [env-vars/keychain/vault/etc]
    rotation: [policy]
  data_validation:
    input: [approach]
    output: [approach]

testing:
  strategy: [TDD/BDD/manual/etc]
  types:
    unit:
      framework: [framework]
      coverage_target: [percentage]
    integration:
      framework: [framework]
      approach: [description]
    e2e:
      framework: [framework]
      approach: [description]
  mocking:
    strategy: [what to mock]
    tools: [frameworks]

development:
  workflow: [description]
  code_quality:
    linter: [tool]
    formatter: [tool]
    type_checker: [tool]
  pre_commit_hooks:
    - [hook 1]
    - [hook 2]

ci_cd:
  platform: [github-actions/circleci/etc]
  pipeline:
    - stage: [stage 1]
      actions:
        - [action 1]
        - [action 2]
    - stage: [stage 2]
      actions:
        - [action 1]

deployment:
  target: [local/cloud/hybrid/etc]
  packaging:
    format: [npm/docker/binary/etc]
    distribution: [approach]
  environments:
    - name: development
      config: [approach]
    - name: production
      config: [approach]
  release_process:
    strategy: [semver/calver/etc]
    automation: [level]

monitoring:
  logging:
    format: [structured/plain]
    destination: [file/console/service]
  metrics:
    collection: [approach]
    visualization: [tool]
  alerts:
    strategy: [when to alert]
    channels: [email/slack/etc]

performance:
  targets:
    response_time: [target]
    throughput: [target]
  optimization:
    strategy: [caching/lazy-loading/etc]
    monitoring: [approach]

scalability:
  approach: [vertical/horizontal/serverless]
  limits:
    concurrent_users: [estimate]
    data_volume: [estimate]
  bottlenecks:
    - [known bottleneck 1]
    - [known bottleneck 2]

constraints:
  technical:
    - [constraint 1]
    - [constraint 2]
  operational:
    - [constraint 1]
    - [constraint 2]

trade_offs:
  - decision: [decision made]
    rationale: [why]
    alternative: [what was not chosen]
    consequence: [impact]

open_questions:
  - question: [unresolved question]
    options:
      - [option 1]
      - [option 2]
    impact: [what this affects]
```

## Usage

To start a new technical interview:

```
/technical-requirements-interview path/to/business-requirements.yaml
```

To resume an existing interview:

```
/technical-requirements-interview path/to/business-requirements.yaml
```

The skill will automatically:

1. Load business requirements as context
2. Check for existing `technical-interview.jsonl`
3. Resume from last question if found
4. Ask targeted technical questions
5. Generate `technical-requirements.yaml` when complete

## Decision Tracking

Each technical decision should include:

1. **Decision** - What was decided
2. **Rationale** - Why this approach
3. **Alternatives considered** - What else was evaluated
4. **Trade-offs** - What was gained/lost
5. **Reversibility** - How hard to change later

## Best Practices

1. **Align with business needs** - Every technical choice should support business requirements
2. **Consider constraints** - Respect timeline, budget, and skill constraints
3. **Start simple** - Choose simpler solutions over complex ones when possible
4. **Plan for change** - Make reversible decisions where possible
5. **Document rationale** - Future you will thank present you

## Next Steps

After completing the technical requirements interview:

1. Review `technical-requirements.yaml` for completeness
2. Validate technical choices against business constraints
3. Use `/implementation-planner` to generate implementation plans

## Examples

See [examples/](./examples/) for sample output files.
