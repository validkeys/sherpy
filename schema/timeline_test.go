package schema

import (
	"os"
	"testing"
)

func mustReadTimelineExample(t *testing.T) []byte {
	t.Helper()
	data, err := os.ReadFile("../docs/specifications/timeline/example.yaml")
	if err != nil {
		t.Fatalf("failed to read timeline example.yaml: %v", err)
	}
	return data
}

func TestTimelineExamplePasses(t *testing.T) {
	data := mustReadTimelineExample(t)
	result, err := ValidateTimeline(data, false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	if !result.Valid() {
		t.Errorf("timeline example.yaml should pass validation, got errors:\n%v", result.Errors)
	}
}

func TestTimelineInvalidDeliveryModel(t *testing.T) {
	yaml := `project: test
version: "1.0.0"
generated: "2026-01-01T00:00:00Z"
milestones_file: "milestones.yaml"
summary:
  total_development_days: 10
  total_delivery_days: 20
  is_large_project: false
  milestone_count: 1
  qa_rounds: 1
  qa_days_per_round: 3
  production_deploy_date: "2026-06-01"
  delivery_model: "invalid-model"
timeline:
  - id: m0
    name: "Setup milestone for the project"
    type: milestone
    start_day: 0
    completion_day: 5
    estimated_days: 5
    dependencies: []
workback:
  production_deploy_date: "2026-06-01"
  project_start_date: "2026-05-01"
  schedule:
    - id: m0
      name: "Setup milestone for the project"
      type: milestone
      start_date: "2026-05-01"
      completion_date: "2026-05-08"
`
	result, err := ValidateTimeline([]byte(yaml), false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	found := false
	for _, e := range result.Errors {
		if contains(e, "delivery_model") {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected error about delivery_model, got: %v", result.Errors)
	}
}

func TestTimelineCompletionDayMismatch(t *testing.T) {
	yaml := `project: test
version: "1.0.0"
generated: "2026-01-01T00:00:00Z"
milestones_file: "milestones.yaml"
summary:
  total_development_days: 10
  total_delivery_days: 20
  is_large_project: false
  milestone_count: 1
  qa_rounds: 1
  qa_days_per_round: 3
  production_deploy_date: "2026-06-01"
  delivery_model: "foundation-first"
timeline:
  - id: m0
    name: "Setup milestone for the project"
    type: milestone
    start_day: 0
    completion_day: 3
    estimated_days: 5
    dependencies: []
workback:
  production_deploy_date: "2026-06-01"
  project_start_date: "2026-05-01"
  schedule:
    - id: m0
      name: "Setup milestone for the project"
      type: milestone
      start_date: "2026-05-01"
      completion_date: "2026-05-08"
`
	result, err := ValidateTimeline([]byte(yaml), false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	found := false
	for _, e := range result.Errors {
		if contains(e, "completion_day") && contains(e, "start_day") && contains(e, "estimated_days") {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected error about completion_day math, got: %v", result.Errors)
	}
}

func TestTimelineMilestoneCountMismatch(t *testing.T) {
	yaml := `project: test
version: "1.0.0"
generated: "2026-01-01T00:00:00Z"
milestones_file: "milestones.yaml"
summary:
  total_development_days: 10
  total_delivery_days: 20
  is_large_project: false
  milestone_count: 3
  qa_rounds: 1
  qa_days_per_round: 3
  production_deploy_date: "2026-06-01"
  delivery_model: "foundation-first"
timeline:
  - id: m0
    name: "Setup milestone for the project"
    type: milestone
    start_day: 0
    completion_day: 5
    estimated_days: 5
    dependencies: []
workback:
  production_deploy_date: "2026-06-01"
  project_start_date: "2026-05-01"
  schedule:
    - id: m0
      name: "Setup milestone for the project"
      type: milestone
      start_date: "2026-05-01"
      completion_date: "2026-05-08"
`
	result, err := ValidateTimeline([]byte(yaml), false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	found := false
	for _, e := range result.Errors {
		if contains(e, "milestone_count") {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected error about milestone_count, got: %v", result.Errors)
	}
}

func TestTimelineDeliveryDaysLessThanDevDays(t *testing.T) {
	yaml := `project: test
version: "1.0.0"
generated: "2026-01-01T00:00:00Z"
milestones_file: "milestones.yaml"
summary:
  total_development_days: 20
  total_delivery_days: 10
  is_large_project: false
  milestone_count: 1
  qa_rounds: 1
  qa_days_per_round: 3
  production_deploy_date: "2026-06-01"
  delivery_model: "foundation-first"
timeline:
  - id: m0
    name: "Setup milestone for the project"
    type: milestone
    start_day: 0
    completion_day: 5
    estimated_days: 5
    dependencies: []
workback:
  production_deploy_date: "2026-06-01"
  project_start_date: "2026-05-01"
  schedule:
    - id: m0
      name: "Setup milestone for the project"
      type: milestone
      start_date: "2026-05-01"
      completion_date: "2026-05-08"
`
	result, err := ValidateTimeline([]byte(yaml), false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	found := false
	for _, e := range result.Errors {
		if contains(e, "total_delivery_days") {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected error about total_delivery_days, got: %v", result.Errors)
	}
}

func TestTimelineWorkbackDeployDateMismatch(t *testing.T) {
	yaml := `project: test
version: "1.0.0"
generated: "2026-01-01T00:00:00Z"
milestones_file: "milestones.yaml"
summary:
  total_development_days: 10
  total_delivery_days: 20
  is_large_project: false
  milestone_count: 1
  qa_rounds: 1
  qa_days_per_round: 3
  production_deploy_date: "2026-06-01"
  delivery_model: "foundation-first"
timeline:
  - id: m0
    name: "Setup milestone for the project"
    type: milestone
    start_day: 0
    completion_day: 5
    estimated_days: 5
    dependencies: []
workback:
  production_deploy_date: "2026-07-01"
  project_start_date: "2026-05-01"
  schedule:
    - id: m0
      name: "Setup milestone for the project"
      type: milestone
      start_date: "2026-05-01"
      completion_date: "2026-05-08"
`
	result, err := ValidateTimeline([]byte(yaml), false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	found := false
	for _, e := range result.Errors {
		if contains(e, "workback") && contains(e, "production_deploy_date") && contains(e, "match") {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected error about deploy date mismatch, got: %v", result.Errors)
	}
}
