---
name: sherpy-flow
description: Orchestrates the full Sherpy planning workflow from requirements to QA-ready delivery plan. Detects which artifacts already exist, shows a visual pipeline status, and guides through each skill in sequence — gap analysis, business interview, technical interview, implementation planning, plan review, definition of done, architecture decisions, delivery timeline, QA test plan, and summary generation. Automatically organizes all artifacts into a structured docs/ folder.
---

# Sherpy Flow

Runs the complete Sherpy planning pipeline from start to finish. Detects your current position in the workflow based on existing artifacts and resumes from there. You never need to remember which skill comes next or what its inputs are.

## Usage

```
/sherpy-flow [output-directory]
```

If no directory is provided, prompt the user: "Where should I create the planning documents?"

Wait for the user to provide a path before proceeding.

## The Pipeline

```
Step 1   Gap Analysis Worksheet         → gap-analysis-worksheet.md
Step 2   Business Requirements          → business-requirements.yaml
Step 3   Technical Requirements         → technical-requirements.yaml
Step 4   Style Anchors Collection       → style-anchors/index.yaml + *.md
Step 5   Implementation Planner         → milestones.yaml + milestone-m*.tasks.yaml (with optional acceptance_criteria)
Step 6   Implementation Plan Review     → implementation-plan-review.yaml
Step 7   Architecture Decision Records  → adrs/INDEX.md + adrs/ADR-*.md
Step 8   Delivery Timeline              → timeline.yaml
Step 9   QA Test Plan                   → qa-test-plan.yaml
Step 10  Generate Summaries             → developer-summary.md + executive-summary.md
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
├── artifacts/          (reviews, interview transcripts, style anchors, CONTINUE.md, etc.)
└── summaries/          (developer & executive summaries)
```

## Process

### Step 0: Determine Output Directory

If no directory was provided as a parameter, prompt the user:

> "Where should I create the planning documents?"

Wait for user response. Store the provided path as `base_directory`.

**Do not create any folders at this stage.** Folders will be created on-demand by individual skills as they generate files.

### Step 1: Scan for Existing Artifacts

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
| `adrs/INDEX.md` | `architecture/adrs/` | Step 7 |
| `timeline.yaml` | `delivery/` | Step 8 |
| `qa-test-plan.yaml` | `delivery/` | Step 9 |
| `developer-summary.md` | `summaries/` | Step 10 |
| `executive-summary.md` | `summaries/` | Step 10 |

**Artifact Detection Logic:**
- Check expected location within `base_directory`
- If file exists, step is considered complete
- Skills will create folders as needed when generating files

### Step 2: Show Pipeline Status

Display a visual status of the pipeline before doing any work:

```
## Sherpy Flow — [Project Directory]

 ✓  Step 1   Gap Analysis Worksheet
 ✓  Step 2   Business Requirements
 →  Step 3   Technical Requirements        ← resuming here
 ○  Step 4   Style Anchors Collection
 ○  Step 5   Implementation Planner
 ○  Step 6   Implementation Plan Review
 ○  Step 7   Architecture Decision Records
 ○  Step 8   Delivery Timeline
 ○  Step 9   QA Test Plan
 ○  Step 10  Generate Summaries

Resuming from Step 3. Type "start over" to restart from Step 1,
or specify a step number to jump to a specific point.
```

**Legend:** ✓ complete · → current · ○ pending

Then ask:

> "Ready to continue from Step [n]: [Step Name]? (yes / start over / jump to step N)"

Wait for confirmation before proceeding.

### Step 3: Execute Each Step

For each pending step, invoke the referenced skill with `base_directory` as a parameter. The behavior at each step is identical to invoking the skill standalone — sherpy-flow is a sequencer, not a replacement.

**CRITICAL EXECUTION RULES:**
1. **NEVER proceed to the next step without explicit user confirmation** — wait after EVERY step completion
2. **Step 4 (Style Anchors Collection) MUST NOT be skipped automatically** — always prompt the user and show risk warning if they want to skip
3. **If a step requires input that doesn't exist (e.g., Step 5 needs style anchors)**, STOP and warn the user before proceeding

**Important**: Pass `base_directory` to each skill so files are created in the correct location. Skills will create necessary folders as they generate output.

**Each skill is responsible for outputting files to the correct location within `base_directory`**. No post-skill file organization is needed — skills create folders and files in the right place from the start.

