package jira

import (
	"fmt"
	"strings"
)

// FormatDryRunTable renders a pretty table view of the dry-run plan.
func FormatDryRunTable(plan []PlanEntry) string {
	if len(plan) == 0 {
		return "No changes planned.\n"
	}

	var b strings.Builder
	b.WriteString("\n=== DRY RUN - Planned Changes ===\n\n")

	// Header
	b.WriteString("OPERATION  TYPE       KEY         SP   SUMMARY\n")
	b.WriteString(strings.Repeat("-", 80) + "\n")

	// Rows
	for _, entry := range plan {
		// Indent based on hierarchy (Epic=0, Story=1, Sub-task=2)
		indent := strings.Repeat("  ", entry.Indent)

		// Format operation with color indicators
		op := entry.Operation
		switch op {
		case "create":
			op = "CREATE"
		case "update":
			op = "UPDATE"
		case "skip":
			op = "SKIP"
		}

		// Format type
		issueType := entry.Type
		if len(issueType) < 10 {
			issueType = issueType + strings.Repeat(" ", 10-len(issueType))
		}

		// Format key
		key := entry.Key
		if len(key) < 11 {
			key = key + strings.Repeat(" ", 11-len(key))
		}

		// Format story points
		spStr := "-"
		if entry.SP > 0 {
			spStr = fmt.Sprintf("%d", entry.SP)
		}
		if len(spStr) < 4 {
			spStr = spStr + strings.Repeat(" ", 4-len(spStr))
		}

		// Format summary with indentation and labels
		summary := indent + entry.Summary
		if entry.Labels != "" {
			summary = summary + " " + entry.Labels
		}

		// Write row
		fmt.Fprintf(&b, "%-10s %-10s %-11s %-4s %s\n", op, issueType, key, spStr, summary)
	}

	b.WriteString("\n")
	return b.String()
}

// FormatSyncSummary renders a summary of sync results.
func FormatSyncSummary(result *SyncResult, dryRun bool) string {
	var b strings.Builder

	if dryRun {
		b.WriteString("\n=== Summary ===\n")
	} else {
		b.WriteString("\n=== Sync Complete ===\n")
	}

	// Counts
	fmt.Fprintf(&b, "Epics:     %d created, %d updated, %d skipped\n", result.EpicsCreated, result.EpicsUpdated, result.EpicsSkipped)
	fmt.Fprintf(&b, "Stories:   %d created, %d updated, %d skipped\n", result.StoriesCreated, result.StoriesUpdated, result.StoriesSkipped)
	fmt.Fprintf(&b, "Sub-tasks: %d created, %d updated, %d skipped\n", result.SubTasksCreated, result.SubTasksUpdated, result.SubTasksSkipped)
	fmt.Fprintf(&b, "Links:     %d created, %d skipped\n", result.LinksCreated, result.LinksSkipped)

	// Errors
	if len(result.Errors) > 0 {
		b.WriteString("\n⚠ Errors:\n")
		for _, e := range result.Errors {
			fmt.Fprintf(&b, "  %s (%s): %v\n", e.EntityID, e.Operation, e.Error)
		}
	}

	if !dryRun {
		b.WriteString("\n✓ All changes pushed to Jira!\n")
	}

	return b.String()
}

// FormatProgress renders a progress indicator for sync operations.
func FormatProgress(current, total int, entityType, operation string) string {
	if total == 0 {
		return fmt.Sprintf("%s %s...", operation, entityType)
	}
	return fmt.Sprintf("%s %s %d/%d...", operation, entityType, current, total)
}
