---
name: ux-wireframe-planning
description: Detects React/webapp changes from the implementation plan and technical requirements. When UI work is found, generates a structured wireframe specification (wireframe-spec.yaml) and low-fidelity Pencil (.pen) wireframes using a shared design library for consistency. Auto-skips for non-webapp projects.
---

# UX/Wireframe Planning

Detects whether a project involves UI/webapp work and, when it does, generates a wireframe specification plus visual wireframes. For projects with no frontend changes, the step auto-skips after generating a minimal spec with `has_ui_changes: false`.

## Prerequisites

- `implementation/milestones.yaml` and `implementation/tasks/milestone-m*.tasks.yaml`
- `requirements/technical-requirements.yaml`
- `requirements/business-requirements.yaml` (for requirement references)

## Usage

```
/ux-wireframe-planning [base-directory]
```

If no base directory is provided, auto-detect by looking for `implementation/milestones.yaml`.

## Process

### Phase 1: Detection

Read the following documents and scan for UI-related work:

1. **Technical Requirements** — Check for frontend technologies:
   - React, Next.js, Vue, Angular, Svelte, Remix, Astro
   - Any `frontend` or `ui` section in the tech stack

2. **Implementation Plan Tasks** — Scan all task files for:
   - Tasks creating/modifying `.tsx`, `.jsx`, `.vue`, `.svelte` files
   - Tasks mentioning: component, page, route, layout, navigation, modal, form, table
   - Tasks with `ui_component: true` tag

3. **Business Requirements** — Check for:
   - Use cases involving user interaction
   - Personas that are end-users

### Phase 2: Decision

If NO UI changes detected across all signals:
- Generate `ux/wireframe-spec.yaml` with `has_ui_changes: false`
- Output detection summary
- Step is complete — auto-skip wireframe generation

If UI changes ARE detected:
- Proceed to Phase 3

### Phase 3: Wireframe Spec Generation

Extract pages and components from the detected UI tasks and requirements:

1. Identify distinct pages/screens from routes mentioned in tasks
2. For each page, identify components (forms, tables, navigation, etc.)
3. For each component, document states and interactions
4. Map user flows between pages
5. Write `ux/wireframe-spec.yaml`

See **[references/example.yaml](references/example.yaml)** for the output format.

### Phase 4: Wireframe File Creation (Components + Pages)

All wireframe content — variables, reusable components, and page frames — lives in a **single self-contained `.pen` file**: `ux/wireframes.pen`.

> **Important:** Pencil does NOT support cross-file component references. Every `.pen` file must contain its own component definitions inline. Attempting to `imports` a library file and reference its components via `ref` will produce `broken_ref` nodes. Therefore, all components and pages go in one file.

The wireframe file contains three sections:

- **Variables (design tokens):** Colors, spacing, typography, sizing — all prefixed `wf-`
- **Reusable components:** Wireframe primitives (page-shell, header, sidebar, card, form-field, button, table, etc.) as top-level children with `reusable: true`
- **Page wireframes:** Top-level `ref` nodes that instance the in-file components

See **[references/pencil-wireframe-kit.md](references/pencil-wireframe-kit.md)** for the complete variable catalog, component definitions, and slot map.

#### Creating the File via MCP Tools

```javascript
// 1. Set all design tokens as variables
pencil_set_variables({
  filePath: "ux/wireframes.pen",
  variables: {
    "wf-page-bg": {"type": "color", "value": "#F0F0F0"},
    "wf-surface": {"type": "color", "value": "#FFFFFF"},
    "wf-border": {"type": "color", "value": "#CCCCCC"},
    "wf-text-primary": {"type": "color", "value": "#333333"},
    "wf-text-secondary": {"type": "color", "value": "#888888"},
    "wf-accent": {"type": "color", "value": "#4A90D9"},
    // ... see references for full list
  }
})

// 2. Create reusable components as top-level children
pencil_batch_design({
  filePath: "ux/wireframes.pen",
  input: `
    pageShell = I(document, {
      type: "frame", name: "Page Shell", reusable: true,
      width: 1440, height: 900,
      layout: "vertical", fill: "$wf-page-bg"
    })
    headerSlot = I(pageShell, {
      type: "frame", name: "Header Slot",
      width: "fill_container", height: "fit_content",
      layout: "horizontal", fill: "$wf-surface",
      padding: ["$wf-space-md", "$wf-space-lg"]
    })
    bodySlot = I(pageShell, {
      type: "frame", name: "Body Slot",
      width: "fill_container", height: "fill_container", layout: "horizontal"
    })
    footerSlot = I(pageShell, {
      type: "frame", name: "Footer Slot",
      width: "fill_container", height: "fit_content", fill: "$wf-surface"
    })
    // ... create all remaining components as top-level children
    // header, sidebar, content-area, card, form-field, button, etc.
  `
})
```

