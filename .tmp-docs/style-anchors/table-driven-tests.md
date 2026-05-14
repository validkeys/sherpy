---
id: table-driven-tests
name: Table-Driven Tests
category: testing
tags: [testing, table-driven, subtests, t.Run, testify]
created: 2026-05-14
---

# Table-Driven Tests

## Overview

The standard Go table-driven test pattern used throughout Sherpy. Tests are defined as slices of anonymous structs with `name`, input fields, and `wantErr`/`wantOutput` expectations, then iterated with `t.Run()` for subtest isolation.

## Source Reference

- `cmd/root_test.go:81-135` — `TestValidatePathTraversal` (error/no-error table)
- `cmd/root_test.go:230-292` — `TestToMarkdownCommand` (args/output/error table)
- `integration/integration_test.go:136-171` — `TestValidateErrors` (integration table)

## Code Example

### Pattern 1: Error/No-Error Table

```go
func TestValidatePathTraversal(t *testing.T) {
    tests := []struct {
        name    string
        path    string
        wantErr bool
    }{
        {
            name:    "normal relative path",
            path:    "test.yaml",
            wantErr: false,
        },
        {
            name:    "path with multiple parent directories",
            path:    "../../etc/passwd",
            wantErr: true,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := validatePath(tt.path)
            if tt.wantErr && err == nil {
                t.Errorf("expected error for path %q, got none", tt.path)
            }
            if !tt.wantErr && err != nil {
                t.Errorf("unexpected error for path %q: %v", tt.path, err)
            }
        })
    }
}
```

### Pattern 2: Command Output Table

```go
func TestToMarkdownCommand(t *testing.T) {
    tests := []struct {
        name       string
        args       []string
        wantOutput string
        wantErr    bool
    }{
        {
            name:       "success with stdout",
            args:       []string{"to-markdown", "-t", "business-requirements", "-f", "../docs/specifications/business-requirements/example.yaml"},
            wantOutput: "# Business Requirements",
            wantErr:    false,
        },
        {
            name:    "missing type flag",
            args:    []string{"to-markdown", "-f", "test.yaml"},
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

            if tt.wantErr {
                if err == nil {
                    t.Errorf("expected error, got none")
                }
                return
            }

            if err != nil {
                t.Errorf("unexpected error: %v", err)
            }

            output := buf.String()
            if !strings.Contains(output, tt.wantOutput) {
                t.Errorf("output missing expected content %q\nGot: %s", tt.wantOutput, output)
            }
        })
    }
}
```

## What This Demonstrates

- Anonymous struct slice for test cases — no named types needed
- `t.Run(tt.name, ...)` for subtest isolation and `-run` filtering
- Early `return` after error assertion to avoid nil dereference
- `strings.Contains` for output assertions (not exact match — too brittle)
- `new(bytes.Buffer)` for capturing command output
- Both `cmd.SetOut(buf)` AND `cmd.SetErr(buf)` to capture all output

## When to Use

- Every test that has more than 2 input/output combinations
- Command tests, validation tests, integration tests
- When test names describe the scenario, not the implementation

## Pattern Requirements

- ✓ MUST use `[]struct{...}` slice, not a named type
- ✓ MUST include `name` field as first field in struct
- ✓ MUST use `t.Run(tt.name, func(t *testing.T) {...})` for each case
- ✓ MUST use `return` after `wantErr` check to prevent fall-through
- ✓ MUST set BOTH `cmd.SetOut(buf)` and `cmd.SetErr(buf)` for command tests
- ✓ Use `strings.Contains` for output assertions, not exact equality
- ✓ Test name should describe scenario: "missing type flag", not "test 1"

## Common Mistakes to Avoid

- ❌ Using `t.Fatal` inside `t.Run` — it only stops the subtest, not the parent (this is actually correct behavior — but be aware)
- ❌ Capturing `tt` variable in closure without `tt := tt` (not needed in Go 1.22+, but required in older versions)
- ❌ Forgetting `return` after error check — causes nil pointer dereference on success path assertions
- ❌ Using exact string match for output — breaks when formatting changes
