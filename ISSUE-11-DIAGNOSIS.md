# Issue #11 Diagnosis: non_functional_requirements validation error

**Issue URL:** https://github.com/validkeys/sherpy/issues/11  
**Created:** 2026-06-04  
**Status:** Diagnosed with root cause identified

## Executive Summary

The `sherpy validate` command produces a **misleading and backwards error message** when the `non_functional_requirements` field is provided in an incorrect format. The error states "Found a map/object where a simple string value was expected" when the actual problem is the **opposite**: a string was provided where a structured map/object is expected.

## Root Cause Analysis

### The Problem

When a user provides `non_functional_requirements` as a simple string (or array), the YAML unmarshaling fails and the error enhancement logic in `schema/validation_helpers.go` incorrectly interprets the error type, resulting in a backwards error message.

### Technical Details

1. **Schema Definition** (`schema/business_requirements.go:18,63-70`):
   ```go
   type BusinessRequirements struct {
       ...
       NonFunctionalRequirements *BRNonFunctionalRequirements `yaml:"non_functional_requirements,omitempty"`
       ...
   }

   type BRNonFunctionalRequirements struct {
       Performance     []string `yaml:"performance,omitempty"`
       Security        []string `yaml:"security,omitempty"`
       Usability       []string `yaml:"usability,omitempty"`
       Reliability     []string `yaml:"reliability,omitempty"`
       Maintainability []string `yaml:"maintainability,omitempty"`
       Observability   []string `yaml:"observability,omitempty"`
   }
   ```

   The schema expects a **structured object** with optional category fields, each containing an array of strings.

2. **Error Enhancement Logic** (`schema/validation_helpers.go:205-213`):
   ```go
   if strings.Contains(errMsg, "cannot unmarshal !!map into string") {
       msg.WriteString("Problem: Found a map/object where a simple string value was expected.\n\n")
       ...
   }
   ```

   The error message detection is **checking for the wrong error string**. When YAML tries to unmarshal a string into the `BRNonFunctionalRequirements` struct, it produces an error like:
   ```
   cannot unmarshal !!str `Perform...` into schema.BRNonFunctionalRequirements
   ```

   But the error handler is looking for `"cannot unmarshal !!map into string"`, which is the **opposite** scenario.

3. **Test Results** (`schema/business_requirements_nfr_test.go`):
   - ✅ **Correct format** (structured with categories): Validates successfully
   - ❌ **String format**: Produces misleading error message
   - ❌ **Array format**: Produces misleading error message
   - ❌ **Array of objects**: Produces misleading error message

### Why This Happens

The `enhanceYAMLError` function in `validation_helpers.go` tries to provide helpful error messages by pattern-matching on the raw YAML error strings. However, the pattern matching is incomplete and doesn't cover the case where:
- **Expected**: struct/map (like `BRNonFunctionalRequirements`)
- **Actual**: simple scalar value (string, number, etc.)

The error string from gopkg.in/yaml.v3 for this case is:
```
cannot unmarshal !!str into schema.BRNonFunctionalRequirements
```

But the code only handles:
- `"cannot unmarshal !!map into string"` (map → string)
- `"cannot unmarshal !!str into"` (string → complex type, but generic message)
- `"cannot unmarshal !!seq into"` (array → other type)

## Reproduction Steps

### Test Case 1: String value (reported in bug)
```yaml
non_functional_requirements: "Performance requirements text"
```

**Result:**
```
Error: YAML parsing error at line 37 (field: non_functional_requirements):
Problem: Found a map/object where a simple string value was expected.
```

**Actual Problem:** Found a string where a structured object was expected (backwards message!)

### Test Case 2: Array value
```yaml
non_functional_requirements:
  - "Performance: Requirements text"
  - "Accessibility: Requirements text"
```

**Result:**
```
Error: YAML parsing error at line 27 (field: - "Performance):
Problem: Found an array where a different type was expected.
```

**Assessment:** Generic but not actively misleading.

