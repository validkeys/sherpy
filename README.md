# Sherpy - Structured Requirements & Planning Skills for AI Agents

Sherpy is a collection of Claude Code skills that bring structured software development methodology to AI-assisted coding. These skills guide you through business requirements gathering, technical requirements definition, and detailed implementation planning.

## Overview

Sherpy provides complementary skills:

1. **Gap Analysis Worksheet** - Analyze initial requirements for gaps and generate a structured worksheet for a business analyst to complete
2. **Business Requirements Interview** - Conduct structured interviews to gather comprehensive business requirements
3. **Technical Requirements Interview** - Derive technical specifications from business requirements through guided interviews
4. **Implementation Planner** - Generate detailed implementation plans with milestones, tasks, and best practices
5. **Implementation Plan Review** - Review generated plans against best practices and identify gaps
6. **Definition of Done** - Generate per-milestone acceptance criteria
7. **Architecture Decision Records** - Extract and formalize architectural decisions as ADRs
8. **Delivery Timeline** - Generate a day-by-day delivery timeline from milestones, including post-development PR, QA, and signoff phases
9. **QA Test Plan** - Generate comprehensive test plans from requirements
10. **Developer Summary** - Generate concise developer-focused project summaries
11. **Executive Summary** - Generate stakeholder-friendly executive summaries
12. **Sherpy Flow** - Orchestrate the complete workflow from start to finish with automatic file organization

## Installation

Install all Sherpy skills with a single command:

```bash
npx skills add validkeys/sherpy
```

Or install individual skills:

```bash
npx skills add validkeys/sherpy@gap-analysis-worksheet
npx skills add validkeys/sherpy@business-requirements-interview
npx skills add validkeys/sherpy@technical-requirements-interview
npx skills add validkeys/sherpy@implementation-planner
npx skills add validkeys/sherpy@delivery-timeline
```

## Quick Start

### Recommended: Use Sherpy Flow

The easiest way to use Sherpy is with the complete workflow orchestrator:

```
/sherpy-flow
```

This will:
- Guide you through all planning steps in sequence
- Automatically organize files into the `docs/` folder structure
- Resume from where you left off if interrupted
- Generate both developer and executive summaries at the end

### Or Use Individual Skills

You can also run each skill independently:

#### 1. Business Requirements Interview

Start by gathering business requirements:

```
/business-requirements-interview
```

The skill will:

- Ask one question at a time with multiple-choice options
- Track your progress in a JSONL file
- Generate `business-requirements.yaml` when complete

#### 2. Technical Requirements Interview

Once you have business requirements, gather technical requirements:

```
/technical-requirements-interview path/to/business-requirements.yaml
```

The skill will:

- Load your business requirements as context
- Ask targeted technical questions
- Generate `technical-requirements.yaml` when complete

#### 3. Implementation Planner

Generate a detailed implementation plan:

```
/implementation-planner path/to/business-requirements.yaml path/to/technical-requirements.yaml
```

The skill will:

- Analyze requirements and dependencies
- Create milestone breakdown
- Generate detailed task files with:
  - Time estimates (30m - 2.5h per task)
  - Style anchors and code examples
  - TDD requirements
  - Quality constraints

#### 4. Generate Summaries

After planning is complete, generate summaries:

```
/developer-summary
/executive-summary
```

These auto-discover your planning artifacts and generate focused summaries for developers and stakeholders.

## Folder Structure

Sherpy automatically organizes all planning artifacts into a structured folder hierarchy:

```
project/
├── docs/
│   ├── planning/
│   │   ├── business-requirements.yaml
│   │   ├── technical-requirements.yaml
│   │   └── gap-analysis-worksheet.md
│   ├── implementation/
│   │   ├── milestones.yaml
│   │   └── tasks/
│   │       ├── milestone-m0.tasks.yaml
│   │       ├── milestone-m1.tasks.yaml
│   │       └── ...
│   ├── delivery/
│   │   ├── timeline.yaml
│   │   ├── qa-test-plan.yaml
│   │   └── definition-of-done.yaml
│   ├── architecture/
│   │   └── adrs/
│   │       ├── INDEX.md
│   │       ├── ADR-001-*.md
│   │       └── ...
│   ├── artifacts/
│   │   ├── implementation-plan-review.yaml
│   │   ├── business-interview.jsonl
│   │   └── technical-interview.jsonl
│   └── summaries/
│       ├── developer-summary.md
│       └── executive-summary.md
```

**When using `/sherpy-flow`**, all files are automatically organized into this structure after each skill completes. Individual skills still output to the project root, but sherpy-flow moves them to the appropriate locations.

