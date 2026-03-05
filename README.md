# Sherpy - Structured Requirements & Planning Skills for AI Agents

Sherpy is a collection of Claude Code skills that bring structured software development methodology to AI-assisted coding. These skills guide you through business requirements gathering, technical requirements definition, and detailed implementation planning.

## Overview

Sherpy provides three complementary skills:

1. **Business Requirements Interview** - Conduct structured interviews to gather comprehensive business requirements
2. **Technical Requirements Interview** - Derive technical specifications from business requirements through guided interviews
3. **Implementation Planner** - Generate detailed implementation plans with milestones, tasks, and best practices

## Installation

Install all Sherpy skills with a single command:

```bash
npx skills add validkeys/sherpy
```

Or install individual skills:

```bash
npx skills add validkeys/sherpy@business-requirements-interview
npx skills add validkeys/sherpy@technical-requirements-interview
npx skills add validkeys/sherpy@implementation-planner
```

## Quick Start

### 1. Business Requirements Interview

Start by gathering business requirements:

```
/business-requirements-interview
```

The skill will:

- Ask one question at a time with multiple-choice options
- Track your progress in a JSONL file
- Generate `business-requirements.yaml` when complete

### 2. Technical Requirements Interview

Once you have business requirements, gather technical requirements:

```
/technical-requirements-interview path/to/business-requirements.yaml
```

The skill will:

- Load your business requirements as context
- Ask targeted technical questions
- Generate `technical-requirements.yaml` when complete

### 3. Implementation Planner

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

## Workflow

```
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
    Gap Analysis          Review & Address Gaps
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

- [Business Requirements Interview](./skills/business-requirements-interview/) - Gather business requirements
- [Technical Requirements Interview](./skills/technical-requirements-interview/) - Define technical specifications
- [Implementation Planner](./skills/implementation-planner/) - Generate implementation plans

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
