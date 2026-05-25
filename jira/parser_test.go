package jira

import (
	"os"
	"path/filepath"
	"testing"
)

func TestParseDeveloperSummary_Standard(t *testing.T) {
	// Create a temp file with standard developer summary
	tmpDir := t.TempDir()
	summaryPath := filepath.Join(tmpDir, "developer-summary.md")

	content := `# Wealth Platform Q3 Overhaul

This is the project overview section.

## Background

Some background information here.

## Goals

- Goal 1
- Goal 2
`

	if err := os.WriteFile(summaryPath, []byte(content), 0600); err != nil {
		t.Fatalf("failed to write test file: %v", err)
	}

	// Parse the file
	summary, err := ParseDeveloperSummary(summaryPath)
	if err != nil {
		t.Fatalf("ParseDeveloperSummary failed: %v", err)
	}

	// Verify title extraction
	expectedTitle := "Wealth Platform Q3 Overhaul"
	if summary.Title != expectedTitle {
		t.Errorf("expected title %q, got %q", expectedTitle, summary.Title)
	}

	// Verify full content is preserved
	if summary.Content != content {
		t.Errorf("expected content to match original, but it doesn't")
	}
}

func TestParseDeveloperSummary_NoH1(t *testing.T) {
	tmpDir := t.TempDir()
	summaryPath := filepath.Join(tmpDir, "no-h1.md")

	// Content without H1 heading
	content := `## This is H2

Some content without H1 heading.
`

	if err := os.WriteFile(summaryPath, []byte(content), 0600); err != nil {
		t.Fatalf("failed to write test file: %v", err)
	}

	// Parse should fail with descriptive error
	_, err := ParseDeveloperSummary(summaryPath)
	if err == nil {
		t.Fatal("expected error for missing H1 heading, got nil")
	}

	// Error message should mention the missing heading
	errMsg := err.Error()
	if errMsg == "" {
		t.Error("expected descriptive error message")
	}
}

func TestParseDeveloperSummary_EmptyFile(t *testing.T) {
	tmpDir := t.TempDir()
	summaryPath := filepath.Join(tmpDir, "empty.md")

	// Create empty file
	if err := os.WriteFile(summaryPath, []byte(""), 0600); err != nil {
		t.Fatalf("failed to write test file: %v", err)
	}

	// Parse should fail with descriptive error
	_, err := ParseDeveloperSummary(summaryPath)
	if err == nil {
		t.Fatal("expected error for empty file, got nil")
	}
}

func TestParseMilestones_Standard(t *testing.T) {
	tmpDir := t.TempDir()
	milestonesPath := filepath.Join(tmpDir, "milestones.yaml")

	content := `version: "1.0"
project: "Wealth Platform"
milestones:
  - id: m0
    name: "Foundation Setup"
    description: "Set up the monorepo and tooling"
    dependencies: []
    estimated_duration: "1-2 days"
    tasks_file: "milestone-m0.tasks.yaml"
    success_criteria:
      - "Tests pass"
      - "Build succeeds"
  - id: m1
    name: "API Layer"
    description: "Implement the API layer"
    dependencies: ["m0"]
    estimated_duration: "3-4 days"
    tasks_file: "milestone-m1.tasks.yaml"
    success_criteria:
      - "All endpoints functional"
`

	if err := os.WriteFile(milestonesPath, []byte(content), 0600); err != nil {
		t.Fatalf("failed to write test file: %v", err)
	}

	// Parse the file
	milestonesFile, err := ParseMilestones(milestonesPath)
	if err != nil {
		t.Fatalf("ParseMilestones failed: %v", err)
	}

	// Verify metadata
	if milestonesFile.Version != "1.0" {
		t.Errorf("expected version '1.0', got %q", milestonesFile.Version)
	}

	if milestonesFile.Project != "Wealth Platform" {
		t.Errorf("expected project 'Wealth Platform', got %q", milestonesFile.Project)
	}

	// Verify we got 2 milestones
	if len(milestonesFile.Milestones) != 2 {
		t.Fatalf("expected 2 milestones, got %d", len(milestonesFile.Milestones))
	}

	// Verify first milestone fields
	m0 := milestonesFile.Milestones[0]
	if m0.ID != "m0" {
		t.Errorf("expected ID 'm0', got %q", m0.ID)
	}
	if m0.Name != "Foundation Setup" {
		t.Errorf("expected name 'Foundation Setup', got %q", m0.Name)
	}
	if m0.Description != "Set up the monorepo and tooling" {
		t.Errorf("expected description, got %q", m0.Description)
	}
	if m0.EstimatedDuration != "1-2 days" {
		t.Errorf("expected estimated_duration '1-2 days', got %q", m0.EstimatedDuration)
	}
	if m0.TasksFile != "milestone-m0.tasks.yaml" {
		t.Errorf("expected tasks_file, got %q", m0.TasksFile)
	}
	if len(m0.SuccessCriteria) != 2 {
		t.Errorf("expected 2 success_criteria, got %d", len(m0.SuccessCriteria))
	}
	if len(m0.Dependencies) != 0 {
		t.Errorf("expected 0 dependencies for m0, got %d", len(m0.Dependencies))
	}

	// Verify second milestone has dependencies
	m1 := milestonesFile.Milestones[1]
	if m1.ID != "m1" {
		t.Errorf("expected ID 'm1', got %q", m1.ID)
	}
	if len(m1.Dependencies) != 1 || m1.Dependencies[0] != "m0" {
		t.Errorf("expected dependencies ['m0'], got %v", m1.Dependencies)
	}
}

