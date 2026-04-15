---
name: qa-test-plan
description: Generates a structured QA test plan from business-requirements.yaml and technical-requirements.yaml. Produces test suites keyed to functional requirements and user personas, covering positive, negative, edge, security, and performance cases. Outputs qa-test-plan.yaml ready for use in delivery timeline QA phases.
---

# QA Test Plan

Generates a structured QA test plan from completed requirements artifacts. Produces test suites that map directly to business requirements and user personas so QA teams know exactly what to test during each delivery timeline QA round.

## Prerequisites

- `{base_directory}/requirements/business-requirements.yaml` (output from `/business-requirements-interview`)
- `{base_directory}/requirements/technical-requirements.yaml` (output from `/technical-requirements-interview`)

## Usage

```
/qa-test-plan [base-directory]
```

If no directory is provided, auto-detect by looking for `requirements/business-requirements.yaml` in the current directory.

If not found, prompt the user: "Where are your requirements documents located?"

Wait for the user to provide a path before proceeding. Store as `base_directory`.

## Process

### Step 1: Determine Base Directory and Load Requirements

If no directory parameter was provided, check if `requirements/business-requirements.yaml` exists in the current directory.

- If found, use current directory as `base_directory`
- If not found, prompt: "Where are your requirements documents located?" and wait for user response

Once `base_directory` is determined, read both requirements files from `{base_directory}/requirements/`. Extract:

**From `business-requirements.yaml`:**
- Functional requirements and user stories
- User personas and their primary use cases
- Success criteria and metrics
- Known constraints and edge conditions

**From `technical-requirements.yaml`:**
- API surface (endpoints, inputs, outputs)
- Authentication and authorization model
- Non-functional requirements (performance targets, uptime SLAs)
- Data model constraints (required fields, uniqueness, formats)
- Security requirements

### Step 2: Identify Test Suites

Group test coverage into suites. Each suite maps to a coherent functional area (not to individual milestones). Derive suites directly from the requirements — do not invent features not present in the source documents.

Standard suite categories to consider (include only those applicable):

| Category              | Driven by                                      |
|-----------------------|------------------------------------------------|
| Authentication        | Auth model in technical requirements          |
| Core User Flows       | User personas + functional requirements        |
| Data Validation       | Data model constraints                         |
| API Contract          | API design in technical requirements          |
| Permissions & Roles   | Authorization model                            |
| Error Handling        | Edge cases in requirements + API error states  |
| Performance           | Non-functional performance targets             |
| Security              | Security requirements                          |
| Integration           | External dependencies in technical requirements|

### Step 3: Generate Test Cases per Suite

For each suite, write test cases covering:

- **Positive** — happy path, expected successful outcomes
- **Negative** — invalid inputs, unauthorized access, missing required fields
- **Edge** — boundary values, empty states, concurrent operations, large payloads
- **Security** — injection, unauthorized access escalation, token/session misuse
- **Performance** — response time under expected load (only when targets are specified)

Each test case must include:
- `id` — unique, scoped to suite (e.g. `tc-auth-001`)
- `name` — plain-language description of what is being tested
- `type` — `positive | negative | edge | security | performance`
- `priority` — `high | medium | low`
  - **high**: covers a success criterion or a named persona's primary use case
  - **medium**: covers a secondary flow or validation rule
  - **low**: covers an edge/corner case unlikely to affect typical users
- `preconditions` — system state required before executing the test
- `steps` — numbered, concrete actions
- `expected_result` — specific, verifiable outcome
- `requirement_refs` — IDs of the business/technical requirements this case validates
- `tags` — optional labels for filtering (e.g. `[smoke, regression, auth]`)

### Step 4: Compute Coverage

Calculate coverage metrics:

- **Functional coverage** — percentage of named functional requirements with at least one `high`-priority test case
- **Persona coverage** — percentage of user personas whose primary use case has a `positive` test case
- **Non-functional coverage** — boolean per NFR category (performance, security, etc.) — at least one test case exists

Flag any functional requirement with **no test case** as a coverage gap.

### Step 5: Generate qa-test-plan.yaml

Write `{base_directory}/delivery/qa-test-plan.yaml`.

Create directory if it doesn't exist:
```bash
mkdir -p {base_directory}/delivery
```

### Step 6: Gap Analysis

After generating the file, report inline:

```
## QA Test Plan Gap Analysis

**Project:** [name]
**Test Suites:** [n]
**Total Test Cases:** [n] ([n] high / [n] medium / [n] low)
**Functional Coverage:** [n]% ([n]/[n] requirements have high-priority cases)
**Persona Coverage:** [n]% ([n]/[n] personas covered)

**NFR Coverage:**
[✓ / ✗] Performance tests present
[✓ / ✗] Security tests present
[✓ / ✗] Integration tests present

**Gaps:**
- [requirement or persona with no coverage, if any]

**Recommendations:** [none / list]
```

## Output Format

### qa-test-plan.yaml Schema

```yaml
version: "1.0.0"
project: [project name]
generated: "[ISO 8601 timestamp]"
sources:
  business_requirements: business-requirements.yaml
  technical_requirements: technical-requirements.yaml

summary:
  total_test_suites: [n]
  total_test_cases: [n]
  by_priority:
    high: [n]
    medium: [n]
    low: [n]
  coverage:
    functional_requirements: "[n]%"
    personas: "[n]%"
    has_performance_tests: [true/false]
    has_security_tests: [true/false]

test_suites:
  - id: ts-[slug]
    name: [Suite Name]
    description: [one-line scope of this suite]
    requirement_refs: [list of requirement IDs]
    test_cases:
      - id: tc-[suite-slug]-[nnn]
        name: [what is being tested]
        type: positive  # positive | negative | edge | security | performance
        priority: high  # high | medium | low
        preconditions:
          - [state required before test runs]
        steps:
          - [step 1]
          - [step 2]
        expected_result: [specific, verifiable outcome]
        requirement_refs: [requirement IDs this validates]
        tags: [optional filter labels]
```

## Example Output

See [examples/qa-test-plan.yaml](./examples/qa-test-plan.yaml) for a complete sample.
