# Sherpy CLI - Implementation Plan for Code Review Fixes

**Project**: Sherpy CLI - YAML Validation & Markdown Conversion Tool  
**Review Document**: `.tmp-docs/code-reviews/sherpy-comprehensive-code-review.md`  
**Plan Date**: May 13, 2026  
**Estimated Timeline**: 2-3 weeks to production-ready  
**Overall Grade**: B+ (83/100)

---

## Executive Summary

This implementation plan addresses **24 identified issues** across security, error handling, code quality, and testing. Issues are organized into 6 phases prioritized by severity and impact.

**Total Effort**: 15-21 days
- **Critical (Phase 1-2)**: 3-5 days - MUST complete before production
- **High Priority (Phase 3-4)**: 8-11 days - Should complete for maintainability
- **Medium Priority (Phase 5-6)**: 4-5 days - Nice to have improvements

---

## Phase 1: Critical Security Fixes

**Priority**: 1 (CRITICAL)  
**Estimated Time**: 2-3 days  
**Must complete before production deployment**

### Task 1.1: Path Traversal Protection

**Issue**: User-supplied file paths passed directly to `os.ReadFile()` and `os.WriteFile()` without validation. Attackers can read/write arbitrary files.

**Files to Modify**:
- `cmd/root.go:82` - validate command input path
- `cmd/root.go:145` - to-markdown command input path
- `cmd/root.go:154` - to-markdown command output path

**Implementation**:

```go
// Add to cmd/root.go
func validatePath(path string) error {
    // Clean the path
    cleaned := filepath.Clean(path)
    
    // Convert to absolute
    abs, err := filepath.Abs(cleaned)
    if err != nil {
        return fmt.Errorf("invalid path: %w", err)
    }
    
    // Check for path traversal attempts
    if strings.Contains(cleaned, "..") {
        return fmt.Errorf("path traversal detected: %s", path)
    }
    
    // Optionally: restrict to specific directories
    // allowed := "/workspace/docs"
    // if !strings.HasPrefix(abs, allowed) {
    //     return fmt.Errorf("path outside allowed directory")
    // }
    
    return nil
}
```

**Apply validation before all file operations**:

```go
// In runValidate (line 82)
if err := validatePath(filename); err != nil {
    return err
}
data, err := os.ReadFile(filename)

// In runToMarkdown (lines 145, 154)
if err := validatePath(filename); err != nil {
    return err
}
if output != "" {
    if err := validatePath(output); err != nil {
        return err
    }
}
```

**Testing**:
- Add test cases for `../../../etc/passwd`
- Test absolute paths outside project
- Test symlinks
- Test normal valid paths still work

---

### Task 1.2: File Size Limits

**Issue**: Files read entirely into memory without size checks. Attackers can exhaust memory with multi-GB files.

**Files to Modify**:
- `cmd/root.go:82` - validate command
- `cmd/root.go:145` - to-markdown command

**Implementation**:

```go
// Add to cmd/root.go
const MaxFileSize = 10 * 1024 * 1024 // 10MB

func readFileWithLimit(filename string) ([]byte, error) {
    // Validate path first
    if err := validatePath(filename); err != nil {
        return nil, err
    }
    
    // Check size before reading
    info, err := os.Stat(filename)
    if err != nil {
        return nil, fmt.Errorf("failed to stat file: %w", err)
    }
    
    if info.Size() > MaxFileSize {
        return nil, fmt.Errorf("file too large: %d bytes (max %d)", info.Size(), MaxFileSize)
    }
    
    // Size is OK, read the file
    data, err := os.ReadFile(filename)
    if err != nil {
        return nil, fmt.Errorf("failed to read file: %w", err)
    }
    
    return data, nil
}
```

**Replace all os.ReadFile calls**:

```go
// Old:
data, err := os.ReadFile(filename)

// New:
data, err := readFileWithLimit(filename)
```

**Testing**:
- Create 11MB test file, verify rejection
- Create 9MB test file, verify success
- Test with empty file (0 bytes)

---

### Task 1.3: YAML Bomb Protection

**Issue**: `yaml.Unmarshal()` lacks depth/size limits. Malicious YAML with recursive anchors can exhaust CPU/memory.

**Files to Modify**:
- All validators in `schema/*.go` that call `yaml.Unmarshal()`

**Implementation Option 1 - Pre-validation**:

```go
// Add to schema package
func validateYAMLStructure(data []byte) error {
    // Check for excessive repetition (simple heuristic)
    if bytes.Count(data, []byte("&")) > 100 {
        return fmt.Errorf("YAML contains suspicious number of anchors")
    }
    
    // Check total size after normalization
    if len(data) > 5*1024*1024 { // 5MB
        return fmt.Errorf("YAML too large after normalization")
    }
    
    return nil
}

// In each validator function, before yaml.Unmarshal:
if err := validateYAMLStructure(data); err != nil {
    return nil, fmt.Errorf("invalid YAML structure: %w", err)
}
```

**Implementation Option 2 - Custom Decoder** (more robust):

```go
import "io"

func unmarshalWithLimits(data []byte, v interface{}) error {
    decoder := yaml.NewDecoder(bytes.NewReader(data))
    
    // Limit parsing depth
    // Note: yaml.v3 doesn't expose depth limits directly
    // This is a limitation of the library
    
    if err := decoder.Decode(v); err != nil {
        return err
    }
    
    return nil
}
```

**Recommendation**: Start with Option 1 (simple heuristics), monitor for issues, upgrade to custom parser if needed.

**Testing**:
- Create YAML with recursive anchors
- Test deeply nested structures (50+ levels)
- Benchmark with large valid YAML files

---

## Phase 2: Error Handling Fixes

**Priority**: 1 (CRITICAL)  
**Estimated Time**: 1-2 days  
**Required for testability and robustness**

### Task 2.1: Remove os.Exit() from runValidate

**Issue**: `os.Exit(1)` inside `runValidate()` bypasses Cobra's error handling, prevents deferred cleanup, and breaks testing.

**File to Modify**:
- `cmd/root.go:96-97`

**Current Code**:
```go
if !result.Valid() || (strict && len(result.Warnings) > 0) {
    os.Exit(1)
}
return nil
```