**Benefits of the folder structure:**
- **Organized** - All related documents grouped together
- **Scannable** - Easy to find what you need
- **Gitignore-friendly** - Can exclude `docs/artifacts/` for interview transcripts
- **Professional** - Ready for team collaboration and stakeholder review

## Workflow

```
Initial Requirements (any format)
         ↓
Gap Analysis Worksheet → gap-analysis-worksheet.md
         ↓
  BA Completes Worksheet
         ↓
Business Interview → Business Requirements YAML
         ↓                       ↓
    Gap Analysis          Review & Address Gaps
                                 ↓
Technical Interview → Technical Requirements YAML
         ↓                       ↓
    Gap Analysis          Review & Address Gaps
                                 ↓
Implementation Planner → Milestones + Task Files
         ↓                       ↓
Plan Review             Address Critical Issues
                                 ↓
Definition of Done + ADRs + Timeline + QA Plan
                                 ↓
Generate Developer & Executive Summaries
                                 ↓
                         Ready for Development
```

## Automatic Quality Assurance

Each phase includes automatic **gap analysis** to ensure completeness:

### Business Requirements Review

- ✓ Checks for missing personas, unclear scope, vague success criteria
- ✓ Identifies undocumented assumptions
- ✓ Scores completeness (1-10) and provides recommendations
- ✓ Asks if you want to address gaps before proceeding

### Technical Requirements Review

- ✓ Verifies alignment with business needs
- ✓ Checks architecture completeness and consistency
- ✓ Reviews trade-offs and open questions
- ✓ Identifies missing error handling, security, monitoring

### Implementation Plan Review

- ✓ Validates task sizing (30m - 2.5h rule)
- ✓ Checks requirement coverage (nothing missed)
- ✓ Analyzes dependency graph for optimization
- ✓ Identifies missing test/docs/integration tasks

**Result:** Each phase outputs a gap analysis report with actionable recommendations before moving to the next phase.

## Key Features

### Structured Interviews

- One question at a time
- Multiple-choice options with recommendations
- Progress tracking via JSONL
- Structured YAML output

### Implementation Planning Best Practices

- **Task Sizing**: 30m - 2.5h atomic tasks (30-150 minutes optimal)
- **Style Anchors**: Include 2-3 concrete code examples per milestone
- **TDD Enforcement**: Tests required before implementation
- **Drift Prevention**: Explicit allowed patterns and constraints
- **Affirmative Instructions**: Clear, positive guidance

### Output Formats

- Human-readable YAML documents
- JSONL interview transcripts for progress tracking
- Task breakdowns with dependencies and time estimates

## Skills Documentation

### Planning & Requirements
- [Gap Analysis Worksheet](./skills/gap-analysis-worksheet/) - Surface gaps in initial requirements before formal gathering
- [Business Requirements Interview](./skills/business-requirements-interview/) - Gather business requirements
- [Technical Requirements Interview](./skills/technical-requirements-interview/) - Define technical specifications

### Implementation Planning
- [Implementation Planner](./skills/implementation-planner/) - Generate implementation plans
- [Implementation Plan Review](./skills/implementation-plan-review/) - Review plans against best practices

### Architecture & Quality
- [Architecture Decision Records](./skills/architecture-decision-record/) - Formalize architectural decisions as ADRs
- [Definition of Done](./skills/definition-of-done/) - Generate per-milestone acceptance criteria
- [QA Test Plan](./skills/qa-test-plan/) - Generate comprehensive test plans

### Delivery & Summaries
- [Delivery Timeline](./skills/delivery-timeline/) - Generate delivery timeline with PR, QA, and signoff phases
- [Developer Summary](./skills/developer-summary/) - Generate developer-focused project summaries
- [Executive Summary](./skills/executive-summary/) - Generate stakeholder-friendly executive summaries

### Workflow Orchestration
- [Sherpy Flow](./skills/sherpy-flow/) - Complete end-to-end workflow with automatic file organization

## Documentation

- [Usage Guide](./docs/USAGE.md) - Detailed usage instructions
- [Examples](./docs/EXAMPLES.md) - Complete workflow examples

## Philosophy

Sherpy implements a layered verification approach:

> Models optimize locally; enforce global constraints with layered verification (prompt → IDE → commit → CI → runtime).

Key principles:

1. **Style Anchors**: Always include concrete examples
2. **Task Sizing**: Small, atomic tasks for better control
3. **TDD**: Tests drive implementation
4. **Drift Handling**: Stop and revert immediately on unexpected patterns

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Credits

Sherpy was developed based on proven software development methodology patterns for AI-assisted coding workflows.
