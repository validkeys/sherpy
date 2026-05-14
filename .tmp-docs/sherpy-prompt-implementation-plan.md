# Implementation Plan: `sherpy prompt` Command + `sherpy-cli-planner` Skill

## Style Anchors

This plan references style anchors in `.tmp-docs/style-anchors/`. Each anchor is a concrete code pattern extracted from the existing codebase. Follow the referenced anchor before implementing each task.

| Anchor | File | Used In Tasks |
|--------|------|---------------|
| Registry Map Pattern | `style-anchors/registry-map-pattern.md` | 0-1, 0-2 |
| Cobra Command Pattern | `style-anchors/cobra-command-pattern.md` | 0-3 |
| Table-Driven Tests | `style-anchors/table-driven-tests.md` | 0-1, 0-3 |
| Frontmatter Stripping | `style-anchors/frontmatter-strip.md` | 0-2 |
| Go Generate Embed | `style-anchors/go-generate-embed.md` | 0-2 |
| Integration Test Binary | `style-anchors/integration-test-binary.md` | 0-4 |

---

## Overview

Two additions that give CLI users a token-efficient alternative to installing 16 individual skill files:

1. **`sherpy prompt`** — new CLI command that outputs skill instructions to stdout
2. **`sherpy-cli-planner`** — thin skill file that orchestrates the pipeline via `sherpy prompt` calls

Non-CLI users continue using the existing `skills/` directory as-is. No changes to existing skills.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Non-CLI Users (no changes)                              │
│                                                          │
│  skills/                                                 │
│    business-requirements-interview/SKILL.md               │
│    technical-requirements-interview/SKILL.md              │
│    implementation-planner/SKILL.md                        │
│    ... (16 skills total, unchanged)                       │
│    sherpy-flow/SKILL.md        ← orchestrates via /skill │
│    sherpy-cli/SKILL.md         ← validation only         │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  CLI Users (new)                                         │
│                                                          │
│  skills/                                                 │
│    sherpy-cli/SKILL.md              ← validation/convert │
│    sherpy-cli-planner/SKILL.md      ← NEW: orchestrates  │
│                                       via sherpy prompt   │
│                                                          │
│  CLI binary:                                             │
│    sherpy prompt -t business-requirements-interview       │
│    sherpy prompt -t implementation-planner                │
│    sherpy prompt -t delivery-timeline                     │
│    sherpy prompt --list                                   │
└──────────────────────────────────────────────────────────┘
```

---

## Milestone 0: `sherpy prompt` Command

**Goal:** Add a `prompt` subcommand that embeds skill instructions and outputs them to stdout.

### Task 0-1: Create prompt registry package (TDD)

**Style Anchor:** `registry-map-pattern`, `table-driven-tests`
**Files:** `prompt/registry.go`, `prompt/registry_test.go`
**TDD Discipline:** Write tests first, then implement. Run `go test ./prompt/...` after each cycle.

#### Red: Write `prompt/registry_test.go` first

Write these failing tests BEFORE any production code:

```go
package prompt

import (
    "sort"
    "strings"
    "testing"
)

func TestRegisteredPromptsSorted(t *testing.T) {
    prompts := RegisteredPrompts()
    if len(prompts) == 0 {
        t.Fatal("expected at least one registered prompt")
    }

    names := make([]string, len(prompts))
    for i, p := range prompts {
        names[i] = p.Name
    }

    if !sort.StringsAreSorted(names) {
        t.Errorf("prompts not sorted: %v", names)
    }
}

func TestResolvePromptFound(t *testing.T) {
    _, err := ResolvePrompt("business-requirements-interview")
    if err != nil {
        t.Errorf("expected to resolve known prompt, got: %v", err)
    }
}

func TestResolvePromptNotFound(t *testing.T) {
    _, err := ResolvePrompt("nonexistent-prompt")
    if err == nil {
        t.Fatal("expected error for unknown prompt")
    }
    if !strings.Contains(err.Error(), "unknown prompt") {
        t.Errorf("expected 'unknown prompt' error, got: %v", err)
    }
}

