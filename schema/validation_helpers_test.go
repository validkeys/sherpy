package schema

import (
	"regexp"
	"testing"
)

func TestValidateRequiredField(t *testing.T) {
	r := &ValidationResult{}

	validateRequiredField(r, "", "test_field")
	if len(r.Errors) != 1 {
		t.Errorf("expected 1 error, got %d", len(r.Errors))
	}

	r = &ValidationResult{}
	validateRequiredField(r, "value", "test_field")
	if len(r.Errors) != 0 {
		t.Errorf("expected 0 errors, got %d", len(r.Errors))
	}
}

func TestValidateRequiredFields(t *testing.T) {
	r := &ValidationResult{}

	validateRequiredFields(r, map[string]string{
		"field1": "value1",
		"field2": "",
		"field3": "  ",
	})

	if len(r.Errors) != 2 {
		t.Errorf("expected 2 errors (field2 and field3), got %d: %v", len(r.Errors), r.Errors)
	}
}

func TestValidateStringLength(t *testing.T) {
	r := &ValidationResult{}

	validateStringLength(r, "short", "test_field", 10)
	if len(r.Warnings) != 1 {
		t.Errorf("expected 1 warning, got %d", len(r.Warnings))
	}

	r = &ValidationResult{}
	validateStringLength(r, "long enough string", "test_field", 10)
	if len(r.Warnings) != 0 {
		t.Errorf("expected 0 warnings, got %d", len(r.Warnings))
	}

	r = &ValidationResult{}
	validateStringLength(r, "", "test_field", 10)
	if len(r.Warnings) != 0 {
		t.Errorf("expected 0 warnings for empty string, got %d", len(r.Warnings))
	}
}

func TestValidateEnum(t *testing.T) {
	r := &ValidationResult{}
	validValues := map[string]struct{}{"high": {}, "medium": {}, "low": {}}

	validateEnum(r, "invalid", "priority", validValues)
	if len(r.Errors) != 1 {
		t.Errorf("expected 1 error, got %d", len(r.Errors))
	}

	r = &ValidationResult{}
	validateEnum(r, "high", "priority", validValues)
	if len(r.Errors) != 0 {
		t.Errorf("expected 0 errors, got %d", len(r.Errors))
	}
}

func TestValidateSequentialIDs(t *testing.T) {
	pattern := regexp.MustCompile(`^FR-(\d+)$`)

	tests := []struct {
		name        string
		ids         []string
		wantErrors  int
		description string
	}{
		{
			name:        "valid sequential",
			ids:         []string{"FR-1", "FR-2", "FR-3"},
			wantErrors:  0,
			description: "sequential IDs should pass",
		},
		{
			name:        "non-sequential",
			ids:         []string{"FR-1", "FR-3"},
			wantErrors:  1,
			description: "missing FR-2 should error",
		},
		{
			name:        "invalid format",
			ids:         []string{"FR-1", "INVALID", "FR-3"},
			wantErrors:  1,
			description: "invalid format should error (continues checking)",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := &ValidationResult{}
			validateSequentialIDs(r, tt.ids, pattern, "FR")

			if len(r.Errors) != tt.wantErrors {
				t.Errorf("%s: expected %d errors, got %d: %v", tt.description, tt.wantErrors, len(r.Errors), r.Errors)
			}
		})
	}
}

func TestDetectCircularDependencies(t *testing.T) {
	tests := []struct {
		name         string
		dependencies map[string][]string
		wantCycle    bool
		description  string
	}{
		{
			name: "no cycle",
			dependencies: map[string][]string{
				"A": {"B"},
				"B": {"C"},
				"C": {},
			},
			wantCycle:   false,
			description: "linear dependencies should not detect cycle",
		},
		{
			name: "simple cycle",
			dependencies: map[string][]string{
				"A": {"B"},
				"B": {"C"},
				"C": {"A"},
			},
			wantCycle:   true,
			description: "A -> B -> C -> A should detect cycle",
		},
		{
			name: "self cycle",
			dependencies: map[string][]string{
				"A": {"A"},
			},
			wantCycle:   true,
			description: "self-referencing should detect cycle",
		},
		{
			name: "diamond no cycle",
			dependencies: map[string][]string{
				"A": {"B", "C"},
				"B": {"D"},
				"C": {"D"},
				"D": {},
			},
			wantCycle:   false,
			description: "diamond pattern without cycle should pass",
		},
		{
			name: "complex cycle",
			dependencies: map[string][]string{
				"A": {"B"},
				"B": {"C", "D"},
				"C": {"E"},
				"D": {"E"},
				"E": {"B"},
			},
			wantCycle:   true,
			description: "cycle in middle of graph should be detected",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			hasCycle, cycle := detectCircularDependencies(tt.dependencies)

			if hasCycle != tt.wantCycle {
				t.Errorf("%s: expected cycle=%v, got cycle=%v (path: %v)", tt.description, tt.wantCycle, hasCycle, cycle)
			}

			if hasCycle && len(cycle) == 0 {
				t.Errorf("%s: cycle detected but no path returned", tt.description)
			}
		})
	}
}

func TestApplyStrict(t *testing.T) {
	r := &ValidationResult{
		Errors:   []string{"error1"},
		Warnings: []string{"warning1", "warning2"},
	}

	r.ApplyStrict()

	if len(r.Errors) != 3 {
		t.Errorf("expected 3 errors after ApplyStrict, got %d", len(r.Errors))
	}
	if len(r.Warnings) != 0 {
		t.Errorf("expected 0 warnings after ApplyStrict, got %d", len(r.Warnings))
	}
}
