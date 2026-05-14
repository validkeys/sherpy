package schema

import (
	"os"
	"testing"
)

func mustReadExample(t *testing.T) []byte {
	t.Helper()
	data, err := os.ReadFile("../docs/specifications/business-requirements/example.yaml")
	if err != nil {
		t.Fatalf("failed to read example.yaml: %v", err)
	}
	return data
}

func TestBusinessRequirementsExamplePasses(t *testing.T) {
	data := mustReadExample(t)
	result, err := ValidateBusinessRequirements(data, false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	if !result.Valid() {
		t.Errorf("example.yaml should pass validation, got errors:\n%v", result.Errors)
	}
}

func TestBusinessRequirementsMissingProject(t *testing.T) {
	yaml := `version: "1.0.0"
generated: "2026-01-01T00:00:00Z"
`
	result, err := ValidateBusinessRequirements([]byte(yaml), false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	if result.Valid() {
		t.Fatal("expected validation to fail for missing project")
	}
	found := false
	for _, e := range result.Errors {
		if contains(e, "project") {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected error about 'project', got: %v", result.Errors)
	}
}

func TestBusinessRequirementsProblemTooShort(t *testing.T) {
	yaml := `project: Test
version: "1.0.0"
generated: "2026-01-01T00:00:00Z"
overview:
  problem: "too short"
  value_proposition: "this is a value proposition that is at least thirty characters long"
  scope:
    in_scope:
      - "item one"
`
	result, err := ValidateBusinessRequirements([]byte(yaml), false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	if result.Valid() {
		t.Fatal("expected validation to fail for short problem")
	}
	found := false
	for _, e := range result.Errors {
		if contains(e, "problem") && contains(e, "50") {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected error about problem length >= 50, got: %v", result.Errors)
	}
}

func TestBusinessRequirementsFRIDPattern(t *testing.T) {
	yaml := `project: Test
version: "1.0.0"
generated: "2026-01-01T00:00:00Z"
overview:
  problem: "this is a problem statement that is at least fifty characters long for testing"
  value_proposition: "this is a value proposition that is at least thirty characters long"
  scope:
    in_scope:
      - "item one"
personas:
  - name: "Alice"
    description: "a test persona with twenty characters minimum"
    goals: ["goal one that is ten chars"]
    pain_points: ["pain point that is ten chars"]
use_cases:
  - name: "A valid use case name"
    actor: "Alice"
    description: "a description that is twenty characters min"
    outcome: "an outcome here"
functional_requirements:
  - id: "BAD-1"
    category: "Test"
    description: "a description that is twenty characters min"
    priority: high
    rationale: "a rationale here"
`
	result, err := ValidateBusinessRequirements([]byte(yaml), false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	if result.Valid() {
		t.Fatal("expected validation to fail for bad FR-ID")
	}
	found := false
	for _, e := range result.Errors {
		if contains(e, "FR-") {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected error about FR- pattern, got: %v", result.Errors)
	}
}

func TestBusinessRequirementsActorNotInPersonas(t *testing.T) {
	yaml := `project: Test
version: "1.0.0"
generated: "2026-01-01T00:00:00Z"
overview:
  problem: "this is a problem statement that is at least fifty characters long for testing"
  value_proposition: "this is a value proposition that is at least thirty characters long"
  scope:
    in_scope:
      - "item one"
personas:
  - name: "Alice"
    description: "a test persona with twenty characters minimum"
    goals: ["goal one that is ten chars"]
    pain_points: ["pain point that is ten chars"]
use_cases:
  - name: "A valid use case name"
    actor: "Bob"
    description: "a description that is twenty characters min"
    outcome: "an outcome here"
functional_requirements:
  - id: "FR-1"
    category: "Test"
    description: "a description that is twenty characters min"
    priority: high
    rationale: "a rationale here"
`
	result, err := ValidateBusinessRequirements([]byte(yaml), false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	found := false
	for _, e := range result.Errors {
		if contains(e, "actor") && contains(e, "persona") {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected error about actor not matching persona, got: %v", result.Errors)
	}
}

func TestBusinessRequirementsSystemActorAllowed(t *testing.T) {
	yaml := `project: Test
version: "1.0.0"
generated: "2026-01-01T00:00:00Z"
overview:
  problem: "this is a problem statement that is at least fifty characters long for testing"
  value_proposition: "this is a value proposition that is at least thirty characters long"
  scope:
    in_scope:
      - "item one"
personas:
  - name: "Alice"
    description: "a test persona with twenty characters minimum"
    goals: ["goal one that is ten chars"]
    pain_points: ["pain point that is ten chars"]
use_cases:
  - name: "A valid use case name"
    actor: "System"
    description: "a description that is twenty characters min"
    outcome: "an outcome here"
functional_requirements:
  - id: "FR-1"
    category: "Test"
    description: "a description that is twenty characters min"
    priority: high
    rationale: "a rationale here"
success_criteria:
  - criterion: "Users complete tasks"
    metric: "task completion rate"
    target: "90%"
timeline:
  phase: "MVP"
  duration: "12 weeks"
  milestones:
    - "Week 6: Core features complete"
assumptions:
  - "assumption one that is twenty chars"
  - "assumption two that is twenty chars"
  - "assumption three that is twenty chars"
`
	result, err := ValidateBusinessRequirements([]byte(yaml), false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	if !result.Valid() {
		t.Errorf("System actor should be allowed, got errors: %v", result.Errors)
	}
}

func TestBusinessRequirementsFewRisksWarning(t *testing.T) {
	yaml := `project: Test
version: "1.0.0"
generated: "2026-01-01T00:00:00Z"
overview:
  problem: "this is a problem statement that is at least fifty characters long for testing"
  value_proposition: "this is a value proposition that is at least thirty characters long"
  scope:
    in_scope:
      - "item one"
personas:
  - name: "Alice"
    description: "a test persona with twenty characters minimum"
    goals: ["goal one that is ten chars"]
    pain_points: ["pain point that is ten chars"]
use_cases:
  - name: "A valid use case name"
    actor: "Alice"
    description: "a description that is twenty characters min"
    outcome: "an outcome here"
functional_requirements:
  - id: "FR-1"
    category: "Test"
    description: "a description that is twenty characters min"
    priority: high
    rationale: "a rationale here"
risks:
  - risk: "only one risk which is twenty characters"
    probability: low
    impact: low
    mitigation: "a mitigation strategy that is twenty chars"
success_criteria:
  - criterion: "Users complete tasks"
    metric: "task completion rate"
    target: "90%"
timeline:
  phase: "MVP"
  duration: "12 weeks"
  milestones:
    - "Week 6: Core features complete"
assumptions:
  - "assumption one that is twenty chars"
  - "assumption two that is twenty chars"
  - "assumption three that is twenty chars"
`
	result, err := ValidateBusinessRequirements([]byte(yaml), false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	if !result.Valid() {
		t.Errorf("should pass in default mode (warnings only), got errors: %v", result.Errors)
	}
	found := false
	for _, w := range result.Warnings {
		if contains(w, "risk") && contains(w, "3") {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected warning about <3 risks, got warnings: %v", result.Warnings)
	}
}

func TestBusinessRequirementsFewRisksStrict(t *testing.T) {
	yaml := `project: Test
version: "1.0.0"
generated: "2026-01-01T00:00:00Z"
overview:
  problem: "this is a problem statement that is at least fifty characters long for testing"
  value_proposition: "this is a value proposition that is at least thirty characters long"
  scope:
    in_scope:
      - "item one"
personas:
  - name: "Alice"
    description: "a test persona with twenty characters minimum"
    goals: ["goal one that is ten chars"]
    pain_points: ["pain point that is ten chars"]
use_cases:
  - name: "A valid use case name"
    actor: "Alice"
    description: "a description that is twenty characters min"
    outcome: "an outcome here"
functional_requirements:
  - id: "FR-1"
    category: "Test"
    description: "a description that is twenty characters min"
    priority: high
    rationale: "a rationale here"
risks:
  - risk: "only one risk which is twenty characters"
    probability: low
    impact: low
    mitigation: "a mitigation strategy that is twenty chars"
success_criteria:
  - criterion: "Users complete tasks"
    metric: "task completion rate"
    target: "90%"
timeline:
  phase: "MVP"
  duration: "12 weeks"
  milestones:
    - "Week 6: Core features complete"
assumptions:
  - "assumption one that is twenty chars"
  - "assumption two that is twenty chars"
  - "assumption three that is twenty chars"
`
	result, err := ValidateBusinessRequirements([]byte(yaml), true)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	if result.Valid() {
		t.Fatal("expected failure in strict mode with <3 risks")
	}
}

func TestBusinessRequirementsInvalidPriority(t *testing.T) {
	yaml := `project: Test
version: "1.0.0"
generated: "2026-01-01T00:00:00Z"
overview:
  problem: "this is a problem statement that is at least fifty characters long for testing"
  value_proposition: "this is a value proposition that is at least thirty characters long"
  scope:
    in_scope:
      - "item one"
personas:
  - name: "Alice"
    description: "a test persona with twenty characters minimum"
    goals: ["goal one that is ten chars"]
    pain_points: ["pain point that is ten chars"]
use_cases:
  - name: "A valid use case name"
    actor: "Alice"
    description: "a description that is twenty characters min"
    outcome: "an outcome here"
functional_requirements:
  - id: "FR-1"
    category: "Test"
    description: "a description that is twenty characters min"
    priority: urgent
    rationale: "a rationale here"
`
	result, err := ValidateBusinessRequirements([]byte(yaml), false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	if result.Valid() {
		t.Fatal("expected failure for invalid priority")
	}
}

func TestBusinessRequirementsNonSequentialFRIDs(t *testing.T) {
	yaml := `project: Test
version: "1.0.0"
generated: "2026-01-01T00:00:00Z"
overview:
  problem: "this is a problem statement that is at least fifty characters long for testing"
  value_proposition: "this is a value proposition that is at least thirty characters long"
  scope:
    in_scope:
      - "item one"
personas:
  - name: "Alice"
    description: "a test persona with twenty characters minimum"
    goals: ["goal one that is ten chars"]
    pain_points: ["pain point that is ten chars"]
use_cases:
  - name: "A valid use case name"
    actor: "Alice"
    description: "a description that is twenty characters min"
    outcome: "an outcome here"
functional_requirements:
  - id: "FR-1"
    category: "Test"
    description: "a description that is twenty characters min"
    priority: high
    rationale: "a rationale here"
  - id: "FR-3"
    category: "Test"
    description: "another description that is twenty chars"
    priority: medium
    rationale: "another rationale here"
`
	result, err := ValidateBusinessRequirements([]byte(yaml), false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	found := false
	for _, e := range result.Errors {
		if contains(e, "FR-2") && contains(e, "sequential") {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected error about missing FR-2 / sequential IDs, got: %v", result.Errors)
	}
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && searchString(s, substr)
}

func searchString(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func TestBusinessRequirementsWithFixtures(t *testing.T) {
	tests := []struct {
		name      string
		fixture   string
		wantError string
	}{
		{
			name:      "missing project",
			fixture:   "../testdata/invalid/business-requirements-missing-project.yaml",
			wantError: "project",
		},
		{
			name:      "non-sequential IDs",
			fixture:   "../testdata/invalid/business-requirements-non-sequential-ids.yaml",
			wantError: "sequential",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			data, err := os.ReadFile(tt.fixture)
			if err != nil {
				t.Fatalf("failed to read fixture: %v", err)
			}

			result, err := ValidateBusinessRequirements(data, false)
			if err != nil {
				t.Fatalf("unexpected parse error: %v", err)
			}

			if result.Valid() {
				t.Errorf("expected validation to fail, but it passed")
			}

			found := false
			for _, e := range result.Errors {
				if contains(e, tt.wantError) {
					found = true
					break
				}
			}
			if !found {
				t.Errorf("expected error containing %q, got %v", tt.wantError, result.Errors)
			}
		})
	}
}

func TestBusinessRequirementsEdgeCases(t *testing.T) {
	t.Run("unicode characters",  func(t *testing.T) {
		// Test that unicode characters are parsed without crashing
		yaml := `
project: "Test 日本語 🚀"
version: 1.0
generated: "2024-01-01"
overview:
  problem: "Problem with émojis 🎯 meets minimum fifty character requirement."
  value_proposition: "Unicode support αβγ minimum thirty chars."
`
		result, err := ValidateBusinessRequirements([]byte(yaml), false)
		if err != nil {
			t.Errorf("unicode should be supported: %v", err)
		}
		// May have validation errors for missing fields, but shouldn't crash
		_ = result
	})

	t.Run("very long strings", func(t *testing.T) {
		longStr := make([]byte, 10000)
		for i := range longStr {
			longStr[i] = 'a'
		}
		yaml := `project: Test
version: 1.0
generated: "2024-01-01"
overview:
  problem: "` + string(longStr) + `"
  value_proposition: "Value proposition"`

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
overview:
  problem: "This is a test problem statement that meets the minimum character requirement of fifty characters."
  value_proposition: "Value proposition minimum length."
functional_requirements: []
`
		result1, _ := ValidateBusinessRequirements([]byte(yaml1), false)

		// Missing array
		yaml2 := `
project: Test
version: 1.0
generated: "2024-01-01"
overview:
  problem: "This is a test problem statement that meets the minimum character requirement of fifty characters."
  value_proposition: "Value proposition minimum length."
`
		result2, _ := ValidateBusinessRequirements([]byte(yaml2), false)

		// Both should be handled (may produce warnings)
		_ = result1
		_ = result2
	})
}
