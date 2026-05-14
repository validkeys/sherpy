package schema

import (
	"fmt"
	"strings"
)

// ApplyStrict promotes warnings to errors for strict validation mode
func (r *ValidationResult) ApplyStrict() {
	if len(r.Warnings) > 0 {
		r.Errors = append(r.Errors, r.Warnings...)
		r.Warnings = nil
	}
}

func FormatResult(typeName, filename string, result *ValidationResult, strict bool) string {
	errors := result.Errors
	warnings := result.Warnings

	if strict && len(warnings) > 0 {
		errors = append(errors, warnings...)
		warnings = nil
	}

	if len(errors) == 0 && len(warnings) == 0 {
		return fmt.Sprintf("✓ %s: validation passed (%s)", typeName, filename)
	}

	var b strings.Builder

	if len(errors) > 0 {
		errWord := "error"
		if len(errors) != 1 {
			errWord = "errors"
		}
		parts := []string{fmt.Sprintf("%d %s", len(errors), errWord)}
		if len(warnings) > 0 {
			parts = append(parts, fmt.Sprintf("%d warning", len(warnings)))
		}
		b.WriteString(fmt.Sprintf("✗ %s: validation failed (%s)\n", typeName, strings.Join(parts, ", ")))
	} else {
		b.WriteString(fmt.Sprintf("✓ %s: validation passed (%d warning", typeName, len(warnings)))
		if len(warnings) != 1 {
			b.WriteString("s")
		}
		b.WriteString(")\n")
	}

	for _, e := range errors {
		b.WriteString(fmt.Sprintf("\n  Error: %s", e))
	}

	for _, w := range warnings {
		b.WriteString(fmt.Sprintf("\n  Warning: %s", w))
	}

	return b.String()
}