#### Expected Output Locations

When invoking skills, pass `base_directory` as a parameter (or skills will auto-detect by looking for `requirements/business-requirements.yaml`):

**Requirements Documents:**
- `gap-analysis-worksheet.md` → `{base_directory}/requirements/`
- `business-requirements.yaml` → `{base_directory}/requirements/`
- `technical-requirements.yaml` → `{base_directory}/requirements/`

**Implementation Documents:**
- `milestones.yaml` → `{base_directory}/implementation/`
- `milestone-m*.tasks.yaml` → `{base_directory}/implementation/tasks/`

**Delivery Documents:**
- `timeline.yaml` → `{base_directory}/delivery/`
- `qa-test-plan.yaml` → `{base_directory}/delivery/`

**Architecture Documents:**
- `adrs/INDEX.md` + `ADR-*.md` → `{base_directory}/architecture/adrs/`

**Artifact/Review Documents:**
- `business-interview.jsonl` → `{base_directory}/artifacts/`
- `technical-interview.jsonl` → `{base_directory}/artifacts/`
- `style-anchors/index.yaml` + `*.md` → `{base_directory}/artifacts/style-anchors/`
- `implementation-plan-review.yaml` → `{base_directory}/artifacts/`
- `CONTINUE.md` → `{base_directory}/artifacts/`
- `FEATURE_FLAGS.md` → `{base_directory}/artifacts/`
- `UPDATES.md` → `{base_directory}/artifacts/`

**Summary Documents:**
- `developer-summary.md` → `{base_directory}/summaries/`
- `executive-summary.md` → `{base_directory}/summaries/`

**Step 1 — Gap Analysis Worksheet (`/gap-analysis-worksheet`)**
- Skip this step if no initial requirements document is present in the project directory.
- If an initial requirements document exists (any `.md`, `.txt`, or `.docx`-described file), run the gap analysis against it.
- After completing, ask: "Gap analysis worksheet generated. Shall I continue to the Business Requirements Interview?"

**Step 2 — Business Requirements Interview (`/business-requirements-interview`)**
- Run the full interview process (one question at a time, tracks progress in `business-interview.jsonl`).
- After `business-requirements.yaml` is generated, display the summary and ask: "Business requirements complete. Continue to Technical Requirements?"

**Step 3 — Technical Requirements Interview (`/technical-requirements-interview`)**
- Requires `business-requirements.yaml`.
- Run the full interview process.
- After `technical-requirements.yaml` is generated, display the summary and ask: "Technical requirements complete. Continue to Style Anchors Collection?"

**Step 4 — Style Anchors Collection (`/style-anchors-collection`) — MANDATORY**
- Requires `technical-requirements.yaml`.
- **CRITICAL**: This step MUST NOT be skipped. Style anchors prevent architectural drift during implementation.
- Interactive collection of code examples demonstrating approved patterns.
- For each pattern identified in technical requirements:
  - Ask user to provide file path, line range
  - Document what pattern demonstrates
  - Specify when to use it
- Generate `style-anchors/` directory with individual `.md` files and `index.yaml`.
- **If user wants to skip**: Ask "Skipping style anchors significantly increases drift risk. Are you sure? (yes to skip / no to collect anchors)"
- After completion, display anchor count by category and ask: "Style anchors collected. Continue to Implementation Planner?"

**Step 5 — Implementation Planner (`/implementation-planner`)**
- Requires `business-requirements.yaml`, `technical-requirements.yaml`.
- **Strongly Recommended**: `style-anchors/index.yaml` from Step 4.
- **Before running**: If no style anchors exist, STOP and ask:
  > "⚠️  No style anchors found. The implementation plan will be generated WITHOUT concrete code examples, which significantly increases architectural drift risk.
  >
  > Would you like to:
  > 1. Go back to Step 4 and collect style anchors now (recommended)
  > 2. Continue without style anchors (not recommended)"
- If user chooses option 1, return to Step 4.
- If user chooses option 2, confirm with: "Proceeding without style anchors. Expect higher drift during implementation. Continue? (yes/no)"
- Generate `milestones.yaml` + `milestone-m*.tasks.yaml`.
- Style anchors from Step 4 are automatically referenced in task instructions (if collected).
- After completion, display milestone summary and ask: "Implementation plan generated. Continue to Plan Review?"