### Test Case 3: Correct format
```yaml
non_functional_requirements:
  performance:
    - Task list views must load within 500ms
  security:
    - All data encrypted in transit (TLS 1.3)
```

**Result:** ✅ Validates successfully

## Impact Assessment

### User Experience Impact
- **Severity:** High
- **Frequency:** Common for new users following AI-generated prompts
- **Confusion:** Very high - error message suggests the opposite fix

### Documentation Inconsistency
The `business-requirements-interview` skill prompt mentions:
```markdown
- `non_functional_requirements`
```

But doesn't provide clear examples of the expected structure during the interview, leading users to guess formats that fail validation.

## Proposed Solutions

### Solution 1: Fix Error Message Logic (Recommended - High Priority)

**File:** `schema/validation_helpers.go`  
**Change:** Add specific handling for "cannot unmarshal !!str into [struct]" pattern

```go
// Current code (line 205-213)
if strings.Contains(errMsg, "cannot unmarshal !!map into string") {
    msg.WriteString("Problem: Found a map/object where a simple string value was expected.\n\n")
    ...
}

// Proposed fix: Add before the existing check
if strings.Contains(errMsg, "cannot unmarshal !!str") && strings.Contains(errMsg, "into schema.BR") {
    msg.WriteString("Problem: Found a string where a structured object was expected.\n\n")
    msg.WriteString("Suggestions:\n")
    msg.WriteString("  • The field expects a structured format with nested categories\n")
    if fieldName == "non_functional_requirements" {
        msg.WriteString("  • Use the format:\n")
        msg.WriteString("      non_functional_requirements:\n")
        msg.WriteString("        performance:\n")
        msg.WriteString("          - \"Task views must load within 500ms\"\n")
        msg.WriteString("        security:\n")
        msg.WriteString("          - \"All data encrypted in transit\"\n")
    }
    msg.WriteString("  • See example.yaml for reference\n")
    msg.WriteString(fmt.Sprintf("  • Run: sherpy prompt -t %s for structure guidance\n", docType))
} else if strings.Contains(errMsg, "cannot unmarshal !!map into string") {
    // existing code
    ...
}
```

**Benefits:**
- ✅ Fixes the backwards error message
- ✅ Provides specific, actionable guidance
- ✅ Shows example format for NFR field specifically
- ✅ Low risk - only affects error messages

**Effort:** ~30 minutes  
**Risk:** Low

### Solution 2: Add Field-Specific Validation (Medium Priority)

**File:** `schema/business_requirements.go`  
**Change:** Add optional validation for NFR structure quality

```go
func validateBRNonFunctionalRequirements(doc BusinessRequirements, r *ValidationResult) {
    if doc.NonFunctionalRequirements == nil {
        r.Warnings = append(r.Warnings, "non_functional_requirements is recommended for production systems")
        return
    }

    nfr := doc.NonFunctionalRequirements
    categoryCount := 0
    totalItems := 0

    if len(nfr.Performance) > 0 { categoryCount++; totalItems += len(nfr.Performance) }
    if len(nfr.Security) > 0 { categoryCount++; totalItems += len(nfr.Security) }
    if len(nfr.Usability) > 0 { categoryCount++; totalItems += len(nfr.Usability) }
    if len(nfr.Reliability) > 0 { categoryCount++; totalItems += len(nfr.Reliability) }
    if len(nfr.Maintainability) > 0 { categoryCount++; totalItems += len(nfr.Maintainability) }
    if len(nfr.Observability) > 0 { categoryCount++; totalItems += len(nfr.Observability) }

    if categoryCount == 0 {
        r.Warnings = append(r.Warnings, "non_functional_requirements is present but empty")
    }
    if categoryCount < 3 {
        r.Warnings = append(r.Warnings, fmt.Sprintf(
            "recommended at least 3 non_functional_requirements categories, found %d", categoryCount))
    }
}
```

Then call it from `ValidateBusinessRequirements`:
```go
validateBRNonFunctionalRequirements(doc, result)
```

