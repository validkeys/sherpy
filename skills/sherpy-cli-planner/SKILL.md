---
name: sherpy-cli-planner
description: Orchestrates the full Sherpy planning workflow using the Sherpy CLI. Requires the sherpy CLI to be installed. Supports AI, human, and hybrid audience selection for appropriate task detail levels. Replaces the need for 14 individual skill files by loading step-specific instructions on demand via `sherpy prompt`. Detects existing artifacts, shows visual pipeline status, and guides through each step in sequence.
user-invocable: true
---

# Sherpy CLI Planner

Runs the complete Sherpy planning pipeline using the Sherpy CLI `prompt` command to load step-specific instructions on demand. This provides a token-efficient alternative to installing 14 individual skill files — all instructions are embedded in the `sherpy` binary.

## Prerequisites

**The sherpy CLI must be installed.** Verify with:

```bash
sherpy --help
```

If not installed:

```bash
go install github.com/validkeys/sherpy@latest
```

## Usage

```
/sherpy-cli-planner [output-directory]
```

If no directory is provided, prompt the user: "Where should I create the planning documents?"

Wait for the user to provide a path before proceeding.

## The Pipeline

The same 12 steps as `sherpy-flow`, but instructions are loaded via `sherpy prompt` instead of individual skills:

```
Step 1   Gap Analysis Worksheet         → gap-analysis-worksheet.md
Step 2   Business Requirements          → business-requirements.yaml
Step 3   Technical Requirements         → technical-requirements.yaml
Step 4   Style Anchors Collection       → style-anchors/index.yaml + *.md
Step 5   Implementation Planner         → milestones.yaml + milestone-m*.tasks.yaml
Step 6   Implementation Plan Review     → implementation-plan-review.yaml
Step 7   Definition of Done             → milestones.yaml (enhanced with acceptance_criteria)
Step 8   Architecture Decision Records  → adrs/INDEX.md + adrs/ADR-*.md
Step 9   Delivery Timeline              → timeline.yaml
Step 10  QA Test Plan                   → qa-test-plan.yaml
Step 11  Developer Summary              → developer-summary.md
Step 12  Executive Summary              → executive-summary.md
```

All artifacts are automatically organized into:
```
<output-directory>/
├── requirements/       (requirements, gap analysis)
├── implementation/
│   ├── milestones.yaml (with optional acceptance_criteria)
│   └── tasks/          (milestone task files)
├── delivery/           (timeline, QA test plan)
├── architecture/
│   └── adrs/           (ADRs)
├── artifacts/          (reviews, interview transcripts, style anchors, etc.)
└── summaries/          (developer & executive summaries)
```

## Process

### Step 0: Verify CLI and List Prompts

Before starting, verify the CLI is installed and show available prompts:

```bash
sherpy prompt --list
```

If this fails, instruct the user to install the CLI and exit.

### Step 1: Determine Output Directory

If no directory was provided as a parameter, prompt the user:

> "Where should I create the planning documents?"

Wait for user response. Store the provided path as `base_directory`.

**Do not create any folders at this stage.** Folders will be created on-demand as you generate files.

### Step 2: Scan for Existing Artifacts

Check the `base_directory` for existing files in the organized structure:

| Artifact | Expected Location | Indicates step complete |
|----------|-------------------|------------------------|
| `gap-analysis-worksheet.md` | `requirements/` | Step 1 |
| `business-requirements.yaml` | `requirements/` | Step 2 |
| `technical-requirements.yaml` | `requirements/` | Step 3 |
| `style-anchors/index.yaml` | `artifacts/style-anchors/` | Step 4 |
| `milestones.yaml` | `implementation/` | Step 5 |
| `milestone-m*.tasks.yaml` | `implementation/tasks/` | Step 5 |
| `implementation-plan-review.yaml` | `artifacts/` | Step 6 |
| `milestones.yaml` with `acceptance_criteria` | `implementation/` | Step 7 |
| `adrs/INDEX.md` | `architecture/adrs/` | Step 8 |
| `timeline.yaml` | `delivery/` | Step 9 |
| `qa-test-plan.yaml` | `delivery/` | Step 10 |
| `developer-summary.md` | `summaries/` | Step 11 |
| `executive-summary.md` | `summaries/` | Step 12 |