func TestRegisteredPromptsContainsAllPipeline(t *testing.T) {
    prompts := RegisteredPrompts()
    names := make(map[string]bool)
    for _, p := range prompts {
        names[p.Name] = true
    }

    expected := []string{
        "gap-analysis-worksheet",
        "business-requirements-interview",
        "technical-requirements-interview",
        "style-anchors-collection",
        "implementation-planner",
        "implementation-plan-review",
        "definition-of-done",
        "architecture-decision-record",
        "delivery-timeline",
        "qa-test-plan",
        "developer-summary",
        "executive-summary",
    }

    for _, name := range expected {
        if !names[name] {
            t.Errorf("missing expected prompt: %s", name)
        }
    }
}
```

Run: `go test ./prompt/...` — confirm compilation fails (package doesn't exist).

#### Green: Create `prompt/registry.go`

Follow **[registry-map-pattern](style-anchors/registry-map-pattern.md)**.

```go
package prompt

import (
    "fmt"
    "sort"
)

type Prompt struct {
    Name        string
    Description string
    Step        int
    Category    string
}

var registry = map[string]Prompt{
    "gap-analysis-worksheet": {
        Name: "gap-analysis-worksheet", Step: 1, Category: "planning",
        Description: "Analyzes initial requirements document for gaps and ambiguities",
    },
    "business-requirements-interview": {
        Name: "business-requirements-interview", Step: 2, Category: "interview",
        Description: "Conducts structured interview to gather business requirements",
    },
    // ... all 13 entries
}

func RegisteredPrompts() []Prompt {
    prompts := make([]Prompt, 0, len(registry))
    for _, p := range registry {
        prompts = append(prompts, p)
    }
    sort.Slice(prompts, func(i, j int) bool {
        return prompts[i].Name < prompts[j].Name
    })
    return prompts
}

func ResolvePrompt(name string) (Prompt, error) {
    p, ok := registry[name]
    if !ok {
        return Prompt{}, fmt.Errorf("unknown prompt type: %q", name)
    }
    return p, nil
}
```

Run: `go test ./prompt/...` — all tests pass.

#### Refactor

- Ensure consistent field ordering in registry entries
- Ensure Description values are concise (one line each)

**Estimated:** 45 min

---

### Task 0-2: Create frontmatter stripping + go:generate pipeline (TDD)

**Style Anchors:** `frontmatter-strip`, `go-generate-embed`
**Files:** `prompt/registry.go` (add `PromptContent`), `prompt/registry_test.go` (add tests), `prompt/embed.go`, `prompt/gen_prompts.go`, `prompt/content_generated.go`
**TDD Discipline:** Write frontmatter tests first, then `stripFrontmatter`, then generator.

#### Red: Add frontmatter tests to `prompt/registry_test.go`

```go
func TestStripFrontmatterWithValidFrontmatter(t *testing.T) {
    input := "---\nname: test\n---\n# Body\nContent here."
    got := stripFrontmatter(input)
    if strings.Contains(got, "---") {
        t.Errorf("frontmatter delimiters not stripped: %q", got)
    }
    if !strings.Contains(got, "# Body") {
        t.Errorf("body content missing: %q", got)
    }
}

func TestStripFrontmatterNoFrontmatter(t *testing.T) {
    input := "# Just Content\nNo frontmatter here."
    got := stripFrontmatter(input)
    if got != input {
        t.Errorf("content without frontmatter should be unchanged, got: %q", got)
    }
}

func TestStripFrontmatterOnlyOpening(t *testing.T) {
    input := "---\nname: test\nNo closing delimiter."
    got := stripFrontmatter(input)
    if got != input {
        t.Errorf("malformed frontmatter should return original, got: %q", got)
    }
}