**Benefits:**
- ✅ Provides quality guidance for NFR content
- ✅ Helps users write better requirements
- ✅ Consistent with other validation warnings

**Effort:** ~45 minutes  
**Risk:** Low

### Solution 3: Improve Documentation (Medium Priority)

**File:** `skills/business-requirements-interview/SKILL.md`  
**Change:** Add clear examples in the interview flow

Add a section showing NFR format:
```markdown
## Non-Functional Requirements Format

When collecting non_functional_requirements, use this structure:

```yaml
non_functional_requirements:
  performance:
    - "Specific, measurable performance requirement"
  security:
    - "Specific security requirement"
  usability:
    - "Specific usability requirement"
```

Categories: performance, security, usability, reliability, maintainability, observability
```

**Effort:** ~20 minutes  
**Risk:** None

### Solution 4: Add `--version` Flag (Low Priority)

**File:** `cmd/root.go`  
**Change:** Add version command

The bug report mentions:
> Sherpy Version: (output from `sherpy --version` returns "unknown flag" error - suggest adding version flag)

Add version support:
```go
var Version = "dev" // Set by build

func NewRootCmd() *cobra.Command {
    root := &cobra.Command{
        Use:   "sherpy",
        Short: "Structured Requirements & Planning CLI",
        Version: Version,
    }
    // ... rest of code
}
```

**Effort:** ~15 minutes  
**Risk:** None

## Recommended Implementation Order

1. **✅ Solution 1** (Fix error message) - **HIGH PRIORITY**
   - Immediate user impact improvement
   - Prevents confusion for all users
   - Quick win

2. **Solution 3** (Documentation) - **MEDIUM PRIORITY**
   - Prevents users from making the mistake
   - Helps AI assistants generate correct format
   - Low effort

3. **Solution 2** (Field validation) - **MEDIUM PRIORITY**
   - Improves requirement quality
   - Consistent with other validations
   - Nice-to-have

4. **Solution 4** (Version flag) - **LOW PRIORITY**
   - Good practice but not urgent
   - Easy to add later

## Test Coverage

Created comprehensive test coverage in `schema/business_requirements_nfr_test.go`:
- ✅ Tests all format variations
- ✅ Validates correct structured format
- ✅ Confirms example.yaml format works
- ✅ Tests partial NFR definitions
- ✅ Documents expected behavior

All tests pass and properly demonstrate the issue.

## Files Involved

### Core Files
- `schema/business_requirements.go` - Schema definition
- `schema/validation_helpers.go` - Error enhancement logic (**PRIMARY FIX LOCATION**)
- `cmd/root.go` - Validation command
- `docs/specifications/business-requirements/example.yaml` - Reference implementation

### Test Files
- `schema/business_requirements_test.go` - Existing tests
- `schema/business_requirements_nfr_test.go` - New comprehensive NFR tests (**NEW**)
- `testdata/invalid/business-requirements-nfr-wrong-format.yaml` - Reproduction case (**NEW**)

### Documentation Files
- `skills/business-requirements-interview/SKILL.md` - Interview prompts
- `skills/business-requirements-interview/references/output-spec.md` - Schema spec

## Verification Plan

After implementing Solution 1:

1. Run new NFR tests: `go test -v ./schema -run TestNonFunctionalRequirements`
2. Validate test file: `go run main.go validate -t business-requirements -f testdata/invalid/business-requirements-nfr-wrong-format.yaml`
3. Verify error message now says: "Found a string where a structured object was expected"
4. Validate example still works: `go run main.go validate -t business-requirements -f docs/specifications/business-requirements/example.yaml`
5. Run full test suite: `go test ./...`

## Conclusion

This is a **high-priority bug** with a **clear fix path**. The error message logic has a logic inversion that makes troubleshooting unnecessarily difficult for users. The fix is straightforward, low-risk, and will significantly improve the user experience.

**Estimated Total Effort:** 2-3 hours for all four solutions  
**Minimum Viable Fix:** Solution 1 only (~30 minutes)