**Artifact Detection Logic:**
- Check expected location within `base_directory`
- If file exists, step is considered complete

### Step 3: Show Pipeline Status

Display a visual status of the pipeline before doing any work:

```
## Sherpy CLI Planner — [Project Directory]

 ✓  Step 1   Gap Analysis Worksheet
 ✓  Step 2   Business Requirements
 →  Step 3   Technical Requirements        ← resuming here
 ○  Step 4   Style Anchors Collection
 ○  Step 5   Implementation Planner
 ○  Step 6   Implementation Plan Review
 ○  Step 7   Definition of Done
 ○  Step 8   Architecture Decision Records
 ○  Step 9   Delivery Timeline
 ○  Step 10  QA Test Plan
 ○  Step 11  Developer Summary
 ○  Step 12  Executive Summary

Resuming from Step 3. Type "start over" to restart from Step 1,
or specify a step number to jump to a specific point.
```

**Legend:** ✓ complete · → current · ○ pending

Then ask:

> "Ready to continue from Step [n]: [Step Name]? (yes / start over / jump to step N)"

Wait for confirmation before proceeding.

### Step 4: Execute Each Step

For each pending step, load the instructions via `sherpy prompt` and follow them:

#### Step Execution Pattern

For **every** step:

1. **Load instructions:**
   ```bash
   sherpy prompt -t <prompt-type>
   ```

2. **Follow the printed instructions** to complete the step

3. **After completion, validate the output** (if YAML):
   ```bash
   sherpy validate -t <type> -f <output-file> --strict
   ```

4. **Ask user to confirm** before proceeding to next step:
   > "Step [n] complete. Continue to Step [n+1]? (yes / no / jump to N)"

**CRITICAL EXECUTION RULES:**
1. **NEVER proceed to the next step without explicit user confirmation** — wait after EVERY step completion
2. **Step 4 (Style Anchors Collection) MUST NOT be skipped automatically** — always prompt the user and show risk warning if they want to skip
3. **If a step requires input that doesn't exist (e.g., Step 5 needs style anchors)**, STOP and warn the user before proceeding

#### Step-Specific Commands

**Step 1: Gap Analysis Worksheet**
```bash
# Load instructions
sherpy prompt -t gap-analysis-worksheet

# Follow the instructions, then continue...
```

**Step 2: Business Requirements**
```bash
# Load instructions
sherpy prompt -t business-requirements-interview

# After generating business-requirements.yaml, validate:
sherpy validate -t business-requirements -f {base_directory}/requirements/business-requirements.yaml --strict
```

**Step 3: Technical Requirements**
```bash
# Load instructions
sherpy prompt -t technical-requirements-interview

# After generating technical-requirements.yaml, validate:
sherpy validate -t technical-requirements -f {base_directory}/requirements/technical-requirements.yaml --strict
```

**Step 4: Style Anchors Collection**
```bash
# Load instructions
sherpy prompt -t style-anchors-collection

# Follow the instructions...
# No validation needed (produces markdown files)
```

**Step 5: Implementation Planner**

Before loading instructions, ask the user:

> "Who is the primary audience for this implementation plan?
>
> 1. **AI Agent** — Full prescriptive details for autonomous development
> 2. **Human Developers** — High-level guidance for experienced teams
> 3. **Hybrid** — Moderate detail for mixed teams or pair programming
>
> (Default: AI Agent)"

Wait for user response. Record as `target_audience`.

Then load instructions:
```bash
# Load instructions
sherpy prompt -t implementation-planner
```

When following the implementation-planner instructions, use the selected `target_audience` when generating task files. The prompt will include instructions on how to adjust detail levels based on audience.