**Fixed Code**:
```go
if !result.Valid() || (strict && len(result.Warnings) > 0) {
    return fmt.Errorf("validation failed")
}
return nil
```

**Update Execute() to handle exit codes**:
```go
// In cmd/root.go Execute()
func Execute() {
    root := NewRootCmd()
    if err := root.Execute(); err != nil {
        fmt.Fprintf(os.Stderr, "Error: %v\n", err)
        // Check error type for specific exit codes
        if strings.Contains(err.Error(), "validation failed") {
            os.Exit(1)
        }
        os.Exit(2) // Other errors
    }
}
```

**Testing**:
- Test validation failures return error (not exit)
- Test error message propagation
- Test exit codes in integration tests

---

### Task 2.2: Template Panic Recovery

**Issue**: Template execution panics (e.g., nil pointer dereference) are not recovered, causing program crash.

**File to Modify**:
- `markdown/converter.go:56-66`

**Current Code**:
```go
func execTemplate(name, text string, data interface{}) (string, error) {
    tmpl, err := template.New(name).Funcs(funcMap).Parse(text)
    if err != nil {
        return "", fmt.Errorf("template parse error: %w", err)
    }
    var buf strings.Builder
    if err := tmpl.Execute(&buf, data); err != nil {
        return "", fmt.Errorf("template execute error: %w", err)
    }
    return buf.String(), nil
}
```

**Fixed Code**:
```go
func execTemplate(name, text string, data interface{}) (result string, err error) {
    defer func() {
        if r := recover(); r != nil {
            err = fmt.Errorf("template execution panic: %v", r)
        }
    }()
    
    tmpl, err := template.New(name).Funcs(funcMap).Parse(text)
    if err != nil {
        return "", fmt.Errorf("template parse error: %w", err)
    }
    
    var buf strings.Builder
    if err := tmpl.Execute(&buf, data); err != nil {
        return "", fmt.Errorf("template execute error: %w", err)
    }
    
    return buf.String(), nil
}
```

**Testing**:
- Create YAML with nil pointer scenarios
- Test template with missing required fields
- Verify panic converts to error, not crash

---

### Task 2.3: Improve Error Context

**Issue**: Error messages lack context, making debugging difficult for users.

**Files to Modify**:
- `cmd/root.go:154` - WriteFile error
- `cmd/root.go:130-135` - Execute error printing
- Various validators - error message standardization

**Implementation**:

```go
// cmd/root.go:154 - Wrap WriteFile error
if output != "" {
    if err := os.WriteFile(output, []byte(md), 0644); err != nil {
        return fmt.Errorf("failed to write output file %q: %w", output, err)
    }
    return nil
}

// cmd/root.go:130-135 - Print errors before exit
func Execute() {
    root := NewRootCmd()
    if err := root.Execute(); err != nil {
        // Error is already printed by Cobra, but ensure stderr output
        fmt.Fprintf(os.Stderr, "Error: %v\n", err)
        os.Exit(1)
    }
}

// Standardize validation error format across all validators
// From: "project is required"
// To: "project: field is required"
// From: "failed to parse YAML"
// To: "YAML parsing failed: <reason>"
```

**Create error formatting helpers**:

```go
// Add to schema/validation_helpers.go (created in Phase 3)
func fieldRequiredError(fieldName string) string {
    return fmt.Sprintf("%s: field is required", fieldName)
}

func fieldInvalidError(fieldName, reason string) string {
    return fmt.Sprintf("%s: %s", fieldName, reason)
}
```

**Testing**:
- Verify all error messages have context
- Check error messages are consistent
- Test that file paths in errors are sanitized (security)

---

## Phase 3: Code Duplication Cleanup

**Priority**: 2 (HIGH)  
**Estimated Time**: 3-4 days  
**Reduces maintenance burden, improves consistency**

### Task 3.1: Extract Validation Helpers

**Issue**: Metadata validation duplicated across 6+ validators. Pattern occurs 77 times for `strings.TrimSpace` and 176 times for `r.Errors = append`.

**New File to Create**:
- `schema/validation_helpers.go`

**Implementation**:

```go
// schema/validation_helpers.go
package schema

import "strings"

// validateRequiredField checks if a string field is non-empty after trimming whitespace
func validateRequiredField(r *ValidationResult, value, fieldName string) {
    if strings.TrimSpace(value) == "" {
        r.Errors = append(r.Errors, fieldRequiredError(fieldName))
    }
}

// validateRequiredFields validates multiple required string fields
func validateRequiredFields(r *ValidationResult, fields map[string]string) {
    for fieldName, value := range fields {
        validateRequiredField(r, value, fieldName)
    }
}

// validateStringLength checks if a string meets minimum length requirement
func validateStringLength(r *ValidationResult, value, fieldName string, minLength int) {
    trimmed := strings.TrimSpace(value)
    if len(trimmed) > 0 && len(trimmed) < minLength {
        r.Errors = append(r.Errors, fmt.Sprintf("%s: must be at least %d characters (got %d)", 
            fieldName, minLength, len(trimmed)))
    }
}

// validateEnum checks if value is in allowed set
func validateEnum(r *ValidationResult, value, fieldName string, allowedValues map[string]struct{}) {
    if _, ok := allowedValues[value]; !ok {
        allowed := make([]string, 0, len(allowedValues))
        for k := range allowedValues {
            allowed = append(allowed, k)
        }
        r.Errors = append(r.Errors, fmt.Sprintf("%s: must be one of %v (got %q)", 
            fieldName, allowed, value))
    }
}

// validateSequentialIDs checks that IDs follow sequential pattern (e.g., FR-001, FR-002, FR-003)
func validateSequentialIDs(r *ValidationResult, ids []string, pattern *regexp.Regexp, typeName string) {
    for i, id := range ids {
        matches := pattern.FindStringSubmatch(id)
        if len(matches) != 2 {
            r.Errors = append(r.Errors, fmt.Sprintf("%s: invalid ID format: %s", typeName, id))
            continue
        }
        
        num, _ := strconv.Atoi(matches[1])
        expected := i + 1
        if num != expected {
            r.Errors = append(r.Errors, fmt.Sprintf("%s: IDs must be sequential (expected %s-%03d, got %s)", 
                typeName, typeName, expected, id))
        }
    }
}

// Helper for error messages
func fieldRequiredError(fieldName string) string {
    return fmt.Sprintf("%s: field is required", fieldName)
}
```

