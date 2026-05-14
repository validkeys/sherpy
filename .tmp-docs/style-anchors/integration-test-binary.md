---
id: integration-test-binary
name: Integration Test Binary Pattern
category: testing
tags: [integration, binary, exec, end-to-end, subprocess]
created: 2026-05-14
---

# Integration Test Binary Pattern

## Overview

Integration tests that build and execute the actual `sherpy` binary as a subprocess using `os/exec`. Tests run in `integration/` package (separate from unit tests) and use a `findBinary()` helper to locate or build the binary.

## Source Reference

- `integration/integration_test.go:1-194` — full integration test suite
- `integration/integration_test.go:174-194` — `findBinary()` helper

## Code Example

```go
package integration

import (
    "os"
    "os/exec"
    "path/filepath"
    "strings"
    "testing"
)

var exampleFiles = []struct {
    docType  string
    filePath string
}{
    {"business-requirements", "../docs/specifications/business-requirements/example.yaml"},
    {"technical-requirements", "../docs/specifications/technical-requirements/example.yaml"},
}

func TestValidateAllExamples(t *testing.T) {
    binary := findBinary(t)

    for _, tc := range exampleFiles {
        t.Run(tc.docType, func(t *testing.T) {
            if _, err := os.Stat(tc.filePath); os.IsNotExist(err) {
                t.Skipf("Example file not found: %s", tc.filePath)
            }

            cmd := exec.Command(binary, "validate", "-t", tc.docType, "-f", tc.filePath)
            output, err := cmd.CombinedOutput()
            if err != nil {
                t.Errorf("Validation failed for %s:\n%s", tc.docType, string(output))
            }

            if !strings.Contains(string(output), "✓") && !strings.Contains(string(output), "valid") {
                t.Errorf("Expected success message in output for %s, got:\n%s", tc.docType, string(output))
            }
        })
    }
}

func findBinary(t *testing.T) string {
    t.Helper()

    if _, err := os.Stat("./sherpy"); err == nil {
        return "./sherpy"
    }
    if _, err := os.Stat("../sherpy"); err == nil {
        return "../sherpy"
    }

    cmd := exec.Command("go", "build", "-o", "sherpy", "..")
    if err := cmd.Run(); err != nil {
        t.Fatalf("Failed to build sherpy binary: %v", err)
    }

    return "./sherpy"
}
```

## What This Demonstrates

- Separate `integration` package — tests binary, not internal packages
- `findBinary()` with fallback: current dir → parent dir → build from source
- `exec.Command` with `CombinedOutput()` to capture both stdout and stderr
- `t.Skipf()` for missing test data files (not a failure)
- Table-driven test cases for multiple document types
- Binary path resolution using `t.Helper()` for better error reporting

## When to Use

- When testing the CLI binary end-to-end (not unit testing internal functions)
- When verifying that build artifacts work correctly
- When testing error handling of the actual compiled binary

## Pattern Requirements

- ✓ MUST be in separate `integration` package (not `cmd` or `schema`)
- ✓ MUST use `findBinary()` helper with build fallback
- ✓ MUST use `t.Helper()` on `findBinary` for proper error line numbers
- ✓ MUST use `t.Skipf()` for missing test data (not `t.Fatal`)
- ✓ MUST use `cmd.CombinedOutput()` to capture all output
- ✓ MUST convert `output` (byte slice) with `string(output)` before assertions
- ✓ Table cases for testing multiple document types

## Common Mistakes to Avoid

- ❌ Using `cmd.Output()` instead of `CombinedOutput()` — misses stderr
- ❌ Using `t.Fatal` for missing test data — fails CI, not a code bug
- ❌ Forgetting `t.Helper()` on helper functions — wrong line numbers in failures
- ❌ Hardcoding binary path — breaks in different build environments
- ❌ Running integration tests without building first — `findBinary` handles this but slower
