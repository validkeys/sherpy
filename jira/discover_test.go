package jira

import (
	"os"
	"path/filepath"
	"testing"
)

// TestDiscoverFiles_ConventionFirst tests that convention-based search finds files
// in the standard sherpy directory structure (docs/**/implementation/milestones.yaml)
func TestDiscoverFiles_ConventionFirst(t *testing.T) {
	root := t.TempDir()

	// Create standard sherpy structure
	implDir := filepath.Join(root, "docs", "plan", "002-pm", "implementation")
	tasksDir := filepath.Join(implDir, "tasks")
	if err := os.MkdirAll(tasksDir, 0755); err != nil {
		t.Fatal(err)
	}

	// Create required files
	summaryPath := filepath.Join(root, "docs", "plan", "002-pm", "developer-summary.md")
	if err := os.WriteFile(summaryPath, []byte("# Project"), 0644); err != nil {
		t.Fatal(err)
	}

	milestonesPath := filepath.Join(implDir, "milestones.yaml")
	if err := os.WriteFile(milestonesPath, []byte("milestones:\n  - id: m0\n"), 0644); err != nil {
		t.Fatal(err)
	}

	taskPath := filepath.Join(tasksDir, "milestone-m0.tasks.yaml")
	if err := os.WriteFile(taskPath, []byte("tasks:\n  - id: m0-001\n"), 0644); err != nil {
		t.Fatal(err)
	}

	timelinePath := filepath.Join(root, "docs", "plan", "002-pm", "timeline.yaml")
	if err := os.WriteFile(timelinePath, []byte("workback:\n"), 0644); err != nil {
		t.Fatal(err)
	}

	result, err := DiscoverFiles(root)
	if err != nil {
		t.Fatalf("DiscoverFiles failed: %v", err)
	}

	// Verify all paths are found and relative to root
	expectedSummary := filepath.Join("docs", "plan", "002-pm", "developer-summary.md")
	if result.DeveloperSummary != expectedSummary {
		t.Errorf("DeveloperSummary = %q, want %q", result.DeveloperSummary, expectedSummary)
	}

	expectedMilestones := filepath.Join("docs", "plan", "002-pm", "implementation", "milestones.yaml")
	if result.Milestones != expectedMilestones {
		t.Errorf("Milestones = %q, want %q", result.Milestones, expectedMilestones)
	}

	expectedTasksDir := filepath.Join("docs", "plan", "002-pm", "implementation", "tasks")
	if result.TasksDir != expectedTasksDir {
		t.Errorf("TasksDir = %q, want %q", result.TasksDir, expectedTasksDir)
	}

	expectedTimeline := filepath.Join("docs", "plan", "002-pm", "timeline.yaml")
	if result.Timeline != expectedTimeline {
		t.Errorf("Timeline = %q, want %q", result.Timeline, expectedTimeline)
	}

	if len(result.Warnings) != 0 {
		t.Errorf("Expected no warnings, got: %v", result.Warnings)
	}
}

// TestDiscoverFiles_RecursiveFallback tests that recursive fallback finds files
// when they're not in the conventional structure
func TestDiscoverFiles_RecursiveFallback(t *testing.T) {
	root := t.TempDir()

	// Create flat structure (non-conventional)
	if err := os.WriteFile(filepath.Join(root, "developer-summary.md"), []byte("# Project"), 0644); err != nil {
		t.Fatal(err)
	}

	if err := os.WriteFile(filepath.Join(root, "milestones.yaml"), []byte("milestones:\n  - id: m0\n"), 0644); err != nil {
		t.Fatal(err)
	}

	tasksDir := filepath.Join(root, "tasks")
	if err := os.MkdirAll(tasksDir, 0755); err != nil {
		t.Fatal(err)
	}

	if err := os.WriteFile(filepath.Join(tasksDir, "milestone-m0.tasks.yaml"), []byte("tasks:\n"), 0644); err != nil {
		t.Fatal(err)
	}

	if err := os.WriteFile(filepath.Join(root, "timeline.yaml"), []byte("workback:\n"), 0644); err != nil {
		t.Fatal(err)
	}

	result, err := DiscoverFiles(root)
	if err != nil {
		t.Fatalf("DiscoverFiles failed: %v", err)
	}

	if result.DeveloperSummary != "developer-summary.md" {
		t.Errorf("DeveloperSummary = %q, want %q", result.DeveloperSummary, "developer-summary.md")
	}

	if result.Milestones != "milestones.yaml" {
		t.Errorf("Milestones = %q, want %q", result.Milestones, "milestones.yaml")
	}

	if result.TasksDir != "tasks" {
		t.Errorf("TasksDir = %q, want %q", result.TasksDir, "tasks")
	}

	if result.Timeline != "timeline.yaml" {
		t.Errorf("Timeline = %q, want %q", result.Timeline, "timeline.yaml")
	}
}

