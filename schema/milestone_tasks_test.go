package schema

import (
	"os"
	"testing"
)

func mustReadMilestoneTasksExample(t *testing.T) []byte {
	t.Helper()
	data, err := os.ReadFile("../docs/specifications/milestone-tasks/example.yaml")
	if err != nil {
		t.Fatalf("failed to read milestone-tasks example.yaml: %v", err)
	}
	return data
}

func TestMilestoneTasksExamplePasses(t *testing.T) {
	data := mustReadMilestoneTasksExample(t)
	result, err := ValidateMilestoneTasks(data, false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	if !result.Valid() {
		t.Errorf("milestone-tasks example.yaml should pass validation, got errors:\n%v", result.Errors)
	}
}

func TestMilestoneTasksNonSequentialIDs(t *testing.T) {
	yaml := `milestone: m1
name: "User Authentication Service"
generated: "2026-01-01T00:00:00Z"
global_constraints:
  allowed_patterns: ["use Effect"]
  forbidden_patterns: ["no async/await"]
  tdd_required: true
  max_task_duration_minutes: 120
  commit_strategy: "commit after each task"
quality_gates:
  - stage: pre-commit
    commands: ["npm run lint"]
tasks:
  - id: m1-001
    name: "Create User model with Schema"
    description: "Define User data model using Effect Schema.Class with validation for the system"
    estimate_minutes: 45
    type: code
    dependencies: []
    files:
      create: ["src/models/user.ts"]
    instructions: "Create the User model following the Schema.Class pattern with full validation rules and type inference"
  - id: m1-005
    name: "Create UserService business logic"
    description: "Implement service layer coordinating user operations with validation and business rules"
    estimate_minutes: 60
    type: code
    dependencies: [m1-001]
    files:
      create: ["src/services/user-service.ts"]
    instructions: "Create UserService with all business logic methods following the Effect.Service pattern with proper error handling"
`
	result, err := ValidateMilestoneTasks([]byte(yaml), false)
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

func TestMilestoneTasksInvalidTaskType(t *testing.T) {
	yaml := `milestone: m0
name: "Setup and scaffolding task"
generated: "2026-01-01T00:00:00Z"
global_constraints:
  allowed_patterns: ["use stdlib"]
  forbidden_patterns: ["no external deps"]
  tdd_required: false
  max_task_duration_minutes: 120
  commit_strategy: "commit after each task"
quality_gates:
  - stage: pre-commit
    commands: ["go test"]
tasks:
  - id: m0-001
    name: "Initialize project structure"
    description: "Set up the Go module with all necessary directories and configuration for the project"
    estimate_minutes: 30
    type: invalid
    dependencies: []
    files:
      create: ["main.go"]
    instructions: "Initialize the Go project module with proper directory structure following Go conventions and standards"
`
	result, err := ValidateMilestoneTasks([]byte(yaml), false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	if result.Valid() {
		t.Fatal("expected failure for invalid task type")
	}
}

func TestMilestoneTasksExceedsMaxDuration(t *testing.T) {
	yaml := `milestone: m0
name: "Setup and scaffolding task"
generated: "2026-01-01T00:00:00Z"
global_constraints:
  allowed_patterns: ["use stdlib"]
  forbidden_patterns: ["no external deps"]
  tdd_required: false
  max_task_duration_minutes: 60
  commit_strategy: "commit after each task"
quality_gates:
  - stage: pre-commit
    commands: ["go test"]
tasks:
  - id: m0-001
    name: "Initialize project structure"
    description: "Set up the Go module with all necessary directories and configuration for the project"
    estimate_minutes: 120
    type: code
    dependencies: []
    files:
      create: ["main.go"]
    instructions: "Initialize the Go project module with proper directory structure following Go conventions and standards"
`
	result, err := ValidateMilestoneTasks([]byte(yaml), false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	found := false
	for _, e := range result.Errors {
		if contains(e, "exceeds") && contains(e, "max_task_duration") {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected error about exceeding max duration, got: %v", result.Errors)
	}
}

func TestMilestoneTasksEmptyFiles(t *testing.T) {
	yaml := `milestone: m0
name: "Setup and scaffolding task"
generated: "2026-01-01T00:00:00Z"
global_constraints:
  allowed_patterns: ["use stdlib"]
  forbidden_patterns: ["no external deps"]
  tdd_required: false
  max_task_duration_minutes: 120
  commit_strategy: "commit after each task"
quality_gates:
  - stage: pre-commit
    commands: ["go test"]
tasks:
  - id: m0-001
    name: "Initialize project structure"
    description: "Set up the Go module with all necessary directories and configuration for the project"
    estimate_minutes: 30
    type: code
    dependencies: []
    files: {}
    instructions: "Initialize the Go project module with proper directory structure following Go conventions and standards"
`
	result, err := ValidateMilestoneTasks([]byte(yaml), false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	if result.Valid() {
		t.Fatal("expected failure for empty files")
	}
}

func TestMilestoneTasksInvalidGateStage(t *testing.T) {
	yaml := `milestone: m0
name: "Setup and scaffolding task"
generated: "2026-01-01T00:00:00Z"
global_constraints:
  allowed_patterns: ["use stdlib"]
  forbidden_patterns: ["no external deps"]
  tdd_required: false
  max_task_duration_minutes: 120
  commit_strategy: "commit after each task"
quality_gates:
  - stage: invalid-stage
    commands: ["go test"]
tasks:
  - id: m0-001
    name: "Initialize project structure"
    description: "Set up the Go module with all necessary directories and configuration for the project"
    estimate_minutes: 30
    type: code
    dependencies: []
    files:
      create: ["main.go"]
    instructions: "Initialize the Go project module with proper directory structure following Go conventions and standards"
`
	result, err := ValidateMilestoneTasks([]byte(yaml), false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	found := false
	for _, e := range result.Errors {
		if contains(e, "stage") {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected error about gate stage, got: %v", result.Errors)
	}
}

func TestMilestoneTasksEdgeCases(t *testing.T) {
	t.Run("empty dependencies array doesn't crash", func(t *testing.T) {
		yaml := `
milestone: m0
name: "Test milestone"
generated: "2024-01-01"
global_constraints:
  allowed_patterns: ["pattern"]
  forbidden_patterns: ["forbidden"]
  tdd_required: true
  max_task_duration_minutes: 120
  commit_strategy: "commit after each task"
quality_gates:
  - stage: pre-commit
    commands: ["test"]
    criteria:
      - "test passes"
tasks:
  - id: m0-001
    name: "Test task"
    description: "A test task description that meets the minimum length"
    estimate_minutes: 60
    type: code
    dependencies: []
    files:
      create: ["test.txt"]
    instructions: "Test instructions that meet the minimum length requirement which must be at least one hundred chars."
`
		_, err := ValidateMilestoneTasks([]byte(yaml), false)
		if err != nil {
			t.Errorf("empty dependencies should not cause parse error: %v", err)
		}
	})
}

func TestMilestoneTasksWithTaskSummaries(t *testing.T) {
	yaml := `milestone: m1
name: "Test milestone with summaries"
generated: "2026-01-01T00:00:00Z"
task_summaries:
  m1-001: "Creates the core data model with validation rules."
  m1-002: "Tests the data model validation logic."
global_constraints:
  allowed_patterns: ["use Effect"]
  forbidden_patterns: ["no async/await"]
  tdd_required: true
  max_task_duration_minutes: 120
  commit_strategy: "commit after each task"
quality_gates:
  - stage: pre-commit
    commands: ["npm run lint"]
tasks:
  - id: m1-001
    name: "Create User model with Schema"
    description: "Define User data model using Effect Schema.Class with validation for the system"
    estimate_minutes: 45
    type: code
    dependencies: []
    files:
      create: ["src/models/user.ts"]
    instructions: "Create the User model following the Schema.Class pattern with full validation rules and type inference"
  - id: m1-002
    name: "Add User model unit tests"
    description: "Comprehensive test coverage for User model validation rules and edge cases"
    estimate_minutes: 30
    type: test
    dependencies: [m1-001]
    files:
      create: ["src/models/user.test.ts"]
    instructions: "Create comprehensive unit tests for the User model covering all validation rules and edge cases with proper assertions"
`
	result, err := ValidateMilestoneTasks([]byte(yaml), false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	if !result.Valid() {
		t.Errorf("milestone with task_summaries should pass validation, got errors:\n%v", result.Errors)
	}
}

func TestMilestoneTasksSummariesMismatchedIDs(t *testing.T) {
	yaml := `milestone: m1
name: "Test milestone with summaries"
generated: "2026-01-01T00:00:00Z"
task_summaries:
  m1-001: "Creates the core data model with validation rules."
  m1-999: "This task ID doesn't exist in the tasks array."
global_constraints:
  allowed_patterns: ["use Effect"]
  forbidden_patterns: ["no async/await"]
  tdd_required: true
  max_task_duration_minutes: 120
  commit_strategy: "commit after each task"
quality_gates:
  - stage: pre-commit
    commands: ["npm run lint"]
tasks:
  - id: m1-001
    name: "Create User model with Schema"
    description: "Define User data model using Effect Schema.Class with validation for the system"
    estimate_minutes: 45
    type: code
    dependencies: []
    files:
      create: ["src/models/user.ts"]
    instructions: "Create the User model following the Schema.Class pattern with full validation rules and type inference"
`
	result, err := ValidateMilestoneTasks([]byte(yaml), false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	found := false
	for _, e := range result.Errors {
		if contains(e, "m1-999") && contains(e, "task_summaries") {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected error about mismatched task_summaries ID, got: %v", result.Errors)
	}
}

func TestMilestoneTasksSummariesTooShort(t *testing.T) {
	yaml := `milestone: m1
name: "Test milestone with summaries"
generated: "2026-01-01T00:00:00Z"
task_summaries:
  m1-001: "Too short"
global_constraints:
  allowed_patterns: ["use Effect"]
  forbidden_patterns: ["no async/await"]
  tdd_required: true
  max_task_duration_minutes: 120
  commit_strategy: "commit after each task"
quality_gates:
  - stage: pre-commit
    commands: ["npm run lint"]
tasks:
  - id: m1-001
    name: "Create User model with Schema"
    description: "Define User data model using Effect Schema.Class with validation for the system"
    estimate_minutes: 45
    type: code
    dependencies: []
    files:
      create: ["src/models/user.ts"]
    instructions: "Create the User model following the Schema.Class pattern with full validation rules and type inference"
`
	result, err := ValidateMilestoneTasks([]byte(yaml), false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	found := false
	for _, e := range result.Errors {
		if contains(e, "m1-001") && contains(e, "20 characters") {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected error about short summary, got: %v", result.Errors)
	}
}
