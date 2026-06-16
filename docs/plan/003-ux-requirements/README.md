# Plan 003: UX/Wireframe Requirements

## Status
**Proposed** — Awaiting approval to implement

## Summary

Add a conditional UX/Wireframe Planning step to the Sherpy pipeline that detects React/webapp changes after implementation planning and, when present, generates structured wireframe specifications (YAML) plus low-fidelity visual wireframes (Pencil `.pen` files). UI implications are also flagged during gap analysis for early visibility.

## Motivation

The current 12-step Sherpy pipeline has no UX or wireframe consideration. Projects with significant frontend work proceed from requirements through implementation planning without any UI artifact. This creates a gap:

- Implementation tasks reference components and pages with no visual context
- Plan review has no wireframe coverage validation
- Definition of done has no UI acceptance criteria
- Developers (human or AI) start building UI from text descriptions alone

This plan introduces UX consideration at two touchpoints — early detection in gap analysis, and wireframe generation after implementation planning — without burdening backend/API-only projects.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Wireframe format | YAML spec + Pencil (.pen) visuals | Structured spec is validatable and machine-readable; Pencil provides shareable visual artifacts |
| Conditional logic | Auto-skip for non-webapp projects | Keeps pipeline clean for CLI/API-only projects; avoids unnecessary steps |
| Gate strength | Soft gate (warn, don't block) | Allows flexibility; user acknowledges risk rather than hard-blocking progression |
| Wireframe fidelity | Low-fidelity (boxes + labels) | Focus on layout structure and component placement; fast to generate |
| Implementation scope | Full implementation in one pass | All components (skill, schema, converter, orchestrators, downstream modifications) delivered together |

## New Pipeline (13 steps)

The new step inserts between Implementation Planner and Implementation Plan Review:

```
Step 1   Gap Analysis Worksheet          (+ UI/UX Implications category)
Step 2   Business Requirements
Step 3   Technical Requirements
Step 4   Style Anchors Collection
Step 5   Implementation Planner
Step 6   UX/Wireframe Planning           ← NEW (conditional: auto-skips if no webapp changes)
Step 7   Implementation Plan Review      (+ wireframe coverage check, soft gate)
Step 8   Definition of Done              (+ wireframe acceptance criterion for UI milestones)
Step 9   Architecture Decision Records   (was 8)
Step 10  Delivery Timeline               (was 9)
Step 11  QA Test Plan                    (was 10)
Step 12  Developer Summary               (was 11)
Step 13  Executive Summary               (was 12)
```

### Conditional Step Display

When no UI changes are detected:

```
 Step 5   Implementation Planner
 Step 6   UX/Wireframe Planning         skipped: no UI changes detected
 Step 7   Implementation Plan Review
```

When UI changes are detected:

```
 Step 5   Implementation Planner
 Step 6   UX/Wireframe Planning         4 pages, 12 components wireframed
 Step 7   Implementation Plan Review
```

### Note on Orchestrator Step Inconsistency

`sherpy-flow` and `sherpy-cli-planner` currently have different step counts (10 vs 12). This plan normalizes both to 13 steps. Specifically:
- `sherpy-flow` combines summaries into one step and omits a separate Definition of Done step
- `sherpy-cli-planner` has Definition of Done as a separate step (Step 7)
- Both will be updated to the 13-step pipeline shown above

## Output Structure

New `ux/` directory added to the standard output layout:

```
{base_directory}/
├── requirements/               (requirements, gap analysis)
├── implementation/
│   ├── milestones.yaml
│   └── tasks/
├── ux/                         ← NEW
│   ├── wireframe-spec.yaml     # structured spec
│   ├── wireframes.pen          # all components + page wireframes (self-contained)
│   ├── PAGE-001.png            # exported preview
│   ├── PAGE-002.png            # exported preview
│   └── ...
├── delivery/
├── architecture/
├── artifacts/
└── summaries/
```

## wireframe-spec.yaml Schema

### Structure

```yaml
metadata:
  project_name: string              # required
  generated_date: date              # required (YYYY-MM-DD)
  source_documents:                 # required
    - string                        # paths to input files (milestones.yaml, tech reqs, etc.)
  has_ui_changes: boolean           # required
  detection_summary: string         # required when has_ui_changes: true
                                    # explains how UI changes were detected

pages:                              # array, required when has_ui_changes: true
  - id: PAGE-001                   # sequential, format PAGE-NNN
    name: string                    # human-readable page name
    route: string                   # URL path, e.g. /dashboard
    description: string             # what this page does
    source_requirement: string      # FR-NNN reference from business-requirements.yaml
    components:
      - id: COMP-001               # sequential within page
        name: string
        type: enum                  # form | table | modal | layout | navigation |
                                    # chart | list | detail | other
        description: string
        states:                     # array of strings
          - empty                   # common states: empty, loading, error, success
          - loading
          - error
        interactions:
          - trigger: string         # click, hover, submit, etc.
            action: string          # what happens
            destination: string     # optional: page/route navigated to
    user_flows:
      - name: string
        steps:
          - from: string            # page or component
            to: string              # page or component
            action: string

wireframes:                         # array, required when has_ui_changes: true
  - page_id: PAGE-001              # references a page above
    pen_file: string                # path to .pen file, relative to base_directory
    preview_png: string             # path to exported PNG
    status: enum                    # generated | pending | external_reference
    notes: string                   # optional
```

### Validation Rules

1. **Sequential IDs** — Pages must follow `PAGE-001`, `PAGE-002`, etc. Components must follow `COMP-001`, `COMP-002` within each page.
2. **Requirement references** — `source_requirement` values must match FR-IDs in `business-requirements.yaml`.
3. **Pen file paths** — When `status` is `generated`, `pen_file` must end in `.pen`.
4. **Conditional requirement** — When `has_ui_changes: false`, both `pages` and `wireframes` arrays must be omitted or empty.
5. **Page/wireframe coverage** — Every page in `pages` must have a corresponding entry in `wireframes`.
6. **File size limit** — Standard 10MB limit applies to the YAML file.

### Document Type Registration

Added to `sherpy types` output:
```
wireframe-spec           wireframe-spec.yaml
```

## Detection Logic

The UX/Wireframe Planning step determines whether UI work exists through a multi-signal scan:

### Signal 1: Technical Requirements Tech Stack
Check `technical-requirements.yaml` for frontend technologies:
- React, Next.js, Vue, Angular, Svelte, Remix, Astro
- Any `frontend` or `ui` section in tech stack

### Signal 2: Implementation Plan Task Analysis
Scan `milestones.yaml` + `milestone-m*.tasks.yaml` for:
- Tasks creating/modifying `.tsx`, `.jsx`, `.vue`, `.svelte` files
- Tasks mentioning: component, page, route, layout, navigation, modal, form, table
- Tasks tagged with `ui_component: true` (if implementation planner adds this tag)

### Signal 3: Business Requirements User-Facing Features
Check `business-requirements.yaml` for:
- Use cases involving user interaction (not just API/data processing)
- Personas that are end-users (not just admins or API consumers)

### Decision Flow

```
Read technical-requirements.yaml
  Frontend stack detected?
    NO  → has_ui_changes: false, generate empty spec, auto-skip
    YES → Read implementation plan tasks
            UI-related tasks found?
              NO  → has_ui_changes: false, generate empty spec, auto-skip
              YES → has_ui_changes: true
                    Extract pages/components from tasks + requirements
                    Generate wireframe-spec.yaml
                    For each page: create .pen wireframe + export PNG
                    Validate YAML via sherpy validate
```

### Auto-Skip Behavior
- No user confirmation needed for the skip
- Pipeline status logs the skip reason
- `wireframe-spec.yaml` is still generated with `has_ui_changes: false` for completeness
- Downstream steps (plan review, DoD) skip their wireframe checks

## Pencil (.pen) Wireframe Generation

Wireframe consistency is enforced via a single self-contained `.pen` file (`ux/wireframes.pen`) that defines all design tokens (variables), reusable components as top-level nodes, and page wireframe frames that reference those components via in-file `ref`. Every wireframe uses only the in-file components and variable references — no hardcoded values, no cross-file references.

> **Important:** Pencil does NOT support cross-file component references. The `imports` mechanism does not enable `ref` to components in other files. All components and pages must be in the same `.pen` file.

**Full specification:** See [pencil-wireframe-kit.md](../../skills/ux-wireframe-planning/references/pencil-wireframe-kit.md) for the complete variable catalog, component catalog, slot definitions, skill rules, and MCP tool usage patterns.

### Fidelity
Low-fidelity wireframes using boxes, labels, and placeholder text. Focus on:
- Page layout structure (header, sidebar, main content, footer)
- Component placement and relative sizing
- Navigation flow indicators
- State labels (empty/loading/error)

### Consistency Mechanisms
1. **Variables** — All colors, spacing, fonts defined as `$wf-*` tokens; no hardcoded hex values
2. **Reusable Components** — 25+ wireframe primitives (page-shell, header, sidebar, card, form-field, table, etc.) defined once as top-level nodes in the file
3. **Single File** — All components and page wireframes in one `ux/wireframes.pen`; component changes propagate to all page instances automatically
4. **Slots** — Typed content areas that guide the AI on what components belong where

### Generation Approach
For each page in the spec:

1. **Ensure file exists** — Check for `ux/wireframes.pen`; create if missing (set variables, create components as top-level children)
2. **Add page frame** — Insert a `type: "ref"` node referencing `wf-page-shell` as a top-level child
3. **Compose page** using `pencil_batch_design`:
   - Root: `wf-page-shell` component instance (1440x900)
   - Populate header/body/footer slots with component instances
   - Override all descendant labels with actual content names
   - Add `wf-state-badge` annotations where states are defined
4. **Export PNG preview** using `pencil_export_nodes`
5. **Reference both files** in `wireframe-spec.yaml`

## Modifications to Existing Skills

### Gap Analysis Worksheet (Step 1)

Add **Category 11: UI/UX Implications** to the existing 10 categories.

Assessment questions:
- Does the project involve user-facing interfaces?
- Are all screens/pages identified?
- Are interaction patterns described?
- Are accessibility requirements stated?
- Is there a design system or component library?
- Are responsive/mobile considerations addressed?

When gaps found, add recommendation:
> UI work detected — wireframe planning will be triggered after implementation planning (Step 6).

### Implementation Plan Review (Step 7)

Add **Phase 11: Wireframe Coverage** (soft gate):

Checklist:
- [ ] If tasks reference `.tsx`/`.jsx` files, does `wireframe-spec.yaml` exist?
- [ ] Does every page with UI tasks have a wireframe entry?
- [ ] Are all detected components represented in the wireframe spec?
- [ ] Are user flows documented for key interactions?

**Output:** `WARN-NNN` level issue (not `CRIT-NNN`) if wireframes missing or incomplete.

Does NOT block progression. User sees:
> "WARN-001: 3 UI tasks detected without wireframe coverage. Consider running Step 6 (UX/Wireframe Planning) before development. Proceed anyway? (yes/no)"

### Definition of Done (Step 8)

Add wireframe acceptance criterion for milestones containing UI tasks:

Exit checklist addition:
- [ ] Wireframe reviewed and approved for all pages in this milestone
- [ ] Component states documented (empty, loading, error, success)
- [ ] User flows validated against wireframes

## Files to Create

| File | Purpose |
|------|---------|
| `schema/wireframe_spec.go` | Schema definition and validator |
| `markdown/wireframe_spec.go` | YAML to Markdown converter |
| `skills/ux-wireframe-planning/SKILL.md` | New skill with detection + generation logic |
| `skills/ux-wireframe-planning/references/output-spec.md` | Output format specification |
| `skills/ux-wireframe-planning/references/example.yaml` | Example wireframe-spec.yaml |
| `skills/ux-wireframe-planning/references/pencil-wireframe-kit.md` | Pencil kit spec (moved from plan doc) |
| `testdata/wireframe-spec/valid.yaml` | Valid test fixture |
| `testdata/wireframe-spec/invalid-missing-pages.yaml` | Invalid: has_ui_changes true but no pages |
| `testdata/wireframe-spec/invalid-bad-ids.yaml` | Invalid: non-sequential IDs |
| `testdata/wireframe-spec/no-ui-changes.yaml` | Valid: has_ui_changes false, empty spec |

## Files to Modify

| File | Changes |
|------|---------|
| `schema/registry.go` | Register `wireframe-spec` document type |
| `prompt/registry.go` | Add `ux-wireframe-planning` prompt entry (Step 6, Category: "design") |
| `prompt/content_generated.go` | Regenerate embedded content (via `gen_prompts.go`) |
| `cmd/root.go` | Add `wireframe-spec` to types listing |
| `cmd/validate.go` | Wire up wireframe-spec validation |
| `cmd/to-markdown.go` | Wire up wireframe-spec markdown conversion |
| `skills/gap-analysis-worksheet/SKILL.md` | Add Category 11: UI/UX Implications |
| `skills/implementation-plan-review/SKILL.md` | Add Phase 11: Wireframe Coverage (soft gate) |
| `skills/definition-of-done/SKILL.md` | Add wireframe acceptance criteria |
| `skills/sherpy-flow/SKILL.md` | New Step 6, renumber 6-10 to 7-13, conditional logic, artifact table, folder structure |
| `skills/sherpy-cli-planner/SKILL.md` | Same as sherpy-flow + `sherpy prompt` and `sherpy validate` commands |
| `README.md` | Document type, pipeline steps, token calculations, prompt list, examples |

## Execution Order

1. **Schema + validator** — `schema/wireframe_spec.go`, `schema/registry.go`
2. **Markdown converter** — `markdown/wireframe_spec.go`
3. **New skill** — `skills/ux-wireframe-planning/SKILL.md` + references
4. **Prompt registry** — `prompt/registry.go`, regenerate embedded content
5. **CLI wiring** — `cmd/` files for types, validate, to-markdown
6. **Gap analysis modification** — `skills/gap-analysis-worksheet/SKILL.md`
7. **Plan review modification** — `skills/implementation-plan-review/SKILL.md`
8. **Definition of Done modification** — `skills/definition-of-done/SKILL.md`
9. **sherpy-flow update** — `skills/sherpy-flow/SKILL.md`
10. **sherpy-cli-planner update** — `skills/sherpy-cli-planner/SKILL.md`
11. **README update** — `README.md`
12. **Test fixtures** — `testdata/wireframe-spec/`
13. **Build + test** — `make build && make test`

## Testing Strategy

### Unit Tests
- `schema/wireframe_spec_test.go` — validate valid/invalid fixtures
- `markdown/wireframe_spec_test.go` — verify markdown output structure

### Test Fixtures (`testdata/wireframe-spec/`)
- `valid.yaml` — complete spec with pages, components, wireframes
- `no-ui-changes.yaml` — minimal spec with `has_ui_changes: false`
- `invalid-missing-pages.yaml` — `has_ui_changes: true` but empty pages array
- `invalid-bad-ids.yaml` — non-sequential PAGE/COMP IDs
- `invalid-bad-ref.yaml` — `source_requirement` references non-existent FR-ID

### Integration Tests
- Full pipeline run with a webapp project → Step 6 activates, generates spec + .pen files
- Full pipeline run with a CLI-only project → Step 6 auto-skips, generates empty spec
- `sherpy validate -t wireframe-spec` on valid and invalid fixtures
- `sherpy prompt --list` includes `ux-wireframe-planning`
- `sherpy prompt -t ux-wireframe-planning` outputs non-empty content

### Build Verification
```bash
make build && make test
```

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Pencil MCP tools unavailable during wireframe generation | Step 6 cannot produce .pen files | Fall back to YAML spec only; mark wireframe status as `pending` with note |
| False positive UI detection (flags backend project as having UI) | Unnecessary wireframe generation | Multi-signal detection (tech stack + tasks + requirements); user can confirm skip |
| False negative UI detection (misses UI work) | Wireframes not generated when needed | Plan review soft gate catches missing wireframes post-hoc |
| Step renumbering breaks existing projects mid-pipeline | Users resuming from old step numbers | Artifact detection is file-based, not step-number-based; existing artifacts still detected correctly |
| Orchestrator step inconsistency between sherpy-flow and sherpy-cli-planner | Different step counts after update | Normalize both to 13 steps in this implementation |
