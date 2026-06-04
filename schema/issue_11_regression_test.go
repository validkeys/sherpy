package schema

import (
	"strings"
	"testing"
)

// TestIssue11RegressionTest verifies the fix for GitHub issue #11
// https://github.com/validkeys/sherpy/issues/11
//
// The issue reported that the validator produced a misleading error message:
// "Found a map/object where a simple string value was expected"
// when the actual problem was the opposite: a string was provided where
// a structured object (BRNonFunctionalRequirements) was expected.
//
// This regression test ensures:
// 1. The error message is now correct and helpful
// 2. The error clearly states "string where a structured object was expected"
// 3. The error provides field-specific guidance for non_functional_requirements
func TestIssue11RegressionTest(t *testing.T) {
	tests := []struct {
		name                 string
		yamlContent          string
		expectedErrorPhrase  string
		unexpectedErrorPhrase string
		shouldShowNFRExample bool
	}{
		{
			name: "string value (original bug report)",
			yamlContent: `project: Test
version: "1.0.0"
generated: "2026-01-01T00:00:00Z"
overview:
  problem: "this is a problem statement that is at least fifty characters long for testing"
  value_proposition: "this is a value proposition that is at least thirty characters long"
  scope:
    in_scope: ["item"]
personas:
  - name: "Alice"
    description: "a test persona with twenty characters minimum"
    goals: ["goal"]
    pain_points: ["pain"]
use_cases:
  - name: "Use Case"
    actor: "Alice"
    description: "a description that is twenty characters min"
    outcome: "an outcome here"
functional_requirements:
  - id: "FR-1"
    category: "Test"
    description: "a description that is twenty characters min"
    priority: high
    rationale: "a rationale here"
non_functional_requirements: "Performance requirements text"
`,
			expectedErrorPhrase:   "Found a string where a structured object was expected",
			unexpectedErrorPhrase: "Found a map/object where a simple string value was expected",
			shouldShowNFRExample:  true,
		},
		{
			name: "multiline string value",
			yamlContent: `project: Test
version: "1.0.0"
generated: "2026-01-01T00:00:00Z"
overview:
  problem: "this is a problem statement that is at least fifty characters long for testing"
  value_proposition: "this is a value proposition that is at least thirty characters long"
  scope:
    in_scope: ["item"]
personas:
  - name: "Alice"
    description: "a test persona with twenty characters minimum"
    goals: ["goal"]
    pain_points: ["pain"]
use_cases:
  - name: "Use Case"
    actor: "Alice"
    description: "a description that is twenty characters min"
    outcome: "an outcome here"
functional_requirements:
  - id: "FR-1"
    category: "Test"
    description: "a description that is twenty characters min"
    priority: high
    rationale: "a rationale here"
non_functional_requirements: |
  Performance requirements
  Accessibility requirements
`,
			expectedErrorPhrase:   "Found a string where a structured object was expected",
			unexpectedErrorPhrase: "Found a map/object where a simple string value was expected",
			shouldShowNFRExample:  true,
		},
		{
			name: "array value",
			yamlContent: `project: Test
version: "1.0.0"
generated: "2026-01-01T00:00:00Z"
overview:
  problem: "this is a problem statement that is at least fifty characters long for testing"
  value_proposition: "this is a value proposition that is at least thirty characters long"
  scope:
    in_scope: ["item"]
personas:
  - name: "Alice"
    description: "a test persona with twenty characters minimum"
    goals: ["goal"]
    pain_points: ["pain"]
use_cases:
  - name: "Use Case"
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
  - "Performance: Requirements text"
  - "Accessibility: Requirements text"
`,
			expectedErrorPhrase:   "Found an array where a structured object was expected",
			unexpectedErrorPhrase: "Found a map/object where a simple string value was expected",
			shouldShowNFRExample:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := ValidateBusinessRequirements([]byte(tt.yamlContent), false)

			if err == nil {
				t.Fatal("Expected validation error, but got nil")
			}

			errMsg := err.Error()

			// Verify the correct error message is present
			if !strings.Contains(errMsg, tt.expectedErrorPhrase) {
				t.Errorf("Expected error message to contain %q, but got:\n%s",
					tt.expectedErrorPhrase, errMsg)
			}

			// Verify the old incorrect error message is NOT present
			if strings.Contains(errMsg, tt.unexpectedErrorPhrase) {
				t.Errorf("Error message should NOT contain the old incorrect phrase %q, but got:\n%s",
					tt.unexpectedErrorPhrase, errMsg)
			}

			// Verify field-specific guidance is provided for NFR
			if tt.shouldShowNFRExample {
				if !strings.Contains(errMsg, "performance:") {
					t.Errorf("Expected error message to show NFR example format with 'performance:', but got:\n%s",
						errMsg)
				}
				if !strings.Contains(errMsg, "security, usability") || !strings.Contains(errMsg, "maintainability") {
					t.Errorf("Expected error message to list NFR categories, but got:\n%s",
						errMsg)
				}
			}

			// Verify helpful suggestions are provided
			if !strings.Contains(errMsg, "example.yaml") {
				t.Errorf("Expected error message to reference example.yaml, but got:\n%s",
					errMsg)
			}

			if !strings.Contains(errMsg, "sherpy prompt") {
				t.Errorf("Expected error message to suggest 'sherpy prompt' command, but got:\n%s",
					errMsg)
			}
		})
	}
}

// TestIssue11CorrectFormatStillWorks verifies that the correct NFR format
// continues to validate successfully after the error message fix
func TestIssue11CorrectFormatStillWorks(t *testing.T) {
	yaml := `project: Test
version: "1.0.0"
generated: "2026-01-01T00:00:00Z"
overview:
  problem: "this is a problem statement that is at least fifty characters long for testing"
  value_proposition: "this is a value proposition that is at least thirty characters long"
  scope:
    in_scope: ["item"]
personas:
  - name: "Alice"
    description: "a test persona with twenty characters minimum"
    goals: ["goal"]
    pain_points: ["pain"]
use_cases:
  - name: "Use Case"
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
    - "Task views must load within 500ms"
    - "API response time < 200ms at p95"
  security:
    - "All data encrypted in transit (TLS 1.3)"
    - "Password policies enforce minimum 12 characters"
  usability:
    - "WCAG 2.1 Level AA accessibility compliance"
  reliability:
    - "99.5% uptime SLA"
  maintainability:
    - "Code follows established patterns"
  observability:
    - "Structured logging for all critical operations"
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
		t.Fatalf("Correct NFR format should parse successfully, got error: %v", err)
	}

	if result != nil && !result.Valid() {
		t.Errorf("Correct NFR format should validate successfully, got errors: %v", result.Errors)
	}
}