func TestParseMilestones_MissingRequiredFields(t *testing.T) {
	tmpDir := t.TempDir()
	milestonesPath := filepath.Join(tmpDir, "milestones.yaml")

	// Missing ID field
	content := `version: "1.0"
project: "Test"
milestones:
  - name: "No ID"
    description: "Missing ID field"
`

	if err := os.WriteFile(milestonesPath, []byte(content), 0600); err != nil {
		t.Fatalf("failed to write test file: %v", err)
	}

	// Parse should fail with validation error
	_, err := ParseMilestones(milestonesPath)
	if err == nil {
		t.Fatal("expected error for missing required field, got nil")
	}
}

func TestParseMilestones_DurationRange(t *testing.T) {
	tmpDir := t.TempDir()
	milestonesPath := filepath.Join(tmpDir, "milestones.yaml")

	content := `version: "1.0"
project: "Test"
milestones:
  - id: m0
    name: "Short"
    description: "test"
    estimated_duration: "1-2 days"
  - id: m1
    name: "Medium"
    description: "test"
    estimated_duration: "3-4 days"
`

	if err := os.WriteFile(milestonesPath, []byte(content), 0600); err != nil {
		t.Fatalf("failed to write test file: %v", err)
	}

	milestonesFile, err := ParseMilestones(milestonesPath)
	if err != nil {
		t.Fatalf("ParseMilestones failed: %v", err)
	}

	// Verify duration strings are preserved as-is
	if milestonesFile.Milestones[0].EstimatedDuration != "1-2 days" {
		t.Errorf("expected '1-2 days', got %q", milestonesFile.Milestones[0].EstimatedDuration)
	}
	if milestonesFile.Milestones[1].EstimatedDuration != "3-4 days" {
		t.Errorf("expected '3-4 days', got %q", milestonesFile.Milestones[1].EstimatedDuration)
	}
}

func TestParseTasksDir_MultipleFiles(t *testing.T) {
	tmpDir := t.TempDir()

	// Create two task files
	m0Content := `milestone: m0
name: "Foundation Tasks"
tasks:
  - id: m0-001
    name: "Setup monorepo"
    description: "Initialize pnpm workspace"
    estimate_minutes: 45
    type: code
    dependencies: []
  - id: m0-002
    name: "Configure linting"
    description: "Add ESLint config"
    estimate_minutes: 30
    type: config
    dependencies: ["m0-001"]
`

	m1Content := `milestone: m1
name: "API Tasks"
tasks:
  - id: m1-001
    name: "Create API endpoint"
    description: "Implement REST API"
    estimate_minutes: 90
    type: code
    dependencies: []
`

	if err := os.WriteFile(filepath.Join(tmpDir, "milestone-m0.tasks.yaml"), []byte(m0Content), 0600); err != nil {
		t.Fatalf("failed to write m0 tasks: %v", err)
	}
	if err := os.WriteFile(filepath.Join(tmpDir, "milestone-m1.tasks.yaml"), []byte(m1Content), 0600); err != nil {
		t.Fatalf("failed to write m1 tasks: %v", err)
	}

	// Parse the directory
	tasksMap, err := ParseTasksDir(tmpDir)
	if err != nil {
		t.Fatalf("ParseTasksDir failed: %v", err)
	}

	// Verify we got tasks for both milestones
	if len(tasksMap) != 2 {
		t.Fatalf("expected 2 milestones in map, got %d", len(tasksMap))
	}

	// Verify m0 tasks
	m0Tasks, ok := tasksMap["m0"]
	if !ok {
		t.Fatal("expected tasks for milestone m0")
	}
	if len(m0Tasks) != 2 {
		t.Errorf("expected 2 tasks for m0, got %d", len(m0Tasks))
	}

	// Verify m1 tasks
	m1Tasks, ok := tasksMap["m1"]
	if !ok {
		t.Fatal("expected tasks for milestone m1")
	}
	if len(m1Tasks) != 1 {
		t.Errorf("expected 1 task for m1, got %d", len(m1Tasks))
	}
}

func TestParseTasksDir_EmptyDir(t *testing.T) {
	tmpDir := t.TempDir()

	// Parse empty directory
	_, err := ParseTasksDir(tmpDir)
	if err == nil {
		t.Fatal("expected error for empty directory, got nil")
	}
}