**Refactor validators to use helpers**:

```go
// Before (in business_requirements.go):
func validateBRMetadata(doc BusinessRequirements, r *ValidationResult) {
    if strings.TrimSpace(doc.Project) == "" {
        r.Errors = append(r.Errors, "project is required")
    }
    if strings.TrimSpace(doc.Version) == "" {
        r.Errors = append(r.Errors, "version is required")
    }
    if strings.TrimSpace(doc.Generated) == "" {
        r.Errors = append(r.Errors, "generated is required")
    }
}

// After:
func validateBRMetadata(doc BusinessRequirements, r *ValidationResult) {
    validateRequiredFields(r, map[string]string{
        "project":   doc.Project,
        "version":   doc.Version,
        "generated": doc.Generated,
    })
}
```

**Files to Refactor** (apply helpers to all):
- `schema/business_requirements.go`
- `schema/technical_requirements.go`
- `schema/milestones.go`
- `schema/milestone_tasks.go`
- `schema/timeline.go`
- `schema/qa_test_plan.go`
- `schema/gap_analysis.go`

**Estimated Impact**: Remove 200-300 lines of duplicated code

**Testing**:
- Run all existing tests - they should still pass
- Add unit tests for helper functions

---

### Task 3.2: Deduplicate Circular Dependency Detection

**Issue**: DFS algorithm duplicated between `milestones.go:138-175` and `milestone_tasks.go:180-217`. Identical code except error messages.

**File to Modify**:
- `schema/validation_helpers.go` (add shared function)
- `schema/milestones.go` (use shared function)
- `schema/milestone_tasks.go` (use shared function)

**Implementation**:

```go
// Add to schema/validation_helpers.go
func detectCircularDependencies(dependencies map[string][]string) (bool, []string) {
    visited := make(map[string]bool)
    recStack := make(map[string]bool)
    cycle := []string{}
    
    var dfs func(node string) bool
    dfs = func(node string) bool {
        visited[node] = true
        recStack[node] = true
        cycle = append(cycle, node)
        
        for _, dep := range dependencies[node] {
            if !visited[dep] {
                if dfs(dep) {
                    return true
                }
            } else if recStack[dep] {
                // Found cycle
                cycleStart := 0
                for i, n := range cycle {
                    if n == dep {
                        cycleStart = i
                        break
                    }
                }
                cycle = cycle[cycleStart:]
                return true
            }
        }
        
        recStack[node] = false
        cycle = cycle[:len(cycle)-1]
        return false
    }
    
    for node := range dependencies {
        if !visited[node] {
            cycle = []string{}
            if dfs(node) {
                return true, cycle
            }
        }
    }
    
    return false, nil
}
```

**Refactor in milestones.go**:

```go
// Before (lines 138-175): ~40 lines of DFS
// After:
func validateMilestoneDependencies(milestones []Milestone, r *ValidationResult) {
    // Build adjacency list
    adj := make(map[string][]string)
    for _, m := range milestones {
        adj[m.ID] = m.DependsOn
    }
    
    // Check for cycles
    hasCycle, cycle := detectCircularDependencies(adj)
    if hasCycle {
        r.Errors = append(r.Errors, fmt.Sprintf("circular dependency detected: %s", 
            strings.Join(cycle, " -> ")))
    }
}
```

**Same pattern for milestone_tasks.go**

**Estimated Impact**: Remove ~40 lines, improve error messages with cycle path

**Testing**:
- Test cases with circular dependencies
- Test valid dependency chains
- Verify cycle path is reported correctly

---

### Task 3.3: Extract Strict Mode Logic

**Issue**: Every validator has identical strict mode code at the end.

**File to Modify**:
- `schema/format.go` (add method to ValidationResult)
- All validator functions (remove duplicated code)

**Implementation**:

```go
// Add to schema/format.go
func (r *ValidationResult) ApplyStrict() {
    if len(r.Warnings) > 0 {
        r.Errors = append(r.Errors, r.Warnings...)
        r.Warnings = nil
    }
}
```

**Refactor all validators**:

```go
// Before (in every validator):
if strict {
    result.Errors = append(result.Errors, result.Warnings...)
    result.Warnings = nil
}
return result, nil

// After:
if strict {
    result.ApplyStrict()
}
return result, nil
```

**Files to Update**:
- All 7 validator functions in `schema/` package

**Estimated Impact**: Remove ~50 lines, centralize logic

**Testing**:
- Verify strict mode behavior unchanged
- Test with warnings (should become errors in strict mode)

---

### Task 3.4: Replace Magic Numbers with Constants

**Issue**: Hardcoded validation thresholds lack explanation and are difficult to maintain.

**Files to Modify**:
- `schema/business_requirements.go`
- `schema/technical_requirements.go`
- Others with length/size validations

**Implementation**:

```go
// Add to top of business_requirements.go
const (
    MinProblemStatementLength    = 50
    MinValuePropositionLength    = 30
    MinPersonaDescriptionLength  = 20
    MinUseCaseDescriptionLength  = 30
    MinRequirementDescLength     = 20
    
    // Risk priorities
    MinRiskProbabilityPercent = 0
    MaxRiskProbabilityPercent = 100
)

var validPriorities = map[string]struct{}{
    "high":   {},
    "medium": {},
    "low":    {},
}

// Replace in code:
// Before:
if len(strings.TrimSpace(doc.Overview.Problem)) < 50 {
    r.Warnings = append(r.Warnings, "problem statement should be at least 50 characters")
}

// After:
validateStringLength(r, doc.Overview.Problem, "problem statement", MinProblemStatementLength)
```

**Similar constants for other validators**:

```go
// milestone_tasks.go
const (
    MaxTaskDurationMinutes = 120
    MinTaskDescriptionLength = 10
)

// timeline.go
const (
    MinPhaseDays = 1
    MinTotalDeliveryDays = 1
)
```

