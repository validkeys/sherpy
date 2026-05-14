---
name: business-requirements-interview
description: Intelligent, context-aware interview that analyzes your project idea first, identifies gaps, then asks targeted questions. Adapts dynamically based on responses. Generates business-requirements.yaml.
---

# Business Requirements Interview

Analyzes your project idea, identifies gaps, asks context-specific questions.

## Process

### 1. Understand the Idea

**Ask user for project description:**

> "Describe your project: the problem, who it's for, what you want to achieve."

**Analyze their response:**
- Domain (CLI, web app, API, etc.)
- What's clear vs unclear
- Missing pieces (users, scope, constraints)
- Questions to ask

### 2. Ask Context-Aware Questions

Generate questions specific to **their project**, not generic forms.

**Example - CLI Validator:**

User: "Build YAML validator for CI/CD"

Questions:
1. "What schema format? JSON Schema, custom DSL, code-based?"
2. "Who uses it? CI/CD only, or local dev too?"
3. "Error output format? JSON, prose, both?"
4. "Performance needs? Thousands of files or dozens?"

**Example - Web Dashboard:**

User: "Analytics dashboard for metrics"

Questions:
1. "Who views it? Execs, PMs, analysts, mixed?"
2. "What metrics? Revenue, usage, engagement?"
3. "Real-time or batch? How fresh?"
4. "Data sources? DB, APIs, warehouse?"

### 3. Adapt Based on Answers

Each answer shapes next question:
- CI/CD → exit codes, automation
- Local dev → UX, error messages
- Multiple users → access control

### Question Types

**Clarification:** "By 'validate', do you mean schema, business rules, or both?"

**Scope:** "Which are in v1: [specific list], or is that v2?"

**Priority:** "Speed, detailed errors, or extensibility - which is critical?"

**Constraints:** "Any limits on tech, timeline, team that shape this?"

**Success:** "How will you know it's working? What metrics matter?"

## Required Coverage

Gather detail for:
- **Problem**: What, who, why it matters
- **Value**: Measurable impact
- **Scope**: In/out v1
- **Users**: Who, goals, pain points
- **Use Cases**: Top 3-5 scenarios
- **Requirements**: 5-10 specific, testable
- **Success**: Quantifiable targets
- **Constraints**: Tech, business, timeline
- **Risks**: What could go wrong

## Avoid

❌ Generic: "What problem are you solving?"
✅ Specific: "Should errors be JSON (machine), prose (human), or both?"

❌ Broad: "1. Developers 2. Teams 3. Enterprise"
✅ Contextual: "1. Devs validating configs 2. Platform enforcing standards 3. Both"

## Progress Tracking

Save to `{base_directory}/artifacts/business-interview.jsonl`:

```jsonl
{"category":"analysis","question":"initial_idea","answer":"CLI YAML validator","timestamp":"2024-05-14T10:30:00Z"}
{"category":"schema","question":"Schema format?","answer":"JSON Schema","rationale":"Industry standard","timestamp":"2024-05-14T10:32:15Z"}
```

## Output

Generate `{base_directory}/requirements/business-requirements.yaml` when complete.

**CRITICAL:** Follow the exact YAML structure defined in **[references/output-spec.md](references/output-spec.md)**.

The output MUST include:
- `project`, `version`, `generated` (root fields)
- `overview` (problem, value_proposition, scope)
- `personas` (name, description, goals, pain_points)
- `use_cases` (name, actor, description, outcome)
- `functional_requirements` (id: FR-1, FR-2..., category, description, priority, rationale)
- `non_functional_requirements`
- `success_criteria`
- `constraints`
- `dependencies`
- `timeline`
- `assumptions`
- `risks`

**ID Format:** FR-1, FR-2, FR-3 (sequential, no gaps)

See **[references/example.yaml](references/example.yaml)** for a complete example.

**Confirm before generating:**

> "Ready to draft requirements doc with:
> - Problem and value prop
> - 3 personas with use cases  
> - 8 functional requirements
> - Success criteria and constraints
>
> Proceed?"

## Validation

```bash
sherpy validate -t business-requirements -f {base_directory}/requirements/business-requirements.yaml --strict
```

Fix errors immediately.

## Gap Analysis

Check for:
- ✅ Specific, testable requirements
- ✅ Clear personas with distinct goals
- ✅ Measurable success criteria
- ✅ Explicit scope boundaries
- ✅ Identified risks with mitigation

If gaps: "Noticed [gap]. Address now or proceed?"

## Next Steps

1. Validate with `sherpy validate`
2. Review gaps
3. `/technical-requirements-interview`
4. `/implementation-planner`

## Key Difference

**Old:** Canned questions, generic options, same for all projects
**New:** Analyze first, context-aware questions, adaptive, intelligent conversation
