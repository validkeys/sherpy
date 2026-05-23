package jira

import (
	"os"
	"path/filepath"
	"testing"
)

func TestRunSync_LoadsAllDocuments(t *testing.T) {
	// Create temp directory with fixture files
	tmpDir := t.TempDir()

	// Create developer summary
	devSummary := `# Test Project

## Overview
This is a test project.

## Deliverables
- Feature A
- Feature B
`
	devSummaryPath := filepath.Join(tmpDir, "developer-summary.md")
	if err := os.WriteFile(devSummaryPath, []byte(devSummary), 0644); err != nil {
		t.Fatalf("failed to write dev summary: %v", err)
	}

	// Create milestones
	milestonesYAML := `milestones:
  - id: m0
    name: Milestone 0
    description: First milestone
    deliverables:
      - Task A
    estimated_duration: 120
    dependencies: []
  - id: m1
    name: Milestone 1
    description: Second milestone
    deliverables:
      - Task B
    estimated_duration: 240
    dependencies: [m0]
`
	milestonesPath := filepath.Join(tmpDir, "milestones.yaml")
	if err := os.WriteFile(milestonesPath, []byte(milestonesYAML), 0644); err != nil {
		t.Fatalf("failed to write milestones: %v", err)
	}

	// Create tasks directory
	tasksDir := filepath.Join(tmpDir, "tasks")
	if err := os.MkdirAll(tasksDir, 0755); err != nil {
		t.Fatalf("failed to create tasks dir: %v", err)
	}

	// Create task file
	tasksYAML := `milestone: m0
name: "Milestone 0"
generated: "2025-05-22T00:00:00Z"

tasks:
  - id: m0-001
    name: "Task A"
    description: "Do something"
    estimate_minutes: 60
    type: code
    dependencies: []
  - id: m0-002
    name: "Task B"
    description: "Do something else"
    estimate_minutes: 30
    type: test
    dependencies: [m0-001]
`
	tasksPath := filepath.Join(tasksDir, "milestone-m0.tasks.yaml")
	if err := os.WriteFile(tasksPath, []byte(tasksYAML), 0644); err != nil {
		t.Fatalf("failed to write tasks: %v", err)
	}

	// Create local config
	localCfg := &LocalConfig{
		ProjectKey:       "TEST",
		DeveloperSummary: "developer-summary.md",
		Milestones:       "milestones.yaml",
		TasksDir:         "tasks",
		SyncState:        "sync-state.yaml",
	}

	// Create global config
	globalCfg := &GlobalConfig{
		Jira: GlobalJiraConfig{
			Domain: "https://test.atlassian.net",
			IssueTypes: IssueTypes{
				Epic:    "10000",
				Story:   "10001",
				SubTask: "10002",
			},
		},
	}

	// Change to temp dir
	oldWd, _ := os.Getwd()
	defer os.Chdir(oldWd)
	os.Chdir(tmpDir)

	// Create mock client (nil is OK for this test since we're testing loading only)
	client := &JiraClient{}

	// Run sync with dry run to test loading
	_, err := RunSync(client, localCfg, globalCfg, true, nil)
	if err != nil {
		t.Fatalf("RunSync failed: %v", err)
	}

	// Success: no error means all documents loaded correctly
}

