package schema

import (
	"strings"
	"testing"
)

func TestFormatResultAllPass(t *testing.T) {
	r := &ValidationResult{}
	out := FormatResult("business-requirements", "test.yaml", r, false)
	if !strings.Contains(out, "passed") {
		t.Errorf("expected 'passed' in output, got: %s", out)
	}
	if strings.Contains(out, "Error") || strings.Contains(out, "Warning") {
		t.Errorf("expected no errors/warnings, got: %s", out)
	}
}

func TestFormatResultWithErrors(t *testing.T) {
	r := &ValidationResult{
		Errors: []string{
			"overview.problem must be at least 50 characters",
			"personas.0.name is required",
		},
	}
	out := FormatResult("business-requirements", "test.yaml", r, false)
	if !strings.Contains(out, "failed") {
		t.Errorf("expected 'failed' in output, got: %s", out)
	}
	if !strings.Contains(out, "2 errors") {
		t.Errorf("expected '2 errors' in output, got: %s", out)
	}
	if !strings.Contains(out, "overview.problem must be at least 50 characters") {
		t.Errorf("expected error detail in output, got: %s", out)
	}
}

func TestFormatResultWithWarningsDefault(t *testing.T) {
	r := &ValidationResult{
		Warnings: []string{
			"recommended at least 3 risks, found 1",
		},
	}
	out := FormatResult("business-requirements", "test.yaml", r, false)
	if !strings.Contains(out, "passed") {
		t.Errorf("warnings-only should still say 'passed' in default mode, got: %s", out)
	}
	if !strings.Contains(out, "1 warning") {
		t.Errorf("expected '1 warning' in output, got: %s", out)
	}
}

func TestFormatResultWithWarningsStrict(t *testing.T) {
	r := &ValidationResult{
		Warnings: []string{
			"recommended at least 3 risks, found 1",
		},
	}
	out := FormatResult("business-requirements", "test.yaml", r, true)
	if !strings.Contains(out, "failed") {
		t.Errorf("warnings should be errors in strict mode, got: %s", out)
	}
}

func TestFormatResultVerboseWithErrorsAndWarnings(t *testing.T) {
	r := &ValidationResult{
		Errors: []string{
			"overview.problem is required",
		},
		Warnings: []string{
			"recommended at least 3 risks, found 1",
		},
	}
	out := FormatResult("business-requirements", "test.yaml", r, false)
	if !strings.Contains(out, "1 error") || !strings.Contains(out, "1 warning") {
		t.Errorf("expected both error and warning counts, got: %s", out)
	}
	if !strings.Contains(out, "Error:") {
		t.Errorf("expected 'Error:' prefix in verbose output, got: %s", out)
	}
	if !strings.Contains(out, "Warning:") {
		t.Errorf("expected 'Warning:' prefix in verbose output, got: %s", out)
	}
}
