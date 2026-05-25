package jira

import (
	"strings"
	"testing"
)

func TestFormatDryRunTable(t *testing.T) {
	plan := []PlanEntry{
		{Operation: "create", Type: "Epic", Key: "SHERPY-?", Summary: "Test Project", Indent: 0},
		{Operation: "create", Type: "Story", Key: "SHERPY-?", Summary: "Milestone 0", SP: 3, Indent: 1},
		{Operation: "update", Type: "Sub-task", Key: "SHERPY-10", Summary: "Task A", SP: 2, Labels: "[code]", Indent: 2},
		{Operation: "skip", Type: "Sub-task", Key: "SHERPY-11", Summary: "Task B", SP: 1, Labels: "[test]", Indent: 2},
	}

	output := FormatDryRunTable(plan)

	// Verify header
	if !strings.Contains(output, "DRY RUN - Planned Changes") {
		t.Errorf("Expected header, got: %s", output)
	}
	if !strings.Contains(output, "OPERATION  TYPE       KEY") {
		t.Errorf("Expected column headers, got: %s", output)
	}

	// Verify operations
	if !strings.Contains(output, "CREATE") {
		t.Errorf("Expected CREATE operation, got: %s", output)
	}
	if !strings.Contains(output, "UPDATE") {
		t.Errorf("Expected UPDATE operation, got: %s", output)
	}
	if !strings.Contains(output, "SKIP") {
		t.Errorf("Expected SKIP operation, got: %s", output)
	}

	// Verify indentation
	lines := strings.Split(output, "\n")
	for _, line := range lines {
		if strings.Contains(line, "Milestone 0") && !strings.Contains(line, "  Milestone") {
			t.Errorf("Expected Story to be indented, got: %s", line)
		}
		if strings.Contains(line, "Task A") && !strings.Contains(line, "    Task") {
			t.Errorf("Expected Sub-task to be double-indented, got: %s", line)
		}
	}

	// Verify labels
	if !strings.Contains(output, "[code]") {
		t.Errorf("Expected [code] label, got: %s", output)
	}
}

func TestFormatDryRunTable_Empty(t *testing.T) {
	output := FormatDryRunTable([]PlanEntry{})
	if !strings.Contains(output, "No changes planned") {
		t.Errorf("Expected 'No changes planned', got: %s", output)
	}
}

func TestFormatSyncSummary(t *testing.T) {
	result := &SyncResult{
		EpicsCreated:    1,
		EpicsUpdated:    0,
		EpicsSkipped:    0,
		StoriesCreated:  2,
		StoriesUpdated:  1,
		StoriesSkipped:  0,
		SubTasksCreated: 5,
		SubTasksUpdated: 2,
		SubTasksSkipped: 3,
		LinksCreated:    4,
		LinksSkipped:    1,
	}

	// Test dry-run summary
	dryRunOutput := FormatSyncSummary(result, true)
	if !strings.Contains(dryRunOutput, "Summary") {
		t.Errorf("Expected Summary header in dry-run, got: %s", dryRunOutput)
	}
	if !strings.Contains(dryRunOutput, "1 created") {
		t.Errorf("Expected Epic counts, got: %s", dryRunOutput)
	}

	// Test real sync summary
	syncOutput := FormatSyncSummary(result, false)
	if !strings.Contains(syncOutput, "Sync Complete") {
		t.Errorf("Expected Sync Complete header, got: %s", syncOutput)
	}
	if !strings.Contains(syncOutput, "✓") {
		t.Errorf("Expected success checkmark, got: %s", syncOutput)
	}
}

