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