**Estimated Impact**: ~20 lines, significant readability improvement

**Testing**:
- All existing validation tests should pass
- Values are unchanged, just extracted

---

## Phase 4: Test Coverage Improvements

**Priority**: 2 (HIGH)  
**Estimated Time**: 5-7 days  
**Increases confidence and catches regressions**

### Task 4.1: Add to-markdown Command Tests

**Issue**: 40% of CLI functionality (to-markdown command) has zero test coverage in cmd package.

**File to Modify**:
- `cmd/root_test.go`

**Tests to Add**:

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
        {
            name:    "missing file flag",
            args:    []string{"to-markdown", "-t", "business-requirements"},
            wantErr: true,
        },
        {
            name:    "invalid type",
            args:    []string{"to-markdown", "-t", "invalid-type", "-f", "test.yaml"},
            wantErr: true,
        },
        {
            name:    "file not found",
            args:    []string{"to-markdown", "-t", "business-requirements", "-f", "nonexistent.yaml"},
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

func TestToMarkdownWithOutputFile(t *testing.T) {
    tmpDir := t.TempDir()
    outputFile := filepath.Join(tmpDir, "output.md")
    
    cmd := NewRootCmd()
    cmd.SetArgs([]string{
        "to-markdown",
        "-t", "business-requirements",
        "-f", "../docs/specifications/business-requirements/example.yaml",
        "-o", outputFile,
    })
    
    err := cmd.Execute()
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    
    // Verify file was created
    if _, err := os.Stat(outputFile); os.IsNotExist(err) {
        t.Errorf("output file was not created")
    }
    
    // Verify file content
    content, err := os.ReadFile(outputFile)
    if err != nil {
        t.Fatalf("failed to read output file: %v", err)
    }
    
    if !strings.Contains(string(content), "# Business Requirements") {
        t.Errorf("output file missing expected header")
    }
}

func TestToMarkdownOutputPermissionError(t *testing.T) {
    cmd := NewRootCmd()
    cmd.SetArgs([]string{
        "to-markdown",
        "-t", "business-requirements",
        "-f", "../docs/specifications/business-requirements/example.yaml",
        "-o", "/root/forbidden.md", // Typically not writable
    })
    
    err := cmd.Execute()
    if err == nil {
        t.Errorf("expected permission error, got success")
    }
}

func TestToMarkdownAllTypes(t *testing.T) {
    types := []string{
        "business-requirements",
        "technical-requirements",
        "milestones",
        "timeline",
        "qa-test-plan",
        "gap-analysis",
    }
    
    for _, docType := range types {
        t.Run(docType, func(t *testing.T) {
            examplePath := fmt.Sprintf("../docs/specifications/%s/example.yaml", docType)
            
            cmd := NewRootCmd()
            buf := new(bytes.Buffer)
            cmd.SetOut(buf)
            cmd.SetArgs([]string{"to-markdown", "-t", docType, "-f", examplePath})
            
            err := cmd.Execute()
            if err != nil {
                t.Errorf("failed to convert %s: %v", docType, err)
            }
            
            output := buf.String()
            if len(output) < 100 {
                t.Errorf("output suspiciously short (%d bytes)", len(output))
            }
        })
    }
}
```

**Estimated Impact**: Closes 40% test coverage gap in cmd package

---

### Task 4.2: Error Path Testing for Markdown

**Issue**: Only 1 test for invalid YAML across all converters. Missing template error tests.

**File to Modify**:
- `markdown/converter_test.go`

**Tests to Add**:

```go
func TestExecTemplateParseError(t *testing.T) {
    // Test with invalid template syntax
    _, err := execTemplate("test", "{{.Invalid}}", nil)
    if err == nil {
        t.Error("expected template parse error")
    }
    if !strings.Contains(err.Error(), "template parse error") {
        t.Errorf("unexpected error message: %v", err)
    }
}

func TestExecTemplateExecuteError(t *testing.T) {
    // Test with template that references missing field
    data := struct{ Name string }{"test"}
    _, err := execTemplate("test", "{{.MissingField}}", data)
    if err == nil {
        t.Error("expected template execution error")
    }
}

func TestExecTemplatePanicRecovery(t *testing.T) {
    // After implementing panic recovery in Task 2.2
    // Test with template that would cause panic
    _, err := execTemplate("test", "{{.Field.Nested}}", nil)
    if err == nil {
        t.Error("expected error from panic recovery")
    }
    if !strings.Contains(err.Error(), "panic") {
        t.Errorf("expected panic error, got: %v", err)
    }
}

func TestConvertMalformedYAML(t *testing.T) {
    converters := map[string]ConverterFunc{
        "business-requirements":   ConvertBusinessRequirements,
        "technical-requirements":  ConvertTechnicalRequirements,
        "milestones":             ConvertMilestones,
        "timeline":               ConvertTimeline,
        "qa-test-plan":           ConvertQATestPlan,
        "gap-analysis":           ConvertGapAnalysis,
    }
    
    malformedYAML := []byte("invalid: yaml: content: [missing bracket")
    
    for name, converter := range converters {
        t.Run(name, func(t *testing.T) {
            _, err := converter(malformedYAML)
            if err == nil {
                t.Errorf("%s: expected error for malformed YAML", name)
            }
        })
    }
}

func TestConvertEmptyFields(t *testing.T) {
    // Test with YAML that has required fields but they're empty
    emptyBR := `
project: ""
version: ""
generated: ""
`
    _, err := ConvertBusinessRequirements([]byte(emptyBR))
    // Should not panic, may produce valid markdown or error
    // Just ensure no panic
    _ = err
}

func TestConvertNullFields(t *testing.T) {
    // Test with YAML that has null values
    nullBR := `
project: null
version: 1.0
generated: "2024-01-01"
`
    _, err := ConvertBusinessRequirements([]byte(nullBR))
    _ = err // Should not panic
}
```

**Estimated Impact**: Catches template errors, prevents panics

---

### Task 4.3: Refactor to Table-Driven Tests

**Issue**: 21 markdown converter tests are repetitive, could be 1-2 table-driven tests.

**File to Modify**:
- `markdown/converter_test.go`

**Refactor Example**:

```go
// Before: 21 separate test functions like:
// func TestConvertBusinessRequirements(t *testing.T) { ... }
// func TestConvertTechnicalRequirements(t *testing.T) { ... }
// ... etc

// After: Single table-driven test
func TestConvertAllTypes(t *testing.T) {
    tests := []struct {
        name      string
        converter ConverterFunc
        yamlPath  string
        wantInMD  []string // Strings that should appear in output
    }{
        {
            name:      "business-requirements",
            converter: ConvertBusinessRequirements,
            yamlPath:  "../docs/specifications/business-requirements/example.yaml",
            wantInMD:  []string{"# Business Requirements", "## Project Overview", "## Personas"},
        },
        {
            name:      "technical-requirements",
            converter: ConvertTechnicalRequirements,
            yamlPath:  "../docs/specifications/technical-requirements/example.yaml",
            wantInMD:  []string{"# Technical Requirements", "## Architecture", "## Technology Stack"},
        },
        {
            name:      "milestones",
            converter: ConvertMilestones,
            yamlPath:  "../docs/specifications/milestones/example.yaml",
            wantInMD:  []string{"# Milestones", "## Milestone"},
        },
        {
            name:      "timeline",
            converter: ConvertTimeline,
            yamlPath:  "../docs/specifications/timeline/example.yaml",
            wantInMD:  []string{"# Timeline", "## Summary", "## Phases"},
        },
        {
            name:      "qa-test-plan",
            converter: ConvertQATestPlan,
            yamlPath:  "../docs/specifications/qa-test-plan/example.yaml",
            wantInMD:  []string{"# QA Test Plan", "## Test Suites"},
        },
        {
            name:      "gap-analysis",
            converter: ConvertGapAnalysis,
            yamlPath:  "../docs/specifications/gap-analysis/example.yaml",
            wantInMD:  []string{"# Gap Analysis", "## Gaps"},
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            data, err := os.ReadFile(tt.yamlPath)
            if err != nil {
                t.Fatalf("failed to read example file: %v", err)
            }
            
            md, err := tt.converter(data)
            if err != nil {
                t.Fatalf("conversion failed: %v", err)
            }
            
            for _, want := range tt.wantInMD {
                if !strings.Contains(md, want) {
                    t.Errorf("output missing %q", want)
                }
            }
            
            // Common checks
            if len(md) < 100 {
                t.Errorf("output suspiciously short: %d bytes", len(md))
            }
        })
    }
}
```

**Similar refactoring for schema validation tests**

**Estimated Impact**: Remove ~100 lines, improve maintainability

---

### Task 4.4: Create Test Fixtures

**Issue**: Tests coupled to documentation examples. Need dedicated test data.

**New Directory Structure**:
```
/workspace/testdata/
├── valid/
│   ├── business-requirements-minimal.yaml
│   ├── business-requirements-complete.yaml
│   ├── technical-requirements-minimal.yaml
│   └── ... (one per doc type)
├── invalid/
│   ├── business-requirements-missing-project.yaml
│   ├── business-requirements-invalid-fr-id.yaml
│   ├── milestones-circular-deps.yaml
│   └── ... (various error conditions)
└── edge-cases/
    ├── business-requirements-max-length.yaml
    ├── business-requirements-unicode.yaml
    ├── milestone-tasks-120min-duration.yaml
    └── ... (boundary conditions)