### Phase 5: Per-Page Wireframe Generation

For each page in the wireframe spec, add a page frame to the same `.pen` file:

#### Consistency Rules (MANDATORY)

1. **Single File** — All components and page wireframes in one `ux/wireframes.pen` file (no cross-file refs)
2. **No Hardcoded Colors** — All fills/strokes/text use `$wf-*` variables
3. **No Raw Shapes for Known Components** — Use component instances (`type: "ref"`) referencing in-file components
4. **Use Component Structure** — Compose pages using `wf-page-shell` and populate its child slots
5. **Consistent Dimensions** — Use literal `1440` for page width and `900` for page height (Pencil silently drops `$wf-*` variable references on width/height properties)
6. **Label Everything** — Override all descendant labels with actual content names
7. **State Annotations** — Add `wf-state-badge` where component states are defined

#### Generation Pattern

```javascript
// Add page wireframe to the SAME file using in-file component refs
pencil_batch_design({
  filePath: "ux/wireframes.pen",
  input: `
    page = I(document, {
      type: "ref", ref: "wf-page-shell",
      x: 0, y: 1100,
      descendants: {
        "header-slot": { children: [
          {type: "ref", ref: "wf-header", descendants: {
            "header-nav": { children: [
              {type: "ref", ref: "wf-nav-item", descendants: {
                "nav-label": {content: "Dashboard"}
              }},
              {type: "ref", ref: "wf-nav-item", descendants: {
                "nav-label": {content: "Settings"}
              }}
            ]}
          }}
        ]},
        "body-slot": { children: [
          {type: "ref", ref: "wf-sidebar"},
          {type: "ref", ref: "wf-content-area", descendants: {
            "content-title": {content: "User Profile"},
            "content-slot": { children: [
              {type: "ref", ref: "wf-card", descendants: {
                "card-title": {content: "Profile"},
                "card-body": { children: [
                  {type: "ref", ref: "wf-form-field", descendants: {
                    "field-label": {content: "Name"}
                  }},
                  {type: "ref", ref: "wf-button", descendants: {
                    "button-label": {content: "Save"}
                  }}
                ]}
              }}
            ]}
          }}
        ]},
        "footer-slot": { children: [
          {type: "ref", ref: "wf-footer", descendants: {
            "footer-text": {content: "Wireframe Preview"}
          }}
        ]}
      }
    })
  `
})

// Export PNG preview for this page
pencil_export_nodes({
  filePath: "ux/wireframes.pen",
  nodeIds: [pageNodeId],
  outputDir: "ux/",
  format: "png"
})
```

### Phase 6: Update Wireframe Spec

After generating all wireframes, update `ux/wireframe-spec.yaml` with:
- `pen_file: "ux/wireframes.pen"` for each wireframe entry (same file for all pages)
- `preview_png` paths for each exported PNG
- `status: generated`

### Phase 7: Validate

```bash
sherpy validate -t wireframe-spec -f ux/wireframe-spec.yaml --strict
```

### Phase 8: Consistency Checklist

Before completing, verify:

- [ ] `ux/wireframes.pen` contains all defined variables
- [ ] All components from the catalog exist as top-level reusable nodes
- [ ] All page wireframes reference in-file components (no cross-file refs)
- [ ] No hardcoded color values (all use `$wf-*` variables)
- [ ] Every page uses `wf-page-shell` as root component
- [ ] Every component instance has overridden labels
- [ ] State badges present where spec defines states
- [ ] PNG previews exported for all wireframes

## Output Files

```
ux/
├── wireframe-spec.yaml          # Structured spec
├── wireframes.pen               # All components + page wireframes (self-contained)
├── PAGE-001.png                 # Exported preview
├── PAGE-002.png                 # Exported preview
└── ...
```

## Self-Review

```
## Wireframe Planning Summary

**UI Changes Detected:** [yes/no]
**Detection Summary:** [how determined]
**Pages:** [n]
**Components:** [n]
**Wireframes Generated:** [n]

By Page:
  PAGE-001 [name]:              [n] components, wireframe ✓/pending
  PAGE-002 [name]:              [n] components, wireframe ✓/pending
  ...

Next step → Continue to Implementation Plan Review
```