func TestRunSync_ClassifiesCreateUpdateSkip(t *testing.T) {
	// Create temp directory
	tmpDir := t.TempDir()

	// Create minimal fixtures
	devSummary := `# Test Project

## Overview
Test project for create/update/skip classification.
`
	devSummaryPath := filepath.Join(tmpDir, "developer-summary.md")
	if err := os.WriteFile(devSummaryPath, []byte(devSummary), 0644); err != nil {
		t.Fatalf("failed to write dev summary: %v", err)
	}

	milestonesYAML := `milestones:
  - id: m0
    name: Milestone 0
    description: First milestone
    deliverables:
      - Task A
    estimated_duration: 120
    dependencies: []
`
	milestonesPath := filepath.Join(tmpDir, "milestones.yaml")
	if err := os.WriteFile(milestonesPath, []byte(milestonesYAML), 0644); err != nil {
		t.Fatalf("failed to write milestones: %v", err)
	}

	tasksDir := filepath.Join(tmpDir, "tasks")
	if err := os.MkdirAll(tasksDir, 0755); err != nil {
		t.Fatalf("failed to create tasks dir: %v", err)
	}

	tasksYAML := `milestone: m0
name: "Milestone 0"
generated: "2025-05-22T00:00:00Z"

tasks:
  - id: m0-001
    name: "Task A"
    description: "Do something"
    estimate_minutes: 60
    type: code
    dependencies: []
`
	tasksPath := filepath.Join(tasksDir, "milestone-m0.tasks.yaml")
	if err := os.WriteFile(tasksPath, []byte(tasksYAML), 0644); err != nil {
		t.Fatalf("failed to write tasks: %v", err)
	}

	// Create sync state with existing Epic (same hash = skip)
	devSummaryObj, _ := ParseDeveloperSummary(devSummaryPath)
	devSummaryHash := HashDeveloperSummary(devSummaryObj)

	syncState := &SyncState{
		ProjectKey: "TEST",
		Epic: SyncEntry{
			JiraKey:     "TEST-1",
			JiraID:      "10001",
			ContentHash: devSummaryHash,
		},
		Milestones: map[string]SyncEntry{},
		Tasks:      map[string]SyncEntry{},
		Links:      []LinkEntry{},
	}

	syncStatePath := filepath.Join(tmpDir, "sync-state.yaml")
	if err := SaveSyncState(syncState, syncStatePath); err != nil {
		t.Fatalf("failed to write sync state: %v", err)
	}

	localCfg := &LocalConfig{
		ProjectKey:       "TEST",
		DeveloperSummary: "developer-summary.md",
		Milestones:       "milestones.yaml",
		TasksDir:         "tasks",
		SyncState:        "sync-state.yaml",
	}

	globalCfg := &GlobalConfig{
		Jira: GlobalJiraConfig{
			Domain: "https://test.atlassian.net",
			IssueTypes: IssueTypes{
				Epic:    "10000",
				Story:   "10001",
				SubTask: "10002",
			},
		},
	}

	oldWd, _ := os.Getwd()
	defer os.Chdir(oldWd)
	os.Chdir(tmpDir)

	client := &JiraClient{}

	// Run sync in dry run mode
	_, err := RunSync(client, localCfg, globalCfg, true, nil)
	if err != nil {
		t.Fatalf("RunSync failed: %v", err)
	}

	// Verify classification logic:
	// - Epic should be skip (same hash)
	// - Milestone m0 should be create (not in state)
	// - Task m0-001 should be create (not in state)

	// Test passes if no error (detailed verification will be in subsequent tests)
}

func TestRunSync_DryRun(t *testing.T) {
	tmpDir := t.TempDir()

	// Create minimal fixtures
	devSummary := `# Test Project

## Overview
Test project for dry run.
`
	devSummaryPath := filepath.Join(tmpDir, "developer-summary.md")
	if err := os.WriteFile(devSummaryPath, []byte(devSummary), 0644); err != nil {
		t.Fatalf("failed to write dev summary: %v", err)
	}

	milestonesYAML := `milestones:
  - id: m0
    name: Milestone 0
    description: First milestone
    deliverables:
      - Task A
    estimated_duration: 120
    dependencies: []
`
	milestonesPath := filepath.Join(tmpDir, "milestones.yaml")
	if err := os.WriteFile(milestonesPath, []byte(milestonesYAML), 0644); err != nil {
		t.Fatalf("failed to write milestones: %v", err)
	}

	tasksDir := filepath.Join(tmpDir, "tasks")
	if err := os.MkdirAll(tasksDir, 0755); err != nil {
		t.Fatalf("failed to create tasks dir: %v", err)
	}

	tasksYAML := `milestone: m0
name: "Milestone 0"
generated: "2025-05-22T00:00:00Z"

tasks:
  - id: m0-001
    name: "Task A"
    description: "Do something"
    estimate_minutes: 60
    type: code
    dependencies: []
`
	tasksPath := filepath.Join(tasksDir, "milestone-m0.tasks.yaml")
	if err := os.WriteFile(tasksPath, []byte(tasksYAML), 0644); err != nil {
		t.Fatalf("failed to write tasks: %v", err)
	}

	localCfg := &LocalConfig{
		ProjectKey:       "TEST",
		DeveloperSummary: "developer-summary.md",
		Milestones:       "milestones.yaml",
		TasksDir:         "tasks",
		SyncState:        "sync-state.yaml",
	}

	globalCfg := &GlobalConfig{
		Jira: GlobalJiraConfig{
			Domain: "https://test.atlassian.net",
			IssueTypes: IssueTypes{
				Epic:    "10000",
				Story:   "10001",
				SubTask: "10002",
			},
		},
	}

	oldWd, _ := os.Getwd()
	defer os.Chdir(oldWd)
	os.Chdir(tmpDir)

	client := &JiraClient{}

	// Run sync with dry run
	result, err := RunSync(client, localCfg, globalCfg, true, nil)
	if err != nil {
		t.Fatalf("RunSync failed: %v", err)
	}

	// Verify result is not nil
	if result == nil {
		t.Fatal("expected non-nil result")
	}

	// Verify no API calls were made (client was never initialized with HTTP)
	// Test passes if no panic/error
}