func TestStripFrontmatterContentStartsWithDash(t *testing.T) {
    input := "---not frontmatter---\nSome content"
    got := stripFrontmatter(input)
    if got != input {
        t.Errorf("content that starts with --- but isn't frontmatter should be unchanged, got: %q", got)
    }
}

func TestStripFrontmatterEmptyBody(t *testing.T) {
    input := "---\nname: test\n---\n"
    got := stripFrontmatter(input)
    if got != "" {
        t.Errorf("expected empty string for empty body, got: %q", got)
    }
}

func TestPromptContentReturnsNonEmpty(t *testing.T) {
    content, err := PromptContent("business-requirements-interview")
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if len(content) < 100 {
        t.Errorf("prompt content suspiciously short (%d chars)", len(content))
    }
    if strings.Contains(content, "---") && strings.Contains(content, "name:") {
        t.Error("frontmatter not stripped from prompt content")
    }
}

func TestPromptContentUnknownPrompt(t *testing.T) {
    _, err := PromptContent("nonexistent")
    if err == nil {
        t.Fatal("expected error for unknown prompt")
    }
}
```

Run: `go test ./prompt/...` — fails (functions don't exist).

#### Green: Implement `stripFrontmatter` in `prompt/registry.go`

Follow **[frontmatter-strip](style-anchors/frontmatter-strip.md)**.

Add `stripFrontmatter` function to `prompt/registry.go`:

```go
func stripFrontmatter(content string) string {
    content = strings.TrimSpace(content)
    if !strings.HasPrefix(content, "---") {
        return content
    }
    rest := content[3:]
    if len(rest) > 0 && rest[0] != '\n' {
        return content
    }
    idx := strings.Index(rest, "\n---")
    if idx == -1 {
        return content
    }
    after := rest[idx+4:]
    if len(after) > 0 && after[0] != '\n' && after[0] != '\r' {
        return content
    }
    body := rest[idx+4:]
    return strings.TrimSpace(body)
}
```

Add `PromptContent` function:

```go
func PromptContent(name string) (string, error) {
    if _, err := ResolvePrompt(name); err != nil {
        return "", err
    }
    body, ok := content[name]
    if !ok {
        return "", fmt.Errorf("no content for prompt %q", name)
    }
    return body, nil
}
```

Run: `go test ./prompt/...` — `stripFrontmatter` tests pass, `PromptContent` tests fail (content map empty).

#### Green: Create `prompt/embed.go` and `prompt/gen_prompts.go`

Follow **[go-generate-embed](style-anchors/go-generate-embed.md)**.

Create `prompt/embed.go`:
```go
package prompt

//go:generate go run gen_prompts.go

var content map[string]string
```

Create `prompt/gen_prompts.go` (with `//go:build ignore` tag):
- Reads `../skills/*/SKILL.md`
- Strips frontmatter using inline copy of the same logic
- Writes `content_generated.go` with `init()` function
- Sorted output for deterministic diffs

Run: `go generate ./prompt/...`
Run: `go test ./prompt/...` — all tests pass now.

#### Refactor

- Extract frontmatter logic to shared helper if needed
- Verify generated file is deterministic (run generate twice, diff)

**Estimated:** 60 min

---

### Task 0-3: Add `prompt` subcommand to CLI (TDD)

**Style Anchors:** `cobra-command-pattern`, `table-driven-tests`
**Files:** `cmd/prompt_test.go`, `cmd/root.go` (modify)
**TDD Discipline:** Write command tests first, then add command to root.

#### Red: Write `cmd/prompt_test.go` first

Follow **[table-driven-tests](style-anchors/table-driven-tests.md)**.