**Step 6 — Implementation Plan Review (`/implementation-plan-review`)**
- Requires `milestones.yaml` + task files.
- Run the full review.
- After `implementation-plan-review.yaml` is generated, display the readiness score and critical issues.
- If critical issues exist, ask:
  > "The plan review found [n] critical issue(s). Would you like to:
  > 1. Address issues now (loops back to Step 5)
  > 2. Continue with acknowledged issues
  > 3. Review the issues in detail first"
- Otherwise ask: "Plan review passed. Continue to Architecture Decision Records?"

**Step 7 — Architecture Decision Records (`/architecture-decision-record`)**
- Requires `technical-requirements.yaml`.
- Generate `adrs/` directory with all ADR files.
- After completion, display ADR count and ask: "Architecture decisions recorded. Continue to Delivery Timeline?"

**Step 8 — Delivery Timeline (`/delivery-timeline`)**
- Requires `milestones.yaml`.
- Ask the three delivery parameter questions (production deploy date, QA rounds, days per round) as defined in that skill.
- Generate `timeline.yaml`.
- After completion, display the workback summary (project start → deploy date) and ask: "Delivery timeline generated. Continue to QA Test Plan?"

**Step 9 — QA Test Plan (`/qa-test-plan`)**
- Requires `business-requirements.yaml` + `technical-requirements.yaml`.
- Generate `qa-test-plan.yaml`.
- After completion, display coverage summary and ask: "QA test plan generated. Continue to Generate Summaries?"

**Step 10 — Generate Summaries (`/developer-summary` + `/executive-summary`)**
- Requires: `business-requirements.yaml`, `technical-requirements.yaml`, `milestones.yaml`, `timeline.yaml`.
- Run `/developer-summary` first to generate the developer-focused summary.
- Then run `/executive-summary` to generate the executive/stakeholder summary.
- Both skills auto-discover required files from the docs/ folder structure.
- After both summaries are generated, display confirmation and proceed to final summary.

### Step 4: Final Summary

After all steps are complete, display a final summary:

```
## Sherpy Flow Complete ✓

**Project:** [name]
**Directory:** [path]

All artifacts organized in: [base_directory]/

📋 Requirements
  ✓ gap-analysis-worksheet.md       [if generated]
  ✓ business-requirements.yaml
  ✓ technical-requirements.yaml

🔨 Implementation
  ✓ milestones.yaml
  ✓ tasks/milestone-m*.tasks.yaml   ([n] task files)

🚀 Delivery
  ✓ timeline.yaml
  ✓ qa-test-plan.yaml

🏛️ Architecture
  ✓ adrs/INDEX.md + ADR-*.md        ([n] decision records)

📊 Summaries
  ✓ developer-summary.md
  ✓ executive-summary.md

📁 Artifacts
  ✓ implementation-plan-review.yaml
  ✓ business-interview.jsonl
  ✓ technical-interview.jsonl
  ✓ style-anchors/index.yaml + [n] anchor files

Timeline: [project start date] → [production deploy date]
Total Delivery Days: [n] business days
QA Rounds: [n] × [n] days each

Your project is fully planned and ready for development!

Next Steps:
- Review summaries/ for project overview
- Start development with implementation/milestones.yaml
- Use /create-continuation-prompt to hand off context to a new session
```

## Transition Rules

- **CRITICAL: Always confirm** before moving to the next step — **NEVER auto-advance**. Wait for explicit user confirmation after EVERY step completion.
- **Step 4 (Style Anchors) is MANDATORY**: Do not skip this step unless user explicitly requests to skip AND confirms after seeing the risk warning.
- **Loop-back**: If the user says "go back" or "redo step N", return to that step and re-run it. The new output overwrites the previous artifact.
- **Skip**: If the user says "skip step N":
  - If N == 4 (Style Anchors): Display warning about drift risk and require explicit "yes to skip" confirmation
  - For other steps: Mark as skipped and note it in the final summary. Downstream steps that require its output will warn if the input is missing.
- **Jump**: If the user says "jump to step N", run from that step forward. Load any required inputs from existing artifacts.
- **Interruption**: If the user needs to stop mid-flow, remind them they can resume by running `/sherpy-flow` again — the pipeline status will show exactly where they left off.