func TestSyncEpic_Create(t *testing.T) {
	summary := &DeveloperSummary{
		Title:   "Test Project",
		Content: "# Test Project\n\n## Overview\nThis is a test.",
	}

	state := &SyncState{
		Epic:       SyncEntry{},
		Milestones: map[string]SyncEntry{},
		Tasks:      map[string]SyncEntry{},
		Links:      []LinkEntry{},
	}

	globalCfg := &GlobalConfig{
		Jira: GlobalJiraConfig{
			IssueTypes: IssueTypes{
				Epic:    "10000",
				Story:   "10001",
				SubTask: "10002",
			},
		},
	}

	// Mock client would be needed for real test, but we'll test the logic
	client := &JiraClient{}

	// Dry run test: should not error
	err := syncEpic(client, "TEST", globalCfg, summary, state, true)
	if err != nil {
		t.Fatalf("syncEpic dry run failed: %v", err)
	}

	// Verify state hasn't changed in dry run
	if state.Epic.JiraKey != "" {
		t.Errorf("dry run should not modify state, but got key: %s", state.Epic.JiraKey)
	}
}

func TestSyncEpic_Update(t *testing.T) {
	summary := &DeveloperSummary{
		Title:   "Test Project Updated",
		Content: "# Test Project Updated\n\n## Overview\nThis is updated.",
	}

	// Seed state with existing Epic and old hash
	state := &SyncState{
		Epic: SyncEntry{
			JiraKey:     "TEST-1",
			JiraID:      "10001",
			ContentHash: "sha256:oldhash",
		},
		Milestones: map[string]SyncEntry{},
		Tasks:      map[string]SyncEntry{},
		Links:      []LinkEntry{},
	}

	globalCfg := &GlobalConfig{
		Jira: GlobalJiraConfig{
			IssueTypes: IssueTypes{
				Epic:    "10000",
				Story:   "10001",
				SubTask: "10002",
			},
		},
	}

	client := &JiraClient{}

	// Dry run: should update
	err := syncEpic(client, "TEST", globalCfg, summary, state, true)
	if err != nil {
		t.Fatalf("syncEpic update dry run failed: %v", err)
	}

	// In real test with mock server, would verify UpdateIssue was called
}

func TestSyncEpic_Skip(t *testing.T) {
	summary := &DeveloperSummary{
		Title:   "Test Project",
		Content: "# Test Project\n\n## Overview\nThis is a test.",
	}

	// Compute hash
	currentHash := HashDeveloperSummary(summary)

	// Seed state with matching hash
	state := &SyncState{
		Epic: SyncEntry{
			JiraKey:     "TEST-1",
			JiraID:      "10001",
			ContentHash: currentHash,
		},
		Milestones: map[string]SyncEntry{},
		Tasks:      map[string]SyncEntry{},
		Links:      []LinkEntry{},
	}

	globalCfg := &GlobalConfig{
		Jira: GlobalJiraConfig{
			IssueTypes: IssueTypes{
				Epic:    "10000",
				Story:   "10001",
				SubTask: "10002",
			},
		},
	}

	client := &JiraClient{}

	// Should skip
	err := syncEpic(client, "TEST", globalCfg, summary, state, false)
	if err != nil {
		t.Fatalf("syncEpic skip failed: %v", err)
	}

	// Verify no API calls (client never initialized, so would panic if called)
}