```

**Implementation**:

Create minimal valid fixtures:

```yaml
# testdata/valid/business-requirements-minimal.yaml
project: Test Project
version: 1.0
generated: "2024-01-01"
overview:
  problem: "This is a test problem statement that meets the minimum character requirement of fifty characters."
  value_proposition: "Value proposition with minimum thirty characters requirement."
personas:
  - id: P-001
    name: Test User
    role: Tester
    description: "A test persona description with minimum twenty characters."
use_cases:
  - id: UC-001
    name: Test Case
    actor: Test User
    description: "A test use case description."
    flow:
      - "Step 1"
functional_requirements:
  - id: FR-001
    description: "Test requirement"
    priority: high
```

Create error condition fixtures:

```yaml
# testdata/invalid/business-requirements-missing-project.yaml
# Missing project field - should error
version: 1.0
generated: "2024-01-01"
```

```yaml
# testdata/invalid/business-requirements-non-sequential-ids.yaml
project: Test
version: 1.0
generated: "2024-01-01"
functional_requirements:
  - id: FR-001
    description: "First"
  - id: FR-003  # Should be FR-002
    description: "Third"
```

**Update tests to use fixtures**:

```go
func TestValidateBusinessRequirementsWithFixtures(t *testing.T) {
    tests := []struct {
        name      string
        fixture   string
        wantValid bool
        wantError string
    }{
        {
            name:      "minimal valid",
            fixture:   "testdata/valid/business-requirements-minimal.yaml",
            wantValid: true,
        },
        {
            name:      "missing project",
            fixture:   "testdata/invalid/business-requirements-missing-project.yaml",
            wantValid: false,
            wantError: "project: field is required",
        },
        {
            name:      "non-sequential IDs",
            fixture:   "testdata/invalid/business-requirements-non-sequential-ids.yaml",
            wantValid: false,
            wantError: "IDs must be sequential",
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            data, _ := os.ReadFile(tt.fixture)
            result, err := ValidateBusinessRequirements(data, false)
            
            if err != nil {
                t.Fatalf("unexpected error: %v", err)
            }
            
            if result.Valid() != tt.wantValid {
                t.Errorf("valid = %v, want %v", result.Valid(), tt.wantValid)
            }
            
            if tt.wantError != "" {
                found := false
                for _, e := range result.Errors {
                    if strings.Contains(e, tt.wantError) {
                        found = true
                        break
                    }
                }
                if !found {
                    t.Errorf("expected error containing %q, got %v", tt.wantError, result.Errors)
                }
            }
        })
    }
}
```

**Estimated Impact**: Decouples tests from docs, enables comprehensive error testing

---

### Task 4.5: Edge Case Coverage

**Issue**: Missing tests for boundary values, special characters, and limits.

**Tests to Add**:

```go
func TestEdgeCases(t *testing.T) {
    t.Run("max task duration", func(t *testing.T) {
        yaml := `
project: Test
version: 1.0
milestone_id: M-001
tasks:
  - id: T-001
    description: Test
    type: feature
    duration_minutes: 120  # Exactly at limit
    depends_on: []
`
        result, _ := ValidateMilestoneTasks([]byte(yaml), false)
        if !result.Valid() {
            t.Errorf("120 minutes should be valid, got errors: %v", result.Errors)
        }
    })
    
    t.Run("over max task duration", func(t *testing.T) {
        yaml := `
project: Test
version: 1.0
milestone_id: M-001
tasks:
  - id: T-001
    description: Test
    type: feature
    duration_minutes: 121  # Over limit
    depends_on: []
`
        result, _ := ValidateMilestoneTasks([]byte(yaml), false)
        if result.Valid() {
            t.Errorf("121 minutes should be invalid")
        }
    })
    
    t.Run("unicode characters", func(t *testing.T) {
        yaml := `
project: "Test 日本語 Проект"
version: "1.0"
generated: "2024-01-01"
overview:
  problem: "Problem with émojis 🚀 and special chars: <>&\"' that meets minimum length"
  value_proposition: "Unicode support αβγ with minimum length requirement."
personas:
  - id: P-001
    name: "用户"
    role: "Tester"
    description: "Description with 中文字符 and minimum length."
`
        result, err := ValidateBusinessRequirements([]byte(yaml), false)
        if err != nil {
            t.Errorf("unicode should be supported: %v", err)
        }
        if !result.Valid() {
            t.Errorf("valid unicode YAML failed: %v", result.Errors)
        }
    })
    
    t.Run("very long strings", func(t *testing.T) {
        longString := strings.Repeat("a", 10000)
        yaml := fmt.Sprintf(`
project: Test
version: 1.0
generated: "2024-01-01"
overview:
  problem: "%s"
  value_proposition: "Value proposition minimum length."
`, longString)
        
        result, err := ValidateBusinessRequirements([]byte(yaml), false)
        // Should handle without crashing
        _ = result
        _ = err
    })
    
    t.Run("empty arrays vs missing arrays", func(t *testing.T) {
        // Empty array
        yaml1 := `
project: Test
version: 1.0
generated: "2024-01-01"
functional_requirements: []
`
        result1, _ := ValidateBusinessRequirements([]byte(yaml1), false)
        
        // Missing array
        yaml2 := `
project: Test
version: 1.0
generated: "2024-01-01"
`
        result2, _ := ValidateBusinessRequirements([]byte(yaml2), false)
        
        // Both should be handled (may produce warnings)
        _ = result1
        _ = result2
    })
    
    t.Run("duplicate IDs", func(t *testing.T) {
        yaml := `
project: Test
version: 1.0
functional_requirements:
  - id: FR-001
    description: "First"
  - id: FR-001  # Duplicate
    description: "Duplicate"
`
        result, _ := ValidateBusinessRequirements([]byte(yaml), false)
        // Should detect duplicate (if implemented)
        _ = result
    })
}
```

**Estimated Impact**: Catches edge case bugs before production

---

## Phase 5: Medium Priority Security

**Priority**: 3 (MEDIUM)  
**Estimated Time**: 2-3 days  
**Hardens security posture**

### Task 5.1: Output File Permissions

**Issue**: Output files created with 0644 (world-readable). Sensitive specifications exposed on shared systems.

**File to Modify**:
- `cmd/root.go:154`

**Implementation**:

```go
// Add constant at top of file
const (
    DefaultOutputPermissions = 0600 // Owner read/write only
)