```go
package cmd

import (
    "bytes"
    "strings"
    "testing"
)

func TestPromptListCommand(t *testing.T) {
    buf := new(bytes.Buffer)
    root := NewRootCmd()
    root.SetOut(buf)
    root.SetErr(buf)
    root.SetArgs([]string{"prompt", "--list"})

    err := root.Execute()
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }

    out := buf.String()
    expected := []string{
        "gap-analysis-worksheet",
        "business-requirements-interview",
        "technical-requirements-interview",
        "implementation-planner",
    }
    for _, name := range expected {
        if !strings.Contains(out, name) {
            t.Errorf("expected %q in output, got:\n%s", name, out)
        }
    }
}

func TestPromptCommandSuccess(t *testing.T) {
    buf := new(bytes.Buffer)
    root := NewRootCmd()
    root.SetOut(buf)
    root.SetErr(buf)
    root.SetArgs([]string{"prompt", "-t", "business-requirements-interview"})

    err := root.Execute()
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }

    out := buf.String()
    if len(out) < 100 {
        t.Errorf("output suspiciously short (%d bytes)", len(out))
    }
    if strings.Contains(out, "---") && strings.Contains(out, "name:") {
        t.Error("frontmatter not stripped from output")
    }
}

func TestPromptCommandErrors(t *testing.T) {
    tests := []struct {
        name    string
        args    []string
        wantErr bool
    }{
        {
            name:    "missing type and no list flag",
            args:    []string{"prompt"},
            wantErr: true,
        },
        {
            name:    "unknown type",
            args:    []string{"prompt", "-t", "nonexistent"},
            wantErr: true,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            cmd := NewRootCmd()
            buf := new(bytes.Buffer)
            cmd.SetOut(buf)
            cmd.SetErr(buf)
            cmd.SetArgs(tt.args)

            err := cmd.Execute()
            if tt.wantErr && err == nil {
                t.Errorf("expected error, got none")
            }
            if !tt.wantErr && err != nil {
                t.Errorf("unexpected error: %v", err)
            }
        })
    }
}

func TestPromptAllTypes(t *testing.T) {
    prompts := []string{
        "gap-analysis-worksheet",
        "business-requirements-interview",
        "technical-requirements-interview",
        "style-anchors-collection",
        "implementation-planner",
        "implementation-plan-review",
        "definition-of-done",
        "architecture-decision-record",
        "delivery-timeline",
        "qa-test-plan",
        "developer-summary",
        "executive-summary",
    }

    for _, name := range prompts {
        t.Run(name, func(t *testing.T) {
            cmd := NewRootCmd()
            buf := new(bytes.Buffer)
            cmd.SetOut(buf)
            cmd.SetErr(buf)
            cmd.SetArgs([]string{"prompt", "-t", name})

            err := cmd.Execute()
            if err != nil {
                t.Errorf("unexpected error for %s: %v", name, err)
            }

            out := buf.String()
            if len(out) < 50 {
                t.Errorf("output for %s suspiciously short (%d bytes)", name, len(out))
            }
        })
    }
}
```