func TestParseTasksDir_AllFields(t *testing.T) {
	tmpDir := t.TempDir()

	content := `milestone: m0
name: "Test Tasks"
tasks:
  - id: m0-001
    name: "Full Task"
    description: "Task with all fields"
    estimate_minutes: 60
    type: code
    dependencies: ["m0-000"]
`

	if err := os.WriteFile(filepath.Join(tmpDir, "milestone-m0.tasks.yaml"), []byte(content), 0600); err != nil {
		t.Fatalf("failed to write tasks: %v", err)
	}

	tasksMap, err := ParseTasksDir(tmpDir)
	if err != nil {
		t.Fatalf("ParseTasksDir failed: %v", err)
	}

	tasks := tasksMap["m0"]
	if len(tasks) != 1 {
		t.Fatalf("expected 1 task, got %d", len(tasks))
	}

	task := tasks[0]
	if task.ID != "m0-001" {
		t.Errorf("expected ID 'm0-001', got %q", task.ID)
	}
	if task.Name != "Full Task" {
		t.Errorf("expected name 'Full Task', got %q", task.Name)
	}
	if task.Description != "Task with all fields" {
		t.Errorf("expected description, got %q", task.Description)
	}
	if task.EstimateMinutes != 60 {
		t.Errorf("expected estimate_minutes 60, got %d", task.EstimateMinutes)
	}
	if task.Type != "code" {
		t.Errorf("expected type 'code', got %q", task.Type)
	}
	if len(task.Dependencies) != 1 || task.Dependencies[0] != "m0-000" {
		t.Errorf("expected dependencies ['m0-000'], got %v", task.Dependencies)
	}
}

func TestParseTimeline_MilestoneOnly(t *testing.T) {
	tmpDir := t.TempDir()
	timelinePath := filepath.Join(tmpDir, "timeline.yaml")

	content := `version: "1.0"
project: "Test Project"
workback:
  schedule:
    - id: m0
      name: "Foundation"
      type: milestone
      start_date: "2026-05-01"
      completion_date: "2026-05-10"
    - id: delivery-1
      name: "Delivery Phase"
      type: delivery
      start_date: "2026-05-15"
      completion_date: "2026-05-20"
    - id: m1
      name: "API Layer"
      type: milestone
      start_date: "2026-05-11"
      completion_date: "2026-05-25"
`

	if err := os.WriteFile(timelinePath, []byte(content), 0600); err != nil {
		t.Fatalf("failed to write timeline file: %v", err)
	}

	// Parse the file
	dueDates, err := ParseTimeline(timelinePath)
	if err != nil {
		t.Fatalf("ParseTimeline failed: %v", err)
	}

	// Verify only milestone entries are returned
	if len(dueDates) != 2 {
		t.Fatalf("expected 2 milestone entries, got %d", len(dueDates))
	}

	// Verify m0 date
	if dueDates["m0"].EndDate != "2026-05-10" {
		t.Errorf("expected m0 completion_date '2026-05-10', got %q", dueDates["m0"].EndDate)
	}

	// Verify m1 date
	if dueDates["m1"].EndDate != "2026-05-25" {
		t.Errorf("expected m1 completion_date '2026-05-25', got %q", dueDates["m1"].EndDate)
	}

	// Verify delivery entry is excluded
	if _, exists := dueDates["delivery-1"]; exists {
		t.Error("delivery entries should be excluded from results")
	}
}

func TestParseTimeline_PostEntriesExcluded(t *testing.T) {
	tmpDir := t.TempDir()
	timelinePath := filepath.Join(tmpDir, "timeline.yaml")

	content := `version: "1.0"
project: "Test Project"
workback:
  schedule:
    - id: m0
      name: "Foundation"
      type: milestone
      start_date: "2026-05-01"
      completion_date: "2026-05-10"
    - id: post-launch
      name: "Post Launch"
      type: milestone
      start_date: "2026-06-01"
      completion_date: "2026-06-10"
`

	if err := os.WriteFile(timelinePath, []byte(content), 0600); err != nil {
		t.Fatalf("failed to write timeline file: %v", err)
	}

	dueDates, err := ParseTimeline(timelinePath)
	if err != nil {
		t.Fatalf("ParseTimeline failed: %v", err)
	}

	// Verify only m0 is included (post-* excluded)
	if len(dueDates) != 1 {
		t.Fatalf("expected 1 milestone entry, got %d", len(dueDates))
	}

	if _, exists := dueDates["post-launch"]; exists {
		t.Error("post-* entries should be excluded from results")
	}
}

func TestParseTimeline_MissingWorkback(t *testing.T) {
	tmpDir := t.TempDir()
	timelinePath := filepath.Join(tmpDir, "timeline.yaml")

	content := `version: "1.0"
project: "Test Project"
`

	if err := os.WriteFile(timelinePath, []byte(content), 0600); err != nil {
		t.Fatalf("failed to write timeline file: %v", err)
	}

	// Parse should return empty map, not error
	dueDates, err := ParseTimeline(timelinePath)
	if err != nil {
		t.Fatalf("ParseTimeline should not error on missing workback: %v", err)
	}

	if len(dueDates) != 0 {
		t.Errorf("expected empty map for missing workback, got %d entries", len(dueDates))
	}
}