// Update WriteFile call
if output != "" {
    if err := os.WriteFile(output, []byte(md), DefaultOutputPermissions); err != nil {
        return fmt.Errorf("failed to write output file %q: %w", output, err)
    }
    return nil
}
```

**Optional: Make configurable via flag**:

```go
// Add flag to to-markdown command
var outputPerms int
toMarkdownCmd.Flags().IntVar(&outputPerms, "permissions", 0600, "Output file permissions (octal)")

// Use in WriteFile
os.WriteFile(output, []byte(md), os.FileMode(outputPerms))
```

**Testing**:
- Verify output files have 0600 permissions
- Test on Unix systems (Linux/macOS)
- Note: Permissions may differ on Windows

---

### Task 5.2: Markdown Injection Sanitization

**Issue**: User YAML content inserted directly into markdown templates. Can inject malicious markdown/HTML.

**File to Modify**:
- `markdown/converter.go:41-54` (funcMap)

**Implementation**:

```go
// Add to funcMap in converter.go
var funcMap = template.FuncMap{
    "join": func(sep string, items []string) string {
        return strings.Join(items, sep)
    },
    "joinComma": func(items []string) string {
        return strings.Join(items, ", ")
    },
    "escape": escapeMarkdown,
    "escapeHTML": escapeHTML,
}

// Add escape functions
func escapeMarkdown(s string) string {
    // Escape markdown special characters
    replacer := strings.NewReplacer(
        "[", "\\[",
        "]", "\\]",
        "(", "\\(",
        ")", "\\)",
        "*", "\\*",
        "_", "\\_",
        "`", "\\`",
        "#", "\\#",
        "!", "\\!",
    )
    return replacer.Replace(s)
}

func escapeHTML(s string) string {
    // Escape HTML special characters
    replacer := strings.NewReplacer(
        "<", "&lt;",
        ">", "&gt;",
        "&", "&amp;",
        "\"", "&quot;",
        "'", "&#39;",
    )
    return replacer.Replace(s)
}
```

**Apply to templates** (selectively, where user content is inserted):

```go
// Update templates to escape user-controlled fields
const brTemplate = `# Business Requirements

**Project:** {{escape .Project}}
**Version:** {{.Version}}

## Problem Statement
{{escape .Overview.Problem}}

## Personas
{{range .Personas}}
### {{escape .Name}}
**Role:** {{escape .Role}}
**Description:** {{escape .Description}}
{{end}}
`
```

**Important**: Don't escape everything - only user-controlled content that could contain malicious input. Structural markdown (headers, tables) should not be escaped.

**Testing**:
- Test with YAML containing `<script>alert(1)</script>`
- Test with markdown injection: `![image](javascript:alert(1))`
- Verify escaping doesn't break normal content

---

### Task 5.3: Regex DoS Prevention

**Issue**: Complex regex patterns without input length checks. Carefully crafted strings could cause backtracking delays.

**Files to Modify**:
- All validators with regex patterns

**Implementation**:

```go
// Add constant
const MaxIDLength = 100