Run: `go test ./cmd/...` — fails (`prompt` command doesn't exist).

#### Green: Add `newPromptCmd()` to `cmd/root.go`

Follow **[cobra-command-pattern](style-anchors/cobra-command-pattern.md)**.

Add to `NewRootCmd()`:
```go
root.AddCommand(newPromptCmd())
```

Implement `newPromptCmd()`, `runPromptList()`, and `runPrompt()` per the cobra-command-pattern anchor.

Run: `go test ./cmd/...` — all tests pass.

#### Refactor

- Ensure consistent error messages with existing commands
- Verify `--list` output formatting matches `types` command style

**Estimated:** 45 min

---

### Task 0-4: Integration tests for `sherpy prompt` (TDD)

**Style Anchor:** `integration-test-binary`
**File:** `integration/integration_test.go` (modify)
**TDD Discipline:** Write integration tests, run against built binary.

Add to `integration/integration_test.go`:

```go
func TestPromptListCommand(t *testing.T) {
    binary := findBinary(t)

    cmd := exec.Command(binary, "prompt", "--list")
    output, err := cmd.CombinedOutput()
    if err != nil {
        t.Fatalf("prompt --list failed: %v\n%s", err, string(output))
    }

    expected := []string{
        "business-requirements-interview",
        "implementation-planner",
        "qa-test-plan",
    }
    for _, name := range expected {
        if !strings.Contains(string(output), name) {
            t.Errorf("expected %s in prompt list output", name)
        }
    }
}

func TestPromptOutputsContent(t *testing.T) {
    binary := findBinary(t)

    cmd := exec.Command(binary, "prompt", "-t", "business-requirements-interview")
    output, err := cmd.CombinedOutput()
    if err != nil {
        t.Fatalf("prompt -t failed: %v\n%s", err, string(output))
    }

    if len(output) < 100 {
        t.Errorf("output suspiciously short (%d bytes)", len(output))
    }
}

func TestPromptUnknownType(t *testing.T) {
    binary := findBinary(t)

    cmd := exec.Command(binary, "prompt", "-t", "nonexistent")
    output, err := cmd.CombinedOutput()
    if err == nil {
        t.Fatal("expected error for unknown prompt type")
    }

    if !strings.Contains(string(output), "unknown") {
        t.Errorf("expected 'unknown' in error output, got: %s", string(output))
    }
}
```

Run: `make build && go test ./integration/...`

**Estimated:** 20 min

---

### Task 0-5: Update Makefile

**File:** `Makefile` (modify)

Add `generate` target and update dependencies:

```makefile
generate: ## Generate embedded prompt content
	$(GOCMD) generate ./prompt/...

build: generate ## Generate + build the binary
	$(GOBUILD) -o $(BINARY_NAME) -v .

test: generate ## Run all tests
	$(GOTEST) ./... -v -count=1
```

Run: `make generate && make build && make test`

**Estimated:** 15 min

---

### Task 0-6: Update CLI help and documentation

**Files to update:**
- `USAGE.md` — add `sherpy prompt` section with examples
- `README.md` — mention prompt command in features list
- `skills/sherpy-cli/SKILL.md` — add `sherpy prompt` to usage section

**Estimated:** 30 min

---

## Milestone 1: `sherpy-cli-planner` Skill

**Goal:** Create a thin skill that replaces 14 individual skill files for CLI users.

### Task 1-1: Create `sherpy-cli-planner` skill

**File:** `skills/sherpy-cli-planner/SKILL.md` (~350 lines)

Structure modeled on `skills/sherpy-flow/SKILL.md` but replacing `/skill-name` invocations with `sherpy prompt -t <name>` calls:

```yaml
---
name: sherpy-cli-planner
description: Orchestrates the full Sherpy planning workflow using the Sherpy CLI. Requires the sherpy CLI to be installed. Replaces the need for 14 individual skill files by loading step-specific instructions on demand via `sherpy prompt`. Detects existing artifacts, shows visual pipeline status, and guides through each step in sequence.
user-invocable: true
---
```

Key differences from `sherpy-flow`:

1. **Prerequisites section** — lists `sherpy` CLI as required, shows install command
2. **Step execution** — instead of `"/gap-analysis-worksheet"`, uses:
   ```
   Run: sherpy prompt -t gap-analysis-worksheet
   Follow the instructions output by that command.
   ```
3. **Same pipeline steps** as sherpy-flow (steps 1-12)
4. **Same confirmation rules** — never auto-advance
5. **Same artifact detection** — same file locations
6. **Validation integration** — after each step that produces YAML, run `sherpy validate`
7. **Smaller** — no inline interview questions or template content

Content outline:

```
# Sherpy CLI Planner
## Prerequisites
  - sherpy CLI installed (sherpy --help to verify)
  - Install: go install github.com/kydavis/sherpy@latest
## Usage
  /sherpy-cli-planner [output-directory]
## The Pipeline (same table as sherpy-flow)
## Process
  ### Step 0: Verify CLI (sherpy prompt --list)
  ### Step 1: Scan + Status (same as sherpy-flow)
  ### Step 2: Show Pipeline Status (same as sherpy-flow)
  ### Step 3: Execute Each Step
    For each step:
      1. Run `sherpy prompt -t <step-name>`
      2. Follow the printed instructions
      3. After completion, validate output (if YAML):
         `sherpy validate -t <type> -f <output-file> --strict`
      4. Ask user to confirm before next step
  ### Step 4: Final Summary (same as sherpy-flow)
## Transition Rules (same as sherpy-flow)
## CLI Reference
  - sherpy prompt --list
  - sherpy prompt -t <name>
  - sherpy validate -t <type> -f <file> --strict
```

After creating, re-run `go generate ./prompt/...` to include the new skill in the prompt registry (or exclude it — the planner skill itself shouldn't be a loadable prompt since it's the orchestrator).

**Estimated:** 90 min

---

### Task 1-2: Update `sherpy-cli` skill to reference planner

**File:** `skills/sherpy-cli/SKILL.md` (modify, add ~15 lines)

Add to "Related Skills" section:
```markdown
- **sherpy-cli-planner** - Orchestrates full planning workflow via `sherpy prompt` (CLI-only alternative to installing 14 individual skills)
```

Add to "Usage" section, after "List Document Types":
```markdown
### Load Skill Prompt Instructions

```bash
# List available prompts
sherpy prompt --list

# Output specific skill instructions (for AI agents)
sherpy prompt -t business-requirements-interview
sherpy prompt -t implementation-planner
```
```

**Estimated:** 15 min

---

## Summary

| Milestone | Tasks | Estimated Time |
|---|---|---|
| M0: `sherpy prompt` command | 6 tasks | ~3.5 hours |
| M1: `sherpy-cli-planner` skill | 2 tasks | ~1.75 hours |
| **Total** | **8 tasks** | **~5.25 hours** |

### TDD Flow Per Task

Every code task follows this discipline:

1. **Red** — Write failing tests that define the desired behavior
2. **Run** — Confirm tests fail (compilation error or test failure)
3. **Green** — Write minimum production code to make tests pass
4. **Run** — Confirm tests pass
5. **Refactor** — Clean up, remove duplication, improve naming
6. **Run** — Confirm tests still pass

### File Changes Summary

| Action | File | Lines (est.) |
|---|---|---|
| Create | `prompt/registry.go` | ~100 |
| Create | `prompt/registry_test.go` | ~80 |
| Create | `prompt/embed.go` | ~10 |
| Create | `prompt/gen_prompts.go` | ~80 |
| Create | `prompt/content_generated.go` | ~5000 (generated) |
| Create | `cmd/prompt_test.go` | ~100 |
| Modify | `cmd/root.go` | +40 |
| Modify | `integration/integration_test.go` | +40 |
| Modify | `Makefile` | +8 |
| Create | `skills/sherpy-cli-planner/SKILL.md` | ~350 |
| Modify | `skills/sherpy-cli/SKILL.md` | +15 |
| Modify | `USAGE.md` | +20 |
| Modify | `README.md` | +5 |

### Not Changed (intentionally)

- **All 16 existing `skills/` directories** — untouched, still work for non-CLI users
- **`schema/` package** — no changes to validation
- **`markdown/` package** — no changes to conversion
- **`sherpy-flow` skill** — continues to work for non-CLI users who have all skills installed
- **`.agents/skills/`** — external Go skills, unrelated

### Token Savings for CLI Users

| Metric | Before | After |
|---|---|---|
| Skill files to install | 16 | 2 (`sherpy-cli` + `sherpy-cli-planner`) |
| Skill content on disk | 5,510 lines / 720K | ~960 lines / ~80K |
| Instructions loaded on demand | Never | Per-step via `sherpy prompt` |
| Pipeline steps available | Same 12 steps | Same 12 steps |