func TestFormatProgress(t *testing.T) {
	tests := []struct {
		name       string
		current    int
		total      int
		entityType string
		operation  string
		want       string
	}{
		{"with count", 2, 5, "Stories", "Creating", "Creating Stories 2/5..."},
		{"without count", 0, 0, "Epic", "Creating", "Creating Epic..."},
		{"updating", 1, 3, "Sub-tasks", "Updating", "Updating Sub-tasks 1/3..."},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := FormatProgress(tt.current, tt.total, tt.entityType, tt.operation)
			if got != tt.want {
				t.Errorf("FormatProgress() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestFormatDiscoveryReport(t *testing.T) {
	result := &DiscoverResult{
		DeveloperSummary: "developer-summary.md",
		Milestones:       "implementation/milestones.yaml",
		TasksDir:         "implementation/tasks",
		Timeline:         "",
		FileStatuses: []FileStatus{
			{
				Name:     "developer-summary.md",
				Required: true,
				Found:    true,
				Path:     "developer-summary.md",
			},
			{
				Name:     "milestones.yaml",
				Required: true,
				Found:    true,
				Path:     "implementation/milestones.yaml",
			},
			{
				Name:     "milestone task files",
				Required: true,
				Found:    true,
				Path:     "implementation/tasks",
			},
			{
				Name:     "timeline.yaml",
				Required: false,
				Found:    false,
				Path:     "",
			},
		},
	}

	output := FormatDiscoveryReport(result)

	// Verify header
	if !strings.Contains(output, "File Discovery Report") {
		t.Errorf("Expected header, got: %s", output)
	}

	// Verify found files show checkmark and path
	if !strings.Contains(output, "✓") {
		t.Errorf("Expected checkmark for found files, got: %s", output)
	}
	if !strings.Contains(output, "found at:") {
		t.Errorf("Expected 'found at:' for found files, got: %s", output)
	}
	if !strings.Contains(output, "implementation/milestones.yaml") {
		t.Errorf("Expected milestone path, got: %s", output)
	}

	// Verify missing files show X and (optional)
	if !strings.Contains(output, "✗") {
		t.Errorf("Expected X mark for missing files, got: %s", output)
	}
	if !strings.Contains(output, "not found (optional)") {
		t.Errorf("Expected '(optional)' for timeline, got: %s", output)
	}
}

func TestFormatDiscoveryReport_AllMissing(t *testing.T) {
	result := &DiscoverResult{
		FileStatuses: []FileStatus{
			{
				Name:     "developer-summary.md",
				Required: true,
				Found:    false,
			},
			{
				Name:     "milestones.yaml",
				Required: true,
				Found:    false,
			},
		},
	}

	output := FormatDiscoveryReport(result)

	// All should show X mark
	xCount := strings.Count(output, "✗")
	if xCount != 2 {
		t.Errorf("Expected 2 X marks, got %d in: %s", xCount, output)
	}

	// Should show (required) for required files
	if !strings.Contains(output, "not found (required)") {
		t.Errorf("Expected '(required)' for missing required files, got: %s", output)
	}
}

func TestFormatRemediations(t *testing.T) {
	result := &DiscoverResult{
		FileStatuses: []FileStatus{
			{
				Name:        "developer-summary.md",
				Required:    true,
				Found:       false,
				Suggestions: []string{"Found PROJECT-SUMMARY.md - try: mv PROJECT-SUMMARY.md developer-summary.md"},
			},
			{
				Name:        "milestones.yaml",
				Required:    true,
				Found:       false,
				Suggestions: []string{"Expected location: ./implementation/milestones.yaml", "Run 'sherpy plan' to generate implementation artifacts"},
			},
		},
	}

	output := FormatRemediations(result)

	// Verify header
	if !strings.Contains(output, "Suggestions:") {
		t.Errorf("Expected Suggestions header, got: %s", output)
	}

	// Verify bullets
	bulletCount := strings.Count(output, "•")
	if bulletCount != 3 {
		t.Errorf("Expected 3 bullet points, got %d in: %s", bulletCount, output)
	}

	// Verify specific suggestions
	if !strings.Contains(output, "mv PROJECT-SUMMARY.md") {
		t.Errorf("Expected rename suggestion, got: %s", output)
	}
	if !strings.Contains(output, "Expected location:") {
		t.Errorf("Expected location suggestion, got: %s", output)
	}
}

func TestFormatRemediations_NoSuggestions(t *testing.T) {
	result := &DiscoverResult{
		FileStatuses: []FileStatus{
			{
				Name:        "developer-summary.md",
				Required:    true,
				Found:       true,
				Suggestions: nil,
			},
		},
	}

	output := FormatRemediations(result)

	// Should return empty string when all files are found
	if output != "" {
		t.Errorf("Expected empty output for complete discovery, got: %s", output)
	}
}