// Add validation before regex matching
func validateIDFormat(id string, pattern *regexp.Regexp, fieldName string) error {
    // Check length first (prevents ReDoS)
    if len(id) > MaxIDLength {
        return fmt.Errorf("%s: ID too long (max %d characters)", fieldName, MaxIDLength)
    }
    
    // Now safe to run regex
    if !pattern.MatchString(id) {
        return fmt.Errorf("%s: invalid format: %s", fieldName, id)
    }
    
    return nil
}

// Use in validators:
// Before:
if !frIDPattern.MatchString(fr.ID) {
    r.Errors = append(r.Errors, ...)
}

// After:
if err := validateIDFormat(fr.ID, frIDPattern, "FR-ID"); err != nil {
    r.Errors = append(r.Errors, err.Error())
}
```

**Apply to all ID patterns**:
- `frIDPattern` (functional requirements)
- `qaSuiteIDPattern` (QA test suites)
- `mtTaskIDPattern` (milestone tasks)
- Others

**Testing**:
- Test with very long strings (1000+ chars)
- Test with strings designed to cause backtracking
- Benchmark regex performance

---

## Phase 6: Code Quality Improvements

**Priority**: 3 (LOW-MEDIUM)  
**Estimated Time**: 2 days  
**Polish and maintainability**

### Task 6.1: Use map[string]struct{} for Sets

**Issue**: Using `map[string]bool` instead of idiomatic `map[string]struct{}` for set semantics.

**Files to Modify**:
- `schema/business_requirements.go:107-108`
- `schema/technical_requirements.go`
- Others with enum validation

**Implementation**:

```go
// Before:
var validPriorities = map[string]bool{
    "high":   true,
    "medium": true,
    "low":    true,
}

// Check:
if !validPriorities[priority] {
    // error
}

// After:
var validPriorities = map[string]struct{}{
    "high":   {},
    "medium": {},
    "low":    {},
}

// Check:
if _, ok := validPriorities[priority]; !ok {
    // error
}
```

**Apply to all enum validations**

**Benefits**:
- More idiomatic Go
- Saves memory (struct{} is 0 bytes)
- Clearer intent (set, not bool map)

---

### Task 6.2: Add Package Documentation

**Issue**: Only `main.go` has package comment. Other packages undocumented.

**Files to Modify**:
- `cmd/root.go`
- `schema/registry.go` (or create `doc.go`)
- `markdown/converter.go` (or create `doc.go`)

**Implementation**:

```go
// cmd/root.go (or cmd/doc.go)
// Package cmd implements the Sherpy CLI commands.
//
// Sherpy provides two main commands:
//   - validate: Validates YAML documents against predefined schemas
//   - to-markdown: Converts validated YAML documents to formatted Markdown
//   - types: Lists all supported document types
//
// The CLI uses Cobra for command-line parsing and supports various flags
// for customizing validation and conversion behavior.
package cmd

// schema/doc.go (create new file)
// Package schema provides YAML validation for Sherpy document types.
//
// It defines validators for seven document types used in software project planning:
//   - business-requirements
//   - technical-requirements
//   - milestones
//   - milestone-tasks
//   - timeline
//   - qa-test-plan
//   - gap-analysis
//
// Each validator performs structural validation (required fields, types),
// business logic validation (sequential IDs, circular dependencies),
// and returns detailed error and warning messages.
//
// Validators follow a consistent signature:
//   func Validate<Type>(data []byte, strict bool) (*ValidationResult, error)
package schema

// markdown/doc.go (create new file)
// Package markdown provides YAML to Markdown conversion for Sherpy document types.
//
// Each document type has a dedicated converter that transforms validated YAML
// into well-formatted, human-readable Markdown. Converters use Go templates
// to generate consistent output with tables, lists, and proper sectioning.
//
// Converters follow a consistent signature:
//   func Convert<Type>(data []byte) (string, error)
package markdown
```

**Benefits**:
- Improves godoc output
- Helps new contributors understand structure
- Documents package purpose and API

---

### Task 6.3: Update Dependencies

**Issue**: `gopkg.in/yaml.v3 v3.0.1` is from 2021. May have unpatched bugs or vulnerabilities.

**Implementation**:

```bash
# Check for updates
go list -m -u all

# Update yaml.v3
go get -u gopkg.in/yaml.v3

# Update all dependencies
go get -u ./...

# Tidy
go mod tidy

# Run tests to ensure compatibility
make test
```

**Add dependency scanning to CI**:

```yaml
# .github/workflows/security.yml (if using GitHub Actions)
name: Security Scan
on: [push, pull_request]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v4
        with:
          go-version: '1.26'
      - name: Run Gosec
        run: |
          go install github.com/securego/gosec/v2/cmd/gosec@latest
          gosec ./...
      - name: Run govulncheck
        run: |
          go install golang.org/x/vuln/cmd/govulncheck@latest
          govulncheck ./...
```

**Monitor**:
- Set up Dependabot or Renovate for automatic updates
- Subscribe to security advisories for dependencies

---

## Implementation Strategy

### Git Workflow

**Branch Structure**:
```
main
├── fix/phase-1-security          (Tasks 1.1-1.3)
├── fix/phase-2-errors             (Tasks 2.1-2.3)
├── fix/phase-3-duplication        (Tasks 3.1-3.4)
├── fix/phase-4-testing            (Tasks 4.1-4.5)
├── fix/phase-5-security-medium    (Tasks 5.1-5.3)
└── fix/phase-6-quality            (Tasks 6.1-6.3)
```

**Commit Guidelines**:
- One commit per task for clean history
- Use conventional commits format: `fix:`, `test:`, `refactor:`, `docs:`
- Run tests before each commit
- Include issue reference if tracking

**Example**:
```bash
git checkout -b fix/phase-1-security