After generating files, validate:
```bash
# After generating milestones.yaml, validate:
sherpy validate -t milestones -f {base_directory}/implementation/milestones.yaml --strict

# After generating milestone task files, validate each:
sherpy validate -t milestone-tasks -f {base_directory}/implementation/tasks/milestone-m0.tasks.yaml --strict
sherpy validate -t milestone-tasks -f {base_directory}/implementation/tasks/milestone-m1.tasks.yaml --strict
# ... for each milestone
```

**Step 6: Implementation Plan Review**
```bash
# Load instructions
sherpy prompt -t implementation-plan-review

# Follow the instructions...
# No validation needed (produces review document)
```

**Step 7: Definition of Done**
```bash
# Load instructions
sherpy prompt -t definition-of-done

# After enhancing milestones.yaml, validate:
sherpy validate -t milestones -f {base_directory}/implementation/milestones.yaml --strict
```

**Step 8: Architecture Decision Records**
```bash
# Load instructions
sherpy prompt -t architecture-decision-record

# Follow the instructions...
# No validation needed (produces markdown files)
```

**Step 9: Delivery Timeline**
```bash
# Load instructions
sherpy prompt -t delivery-timeline

# After generating timeline.yaml, validate:
sherpy validate -t timeline -f {base_directory}/delivery/timeline.yaml --strict
```

**Step 10: QA Test Plan**
```bash
# Load instructions
sherpy prompt -t qa-test-plan

# After generating qa-test-plan.yaml, validate:
sherpy validate -t qa-test-plan -f {base_directory}/delivery/qa-test-plan.yaml --strict
```

**Step 11: Developer Summary**
```bash
# Load instructions
sherpy prompt -t developer-summary

# Follow the instructions...
# No validation needed (produces markdown file)
```

**Step 12: Executive Summary**
```bash
# Load instructions
sherpy prompt -t executive-summary

# Follow the instructions...
# No validation needed (produces markdown file)
```

### Step 5: Final Summary

After all steps are complete, show a summary:

```
## Planning Complete! 🎉

All artifacts have been generated and validated:

✓ Requirements documented
✓ Implementation planned with TDD tasks
✓ Delivery timeline established
✓ QA test plan created
✓ Summaries generated

Files are organized in: {base_directory}/

Next steps:
1. Review the developer summary: {base_directory}/summaries/developer-summary.md
2. Share the executive summary with stakeholders
3. Begin implementation using the task files in implementation/tasks/

Run validation at any time:
  sherpy validate -t <type> -f <file> --strict
```

## Transition Rules

Same as `sherpy-flow`:

**Between Steps:**
- Always wait for user confirmation before advancing
- User can type "start over" to reset to Step 1
- User can type "jump to N" to skip to a specific step
- If user asks to skip a step, warn about dependencies

**Skipping Steps:**
- Steps 1-3 (requirements) can be skipped if files exist
- Step 4 (style anchors) should NOT be skipped without warning — show risk of implementation drift
- Steps 5-12 depend on requirements — stop if missing

**Error Handling:**
- If validation fails, STOP and show error
- User must fix the YAML and re-run validation
- Do not proceed until validation passes
- If CLI command fails, show error and stop

## CLI Reference

**List available prompts:**
```bash
sherpy prompt --list
```

**Load specific prompt:**
```bash
sherpy prompt -t <prompt-type>
```

**Validate YAML:**
```bash
sherpy validate -t <type> -f <file> --strict
```

**List document types:**
```bash
sherpy types
```

## Comparison to sherpy-flow

| Feature | sherpy-flow | sherpy-cli-planner |
|---------|-------------|-------------------|
| Requires skill files | Yes (14 files) | No (uses CLI) |
| Token overhead | High (~720K) | Low (~80K) |
| Instructions loaded | All upfront | On-demand per step |
| Validation | Manual | Automated via CLI |
| Works offline | Yes | Yes (content embedded) |
| Suitable for | Non-CLI users | CLI users |

## Notes

- The sherpy CLI embeds all prompt content at build time — no network required
- Each `sherpy prompt` call outputs the full instructions for that step
- Validation is integrated after each step that produces YAML
- The same 12 steps as sherpy-flow, just loaded differently
- Style anchors (Step 4) are critical — never skip without warning