// TestDiscoverFiles_MissingTimeline tests that missing timeline produces a warning, not an error
func TestDiscoverFiles_MissingTimeline(t *testing.T) {
	root := t.TempDir()

	if err := os.WriteFile(filepath.Join(root, "developer-summary.md"), []byte("# Project"), 0644); err != nil {
		t.Fatal(err)
	}

	if err := os.WriteFile(filepath.Join(root, "milestones.yaml"), []byte("milestones:\n  - id: m0\n"), 0644); err != nil {
		t.Fatal(err)
	}

	tasksDir := filepath.Join(root, "tasks")
	if err := os.MkdirAll(tasksDir, 0755); err != nil {
		t.Fatal(err)
	}

	if err := os.WriteFile(filepath.Join(tasksDir, "milestone-m0.tasks.yaml"), []byte("tasks:\n"), 0644); err != nil {
		t.Fatal(err)
	}

	// No timeline.yaml created

	result, err := DiscoverFiles(root)
	if err != nil {
		t.Fatalf("DiscoverFiles should not fail when timeline is missing: %v", err)
	}

	if result.Timeline != "" {
		t.Errorf("Timeline should be empty when not found, got %q", result.Timeline)
	}

	if len(result.Warnings) == 0 {
		t.Error("Expected warning about missing timeline")
	}

	foundWarning := false
	for _, w := range result.Warnings {
		if w == "timeline.yaml not found (optional)" {
			foundWarning = true
			break
		}
	}
	if !foundWarning {
		t.Errorf("Expected warning 'timeline.yaml not found (optional)', got: %v", result.Warnings)
	}
}

// TestDiscoverFiles_EmptyDirectory tests that an empty directory returns an error
func TestDiscoverFiles_EmptyDirectory(t *testing.T) {
	root := t.TempDir()

	_, err := DiscoverFiles(root)
	if err == nil {
		t.Fatal("DiscoverFiles should fail on empty directory")
	}

	// Verify error message is helpful
	expectedSubstr := "could not find required files"
	if err.Error() != expectedSubstr {
		t.Errorf("Expected error containing %q, got: %v", expectedSubstr, err)
	}
}

// TestDiscoverFiles_MissingDeveloperSummary tests that missing developer-summary.md is an error
func TestDiscoverFiles_MissingDeveloperSummary(t *testing.T) {
	root := t.TempDir()

	if err := os.WriteFile(filepath.Join(root, "milestones.yaml"), []byte("milestones:\n"), 0644); err != nil {
		t.Fatal(err)
	}

	tasksDir := filepath.Join(root, "tasks")
	if err := os.MkdirAll(tasksDir, 0755); err != nil {
		t.Fatal(err)
	}

	if err := os.WriteFile(filepath.Join(tasksDir, "milestone-m0.tasks.yaml"), []byte("tasks:\n"), 0644); err != nil {
		t.Fatal(err)
	}

	_, err := DiscoverFiles(root)
	if err == nil {
		t.Fatal("DiscoverFiles should fail when developer-summary.md is missing")
	}

	expectedSubstr := "could not find required files"
	if err.Error() != expectedSubstr {
		t.Errorf("Expected error containing %q, got: %v", expectedSubstr, err)
	}
}

// TestDiscoverFiles_MissingMilestones tests that missing milestones.yaml is an error
func TestDiscoverFiles_MissingMilestones(t *testing.T) {
	root := t.TempDir()

	if err := os.WriteFile(filepath.Join(root, "developer-summary.md"), []byte("# Project"), 0644); err != nil {
		t.Fatal(err)
	}

	tasksDir := filepath.Join(root, "tasks")
	if err := os.MkdirAll(tasksDir, 0755); err != nil {
		t.Fatal(err)
	}

	if err := os.WriteFile(filepath.Join(tasksDir, "milestone-m0.tasks.yaml"), []byte("tasks:\n"), 0644); err != nil {
		t.Fatal(err)
	}

	_, err := DiscoverFiles(root)
	if err == nil {
		t.Fatal("DiscoverFiles should fail when milestones.yaml is missing")
	}
}

// TestDiscoverFiles_SkipsDotGit tests that .git, node_modules, vendor are skipped
func TestDiscoverFiles_SkipsDotGit(t *testing.T) {
	root := t.TempDir()

	// Create files in valid location
	if err := os.WriteFile(filepath.Join(root, "developer-summary.md"), []byte("# Project"), 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "milestones.yaml"), []byte("milestones:\n  - id: m0\n"), 0644); err != nil {
		t.Fatal(err)
	}

	tasksDir := filepath.Join(root, "tasks")
	if err := os.MkdirAll(tasksDir, 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(tasksDir, "milestone-m0.tasks.yaml"), []byte("tasks:\n"), 0644); err != nil {
		t.Fatal(err)
	}

	// Create decoy files in skipped directories
	gitDir := filepath.Join(root, ".git", "objects")
	if err := os.MkdirAll(gitDir, 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(gitDir, "developer-summary.md"), []byte("# Decoy"), 0644); err != nil {
		t.Fatal(err)
	}

	nodeDir := filepath.Join(root, "node_modules", "package")
	if err := os.MkdirAll(nodeDir, 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(nodeDir, "developer-summary.md"), []byte("# Decoy"), 0644); err != nil {
		t.Fatal(err)
	}

	result, err := DiscoverFiles(root)
	if err != nil {
		t.Fatalf("DiscoverFiles failed: %v", err)
	}

	// Verify we got the real files, not the decoys
	if result.DeveloperSummary != "developer-summary.md" {
		t.Errorf("Found decoy file instead of real one: %q", result.DeveloperSummary)
	}
}