# Task 1.1
git add cmd/root.go
git commit -m "fix: add path traversal validation to file operations

- Add validatePath() function with filepath.Clean() and traversal checks
- Apply to all os.ReadFile() and os.WriteFile() calls
- Addresses security issue #1 in code review"

# Task 1.2
git add cmd/root.go
git commit -m "fix: add file size limits to prevent DoS

- Add readFileWithLimit() with 10MB max size check
- Replace direct os.ReadFile() calls
- Addresses security issue #2 in code review"

# Task 1.3
git add schema/validation_helpers.go schema/*.go
git commit -m "fix: add YAML bomb protection

- Add validateYAMLStructure() with anchor and size limits
- Apply to all yaml.Unmarshal() calls
- Addresses security issue #3 in code review"

# Create PR
git push origin fix/phase-1-security
gh pr create --title "Phase 1: Critical Security Fixes" --body "See implementation plan"
```

### Testing Strategy

**Before Each Commit**:
```bash
make test                # Unit tests
make integration-test    # E2E tests
make lint               # Code quality
```

**After Each Phase**:
```bash
# Full test suite
go test ./... -v -cover

# Coverage report
go test ./... -coverprofile=coverage.out
go tool cover -html=coverage.out

# Security scan
gosec ./...
govulncheck ./...
```

### Review Checkpoints

After each phase, verify:

**Phase 1 Checklist**:
- [ ] Path validation prevents traversal
- [ ] File size limits enforced
- [ ] YAML bomb detection works
- [ ] All security tests pass
- [ ] No regressions in existing tests

**Phase 2 Checklist**:
- [ ] No os.Exit() in library functions
- [ ] Template panics recovered
- [ ] Error messages have context
- [ ] Exit codes properly set
- [ ] Functions are testable

**Phase 3 Checklist**:
- [ ] Validation helpers created and used
- [ ] Circular dependency detection shared
- [ ] Strict mode centralized
- [ ] Magic numbers replaced with constants
- [ ] Code duplication reduced by 200+ lines

**Phase 4 Checklist**:
- [ ] to-markdown command fully tested
- [ ] Error path tests added
- [ ] Table-driven tests implemented
- [ ] Test fixtures created
- [ ] Edge cases covered
- [ ] Test coverage >80%

**Phase 5 Checklist**:
- [ ] Output permissions set to 0600
- [ ] Markdown escaping implemented
- [ ] Regex DoS prevention added
- [ ] Security tests pass

**Phase 6 Checklist**:
- [ ] Set maps use struct{} values
- [ ] Package documentation complete
- [ ] Dependencies updated
- [ ] Code quality improved

---

## Success Metrics

**Before**:
- Overall Grade: B+ (83/100)
- Test Coverage: 74-78%
- Security Issues: 2 High, 3 Medium, 4 Low
- Code Duplication: ~10%
- Error Handling: Some critical issues

**Target After Implementation**:
- Overall Grade: A (90+/100)
- Test Coverage: >80% all packages
- Security Issues: 0 High, 0 Medium
- Code Duplication: <5%
- Error Handling: Production-grade

**Specific Targets**:
- [ ] Zero High-severity security issues
- [ ] Zero Medium-severity security issues
- [ ] Test coverage >80% for cmd, schema, markdown packages
- [ ] No os.Exit() in testable functions
- [ ] All common validation logic extracted to helpers
- [ ] 200-300 lines of duplicated code removed
- [ ] All magic numbers replaced with constants
- [ ] Comprehensive test fixtures created
- [ ] Package documentation complete
- [ ] Dependencies up-to-date

---

## Timeline Estimate

**Week 1**:
- Days 1-2: Phase 1 (Critical Security)
- Day 3: Phase 2 (Error Handling)
- Days 4-5: Phase 3 (Duplication Cleanup)

**Week 2**:
- Days 1-3: Phase 4 (Testing)
- Days 4-5: Phase 5 (Medium Security)

**Week 3**:
- Days 1-2: Phase 6 (Quality)
- Day 3: Final testing and documentation
- Days 4-5: Code review and refinement

**Total**: 15-21 days (3 weeks) for complete implementation

**Minimum Viable Product (MVP)**:
- Phases 1-2 only: 3-5 days
- Gets to production-ready state with critical fixes
- Can defer optimization (Phases 3-6) to later

---

## Risk Mitigation

**Risk**: Breaking existing functionality
**Mitigation**:
- Run full test suite after each change
- Keep changes small and focused
- Review diffs carefully before commit
- Use feature flags for major changes

**Risk**: Incomplete testing of edge cases
**Mitigation**:
- Create comprehensive test fixtures first
- Use table-driven tests for variants
- Add fuzzing for YAML parsing
- Monitor production after deployment

**Risk**: Performance regression
**Mitigation**:
- Add benchmark tests for hot paths
- Profile before and after changes
- Keep validation fast (avoid expensive operations)
- Cache compiled regexes and templates

**Risk**: Timeline overrun
**Mitigation**:
- Start with Phases 1-2 (critical)
- Phases 3-6 can be done incrementally
- Each phase is independently valuable
- Can ship after any completed phase

---

## Next Steps

**Ready to start?**

1. Create branch: `git checkout -b fix/phase-1-security`
2. Begin with Task 1.1: Path Traversal Protection
3. Implement `validatePath()` function in `cmd/root.go`
4. Add tests for path validation
5. Apply to all file operations
6. Commit and move to Task 1.2

**Commands to Run**:
```bash
# Start implementation
git checkout -b fix/phase-1-security
cd /workspace

# Edit cmd/root.go for Task 1.1
# ... implement validatePath() ...

# Test
make test
make integration-test

# Commit
git add cmd/root.go
git commit -m "fix: add path traversal validation"

# Continue with remaining tasks...
```

**Questions?** Refer to:
- Full review: `.tmp-docs/code-reviews/sherpy-comprehensive-code-review.md`
- This plan: `.tmp-docs/sherpy-implementation-plan.md`
- Git history for context
