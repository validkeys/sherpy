package jira

import (
	"strings"
	"testing"
)

func TestHashDeveloperSummary_Deterministic(t *testing.T) {
	summary := &DeveloperSummary{
		Title:   "Test Project",
		Content: "# Test Project\n\nSome content here.",
	}

	hash1 := HashDeveloperSummary(summary)
	hash2 := HashDeveloperSummary(summary)

	// Same input should produce same hash
	if hash1 != hash2 {
		t.Errorf("expected deterministic hash, got %q and %q", hash1, hash2)
	}

	// Hash should be prefixed with sha256:
	if !strings.HasPrefix(hash1, "sha256:") {
		t.Errorf("expected hash to be prefixed with 'sha256:', got %q", hash1)
	}
}

func TestHashDeveloperSummary_DifferentInput(t *testing.T) {
	summary1 := &DeveloperSummary{
		Title:   "Test Project",
		Content: "# Test Project\n\nSome content here.",
	}

	summary2 := &DeveloperSummary{
		Title:   "Different Project",
		Content: "# Test Project\n\nSome content here.",
	}

	hash1 := HashDeveloperSummary(summary1)
	hash2 := HashDeveloperSummary(summary2)

	// Different titles should produce different hashes
	if hash1 == hash2 {
		t.Error("expected different hashes for different titles")
	}
}

func TestHashMilestone_Deterministic(t *testing.T) {
	milestone := &Milestone{
		ID:                "m0",
		Name:              "Foundation",
		Description:       "Set up the project",
		EstimatedDuration: "1-2 days",
		SuccessCriteria:   []string{"Tests pass", "Build succeeds"},
		Dependencies:      []string{"m1", "m2"},
	}

	hash1 := HashMilestone(milestone)
	hash2 := HashMilestone(milestone)

	// Same input should produce same hash
	if hash1 != hash2 {
		t.Errorf("expected deterministic hash, got %q and %q", hash1, hash2)
	}

	// Hash with dependencies in different order should be the same (deterministic)
	milestone2 := &Milestone{
		ID:                "m0",
		Name:              "Foundation",
		Description:       "Set up the project",
		EstimatedDuration: "1-2 days",
		SuccessCriteria:   []string{"Tests pass", "Build succeeds"},
		Dependencies:      []string{"m2", "m1"}, // Different order
	}

	hash3 := HashMilestone(milestone2)
	if hash1 != hash3 {
		t.Error("expected same hash regardless of dependency order")
	}
}

func TestHashTask_FieldChange(t *testing.T) {
	baseTask := &Task{
		ID:              "m0-001",
		Name:            "Setup",
		Description:     "Initialize project",
		EstimateMinutes: 30,
		Type:            "code",
		Dependencies:    []string{"m0-000"},
	}

	baseHash := HashTask(baseTask)

	// Test changing each field produces different hash
	tests := []struct {
		name     string
		modifyFn func(*Task)
	}{
		{"name changed", func(t *Task) { t.Name = "Different Name" }},
		{"description changed", func(t *Task) { t.Description = "Different desc" }},
		{"estimate changed", func(t *Task) { t.EstimateMinutes = 60 }},
		{"type changed", func(t *Task) { t.Type = "test" }},
		{"dependencies changed", func(t *Task) { t.Dependencies = []string{"m0-001"} }},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Clone the task
			modifiedTask := &Task{
				ID:              baseTask.ID,
				Name:            baseTask.Name,
				Description:     baseTask.Description,
				EstimateMinutes: baseTask.EstimateMinutes,
				Type:            baseTask.Type,
				Dependencies:    append([]string{}, baseTask.Dependencies...),
			}

			// Modify it
			tt.modifyFn(modifiedTask)

			// Hash should be different
			modifiedHash := HashTask(modifiedTask)
			if baseHash == modifiedHash {
				t.Errorf("expected different hash after %s", tt.name)
			}
		})
	}
}
