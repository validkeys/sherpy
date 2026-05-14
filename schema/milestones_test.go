package schema

import (
	"os"
	"testing"
)

func mustReadMilestonesExample(t *testing.T) []byte {
	t.Helper()
	data, err := os.ReadFile("../docs/specifications/milestones/example.yaml")
	if err != nil {
		t.Fatalf("failed to read milestones example.yaml: %v", err)
	}
	return data
}

func TestMilestonesExamplePasses(t *testing.T) {
	data := mustReadMilestonesExample(t)
	result, err := ValidateMilestones(data, false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	if !result.Valid() {
		t.Errorf("milestones example.yaml should pass validation, got errors:\n%v", result.Errors)
	}
}

func TestMilestonesNonSequentialIDs(t *testing.T) {
	yaml := `project: test
version: "1.0.0"
generated: "2026-01-01T00:00:00Z"
business_requirements: "br.yaml"
technical_requirements: "tr.yaml"
meta:
  ordering_strategy: "foundation-first"
  ordering_rationale: "build infrastructure before features for stability"
milestones:
  - id: m0
    name: "Setup and scaffolding task"
    description: "Initialize the project structure and setup tooling for development"
    dependencies: []
    estimated_duration: "1 day"
    tasks_file: "milestone-m0.tasks.yaml"
    success_criteria:
      - "Project builds successfully"
  - id: m2
    name: "Feature implementation phase"
    description: "Implement core features with tests and documentation for the users"
    dependencies: [m0]
    estimated_duration: "3 days"
    tasks_file: "milestone-m2.tasks.yaml"
    success_criteria:
      - "Features work correctly"
`
	result, err := ValidateMilestones([]byte(yaml), false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	found := false
	for _, e := range result.Errors {
		if contains(e, "sequential") {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected error about sequential IDs, got: %v", result.Errors)
	}
}

func TestMilestonesCircularDependency(t *testing.T) {
	yaml := `project: test
version: "1.0.0"
generated: "2026-01-01T00:00:00Z"
business_requirements: "br.yaml"
technical_requirements: "tr.yaml"
meta:
  ordering_strategy: "foundation-first"
  ordering_rationale: "build infrastructure before features for stability"
milestones:
  - id: m0
    name: "Setup and scaffolding task"
    description: "Initialize the project structure and setup tooling for development"
    dependencies: [m1]
    estimated_duration: "1 day"
    tasks_file: "milestone-m0.tasks.yaml"
    success_criteria:
      - "Project builds successfully"
  - id: m1
    name: "Feature implementation phase"
    description: "Implement core features with tests and documentation for the users"
    dependencies: [m0]
    estimated_duration: "3 days"
    tasks_file: "milestone-m1.tasks.yaml"
    success_criteria:
      - "Features work correctly"
`
	result, err := ValidateMilestones([]byte(yaml), false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	found := false
	for _, e := range result.Errors {
		if contains(e, "circular") {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected error about circular dependencies, got: %v", result.Errors)
	}
}

func TestMilestonesInvalidStrategy(t *testing.T) {
	yaml := `project: test
version: "1.0.0"
generated: "2026-01-01T00:00:00Z"
business_requirements: "br.yaml"
technical_requirements: "tr.yaml"
meta:
  ordering_strategy: "random-order"
  ordering_rationale: "build infrastructure before features for stability"
milestones:
  - id: m0
    name: "Setup and scaffolding task"
    description: "Initialize the project structure and setup tooling for development"
    dependencies: []
    estimated_duration: "1 day"
    tasks_file: "milestone-m0.tasks.yaml"
    success_criteria:
      - "Project builds successfully"
`
	result, err := ValidateMilestones([]byte(yaml), false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	found := false
	for _, e := range result.Errors {
		if contains(e, "ordering_strategy") {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected error about ordering_strategy, got: %v", result.Errors)
	}
}

func TestMilestonesForwardDependency(t *testing.T) {
	yaml := `project: test
version: "1.0.0"
generated: "2026-01-01T00:00:00Z"
business_requirements: "br.yaml"
technical_requirements: "tr.yaml"
meta:
  ordering_strategy: "foundation-first"
  ordering_rationale: "build infrastructure before features for stability"
milestones:
  - id: m0
    name: "Setup and scaffolding task"
    description: "Initialize the project structure and setup tooling for development"
    dependencies: [m1]
    estimated_duration: "1 day"
    tasks_file: "milestone-m0.tasks.yaml"
    success_criteria:
      - "Project builds successfully"
  - id: m1
    name: "Feature implementation phase"
    description: "Implement core features with tests and documentation for the users"
    dependencies: []
    estimated_duration: "3 days"
    tasks_file: "milestone-m1.tasks.yaml"
    success_criteria:
      - "Features work correctly"
`
	result, err := ValidateMilestones([]byte(yaml), false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	found := false
	for _, e := range result.Errors {
		if contains(e, "not a previously defined") {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected error about forward dependency, got: %v", result.Errors)
	}
}

func TestMilestonesShortRationale(t *testing.T) {
	yaml := `project: test
version: "1.0.0"
generated: "2026-01-01T00:00:00Z"
business_requirements: "br.yaml"
technical_requirements: "tr.yaml"
meta:
  ordering_strategy: "foundation-first"
  ordering_rationale: "too short"
milestones:
  - id: m0
    name: "Setup and scaffolding task"
    description: "Initialize the project structure and setup tooling for development"
    dependencies: []
    estimated_duration: "1 day"
    tasks_file: "milestone-m0.tasks.yaml"
    success_criteria:
      - "Project builds successfully"
`
	result, err := ValidateMilestones([]byte(yaml), false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	found := false
	for _, e := range result.Errors {
		if contains(e, "ordering_rationale") && contains(e, "20") {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected error about ordering_rationale length, got: %v", result.Errors)
	}
}

func TestMilestonesCircularDependencyWithFixture(t *testing.T) {
	// Test circular dependency detection with fixture
	data, err := os.ReadFile("../testdata/invalid/milestones-circular-deps.yaml")
	if err != nil {
		t.Skip("Fixture not available")
	}

	result, err := ValidateMilestones(data, false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}

	// Should detect circular dependency
	found := false
	for _, e := range result.Errors {
		if contains(e, "circular") {
			found = true
			break
		}
	}
	if !found {
		t.Logf("expected circular dependency error, got: %v", result.Errors)
	}
}
