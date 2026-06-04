package schema

import (
	"testing"
)

// TestNonFunctionalRequirementsFormats tests various formats for non_functional_requirements
// to diagnose the issue reported in GitHub issue #11
func TestNonFunctionalRequirementsFormats(t *testing.T) {
	baseYAML := `project: Test
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
`

	tests := []struct {
		name        string
		nfrSection  string
		shouldParse bool
		description string
	}{
		{
			name: "structured format (like example.yaml)",
			nfrSection: `non_functional_requirements:
  performance:
    - "Task views must load within 500ms"
    - "API response time < 200ms at p95"
  security:
    - "All data encrypted in transit (TLS 1.3)"
    - "Password policies enforce minimum 12 characters"
  usability:
    - "WCAG 2.1 Level AA accessibility compliance"
`,
			shouldParse: true,
			description: "The format used in example.yaml - structured with categories",
		},
		{
			name: "array of strings",
			nfrSection: `non_functional_requirements:
  - "Performance: Requirements text"
  - "Accessibility: Requirements text"
`,
			shouldParse: false,
			description: "Simple array of strings - does not match schema",
		},
		{
			name: "simple string",
			nfrSection: `non_functional_requirements: "Performance requirements text"
`,
			shouldParse: false,
			description: "Simple string value - does not match schema",
		},
		{
			name: "multiline string",
			nfrSection: `non_functional_requirements: |
  Performance requirements
  Accessibility requirements
`,
			shouldParse: false,
			description: "Multiline string - does not match schema",
		},
		{
			name: "array of objects",
			nfrSection: `non_functional_requirements:
  - category: Performance
    description: Performance requirements
    priority: HIGH
`,
			shouldParse: false,
			description: "Array of objects (like functional_requirements) - does not match schema",
		},
		{
			name:        "omitted (optional field)",
			nfrSection:  "",
			shouldParse: true,
			description: "Field is omitted - should be valid since it's optional",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			yaml := baseYAML + tt.nfrSection + `
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

			if tt.shouldParse {
				if err != nil {
					t.Errorf("Expected to parse successfully, got error: %v\nDescription: %s", err, tt.description)
				}
				if result != nil && !result.Valid() {
					t.Logf("Got validation errors (may be expected): %v", result.Errors)
				}
			} else {
				if err != nil {
					t.Logf("Got expected parse error: %v\nDescription: %s", err, tt.description)
				} else if result != nil && result.Valid() {
					t.Logf("Parsed but with unexpected structure\nDescription: %s", tt.description)
				}
			}
		})
	}
}

// TestNonFunctionalRequirementsExample validates the exact format from example.yaml
func TestNonFunctionalRequirementsExample(t *testing.T) {
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
non_functional_requirements:
  performance:
    - Task list views must load within 500ms
    - API response time must be < 200ms at p95
  security:
    - All data encrypted in transit (TLS 1.3)
    - Password policies enforce minimum 12 characters
  usability:
    - WCAG 2.1 Level AA accessibility compliance
  reliability:
    - 99.5% uptime SLA
  maintainability:
    - Code follows established patterns
  observability:
    - Structured logging for all critical operations
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
		t.Fatalf("Failed to parse valid non_functional_requirements format: %v", err)
	}
	if result != nil && !result.Valid() {
		t.Errorf("Validation failed for valid format, errors: %v", result.Errors)
	}
}

// TestNonFunctionalRequirementsPartial tests partial NFR definitions
func TestNonFunctionalRequirementsPartial(t *testing.T) {
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
non_functional_requirements:
  performance:
    - Task list views must load within 500ms
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
		t.Fatalf("Failed to parse partial non_functional_requirements: %v", err)
	}
	if result != nil && !result.Valid() {
		t.Logf("Validation errors (may be expected): %v", result.Errors)
	}
}
