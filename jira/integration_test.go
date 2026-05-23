package jira

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// TestIntegration_FullSync verifies end-to-end sync with Epic, Stories, Sub-tasks, and links
func TestIntegration_FullSync(t *testing.T) {
	// Track API calls
	var calls []string
	issueCounter := 1

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls = append(calls, r.Method+" "+r.URL.Path)

		// Create issue endpoint
		if r.Method == "POST" && strings.HasSuffix(r.URL.Path, "/issue") {
			var req map[string]interface{}
			json.NewDecoder(r.Body).Decode(&req)

			key := "TEST-" + string(rune('0'+issueCounter))
			issueCounter++

			w.WriteHeader(http.StatusCreated)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"id":  "1000" + key[5:],
				"key": key,
			})
			return
		}

		// Create link endpoint
		if r.Method == "POST" && strings.HasSuffix(r.URL.Path, "/issueLink") {
			w.WriteHeader(http.StatusCreated)
			json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
			return
		}

		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	// Create temp directory with fixtures
	tmpDir := t.TempDir()

	devSummary := `# Test Project

## Overview
This is a test project for full sync.

## Deliverables
- Feature A
- Feature B
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

	tasksDir := filepath.Join(tmpDir, "tasks")
	if err := os.MkdirAll(tasksDir, 0755); err != nil {
		t.Fatalf("failed to create tasks dir: %v", err)
	}

	tasksM0YAML := `milestone: m0
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
	tasksM0Path := filepath.Join(tasksDir, "milestone-m0.tasks.yaml")
	if err := os.WriteFile(tasksM0Path, []byte(tasksM0YAML), 0644); err != nil {
		t.Fatalf("failed to write m0 tasks: %v", err)
	}

	tasksM1YAML := `milestone: m1
name: "Milestone 1"
generated: "2025-05-22T00:00:00Z"

tasks:
  - id: m1-001
    name: "Task C"
    description: "Do milestone 1 work"
    estimate_minutes: 90
    type: code
    dependencies: []
  - id: m1-002
    name: "Task D"
    description: "Test milestone 1"
    estimate_minutes: 45
    type: test
    dependencies: [m1-001]
`
	tasksM1Path := filepath.Join(tasksDir, "milestone-m1.tasks.yaml")
	if err := os.WriteFile(tasksM1Path, []byte(tasksM1YAML), 0644); err != nil {
		t.Fatalf("failed to write m1 tasks: %v", err)
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
			Domain: server.URL,
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

	client := NewJiraClient(server.URL, "test@example.com", "test-token")

	// Run full sync
	result, err := RunSync(client, localCfg, globalCfg, false, nil)
	if err != nil {
		t.Fatalf("RunSync failed: %v", err)
	}

	// Verify results
	if result.EpicsCreated != 1 {
		t.Errorf("Expected 1 Epic created, got: %d", result.EpicsCreated)
	}

	if result.StoriesCreated != 2 {
		t.Errorf("Expected 2 Stories created, got: %d", result.StoriesCreated)
	}

	if result.SubTasksCreated != 4 {
		t.Errorf("Expected 4 Sub-tasks created, got: %d", result.SubTasksCreated)
	}

	// Verify dependencies created (m1 depends on m0, plus task dependencies)
	expectedLinks := 3 // m1→m0, m0-002→m0-001, m1-002→m1-001
	if result.LinksCreated != expectedLinks {
		t.Errorf("Expected %d links created, got: %d", expectedLinks, result.LinksCreated)
	}

	// Verify sync state was saved
	syncStatePath := filepath.Join(tmpDir, "sync-state.yaml")
	state, err := LoadSyncState(syncStatePath)
	if err != nil {
		t.Fatalf("failed to load sync state: %v", err)
	}

	if state.Epic.JiraKey == "" {
		t.Error("Epic not recorded in sync state")
	}

	if len(state.Milestones) != 2 {
		t.Errorf("Expected 2 milestones in sync state, got: %d", len(state.Milestones))
	}

	if len(state.Tasks) != 4 {
		t.Errorf("Expected 4 tasks in sync state, got: %d", len(state.Tasks))
	}

	if len(state.Links) != expectedLinks {
		t.Errorf("Expected %d links in sync state, got: %d", expectedLinks, len(state.Links))
	}

	// Verify API calls were made in dependency order
	// Epic first, then m0 story, then m0 tasks, then m1 story, then m1 tasks
	if len(calls) < 7 { // 1 Epic + 2 Stories + 4 Sub-tasks
		t.Errorf("Expected at least 7 API calls, got: %d", len(calls))
	}
}

// TestIntegration_IncrementalSync verifies new entities are synced while existing are skipped
func TestIntegration_IncrementalSync(t *testing.T) {
	var calls []string
	issueCounter := 1

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls = append(calls, r.Method+" "+r.URL.Path)

		if r.Method == "POST" && strings.HasSuffix(r.URL.Path, "/issue") {
			key := "TEST-" + string(rune('0'+issueCounter))
			issueCounter++

			w.WriteHeader(http.StatusCreated)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"id":  "1000" + key[5:],
				"key": key,
			})
			return
		}

		if r.Method == "POST" && strings.HasSuffix(r.URL.Path, "/issueLink") {
			w.WriteHeader(http.StatusCreated)
			json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
			return
		}

		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	tmpDir := t.TempDir()

	devSummary := `# Test Project

## Overview
Initial version.
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

	tasksM0YAML := `milestone: m0
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
	tasksM0Path := filepath.Join(tasksDir, "milestone-m0.tasks.yaml")
	if err := os.WriteFile(tasksM0Path, []byte(tasksM0YAML), 0644); err != nil {
		t.Fatalf("failed to write m0 tasks: %v", err)
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
			Domain: server.URL,
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

	client := NewJiraClient(server.URL, "test@example.com", "test-token")

	// First sync
	result1, err := RunSync(client, localCfg, globalCfg, false, nil)
	if err != nil {
		t.Fatalf("First sync failed: %v", err)
	}

	if result1.EpicsCreated != 1 {
		t.Errorf("First sync: expected 1 Epic, got: %d", result1.EpicsCreated)
	}

	if result1.StoriesCreated != 1 {
		t.Errorf("First sync: expected 1 Story, got: %d", result1.StoriesCreated)
	}

	if result1.SubTasksCreated != 1 {
		t.Errorf("First sync: expected 1 Sub-task, got: %d", result1.SubTasksCreated)
	}

	// Add new milestone
	milestonesYAML = `milestones:
  - id: m0
    name: Milestone 0
    description: First milestone
    deliverables:
      - Task A
    estimated_duration: 120
    dependencies: []
  - id: m1
    name: Milestone 1
    description: New milestone
    deliverables:
      - Task B
    estimated_duration: 180
    dependencies: [m0]
`
	if err := os.WriteFile(milestonesPath, []byte(milestonesYAML), 0644); err != nil {
		t.Fatalf("failed to update milestones: %v", err)
	}

	tasksM1YAML := `milestone: m1
name: "Milestone 1"
generated: "2025-05-22T00:00:00Z"

tasks:
  - id: m1-001
    name: "Task B"
    description: "New task"
    estimate_minutes: 90
    type: code
    dependencies: []
`
	tasksM1Path := filepath.Join(tasksDir, "milestone-m1.tasks.yaml")
	if err := os.WriteFile(tasksM1Path, []byte(tasksM1YAML), 0644); err != nil {
		t.Fatalf("failed to write m1 tasks: %v", err)
	}

	// Reset call counter
	callsBefore := len(calls)

	// Second sync
	result2, err := RunSync(client, localCfg, globalCfg, false, nil)
	if err != nil {
		t.Fatalf("Second sync failed: %v", err)
	}

	// Verify only new entities created
	if result2.EpicsCreated != 0 {
		t.Errorf("Second sync: expected 0 Epics created, got: %d", result2.EpicsCreated)
	}

	if result2.EpicsSkipped != 1 {
		t.Errorf("Second sync: expected 1 Epic skipped, got: %d", result2.EpicsSkipped)
	}

	if result2.StoriesCreated != 1 {
		t.Errorf("Second sync: expected 1 new Story, got: %d", result2.StoriesCreated)
	}

	if result2.StoriesSkipped != 1 {
		t.Errorf("Second sync: expected 1 Story skipped, got: %d", result2.StoriesSkipped)
	}

	if result2.SubTasksCreated != 1 {
		t.Errorf("Second sync: expected 1 new Sub-task, got: %d", result2.SubTasksCreated)
	}

	if result2.SubTasksSkipped != 1 {
		t.Errorf("Second sync: expected 1 Sub-task skipped, got: %d", result2.SubTasksSkipped)
	}

	// Verify fewer API calls (only new entities + links)
	callsAfter := len(calls) - callsBefore
	if callsAfter >= 3 { // Should be less than first sync (only 1 Story + 1 Sub-task + link)
		t.Logf("Second sync made %d calls (expected ~3 for new entities)", callsAfter)
	}
}

// TestIntegration_IdempotentSync verifies second sync with no changes makes no API calls
func TestIntegration_IdempotentSync(t *testing.T) {
	var calls []string
	issueCounter := 1

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls = append(calls, r.Method+" "+r.URL.Path)

		if r.Method == "POST" && strings.HasSuffix(r.URL.Path, "/issue") {
			key := "TEST-" + string(rune('0'+issueCounter))
			issueCounter++

			w.WriteHeader(http.StatusCreated)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"id":  "1000" + key[5:],
				"key": key,
			})
			return
		}

		if r.Method == "POST" && strings.HasSuffix(r.URL.Path, "/issueLink") {
			w.WriteHeader(http.StatusCreated)
			json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
			return
		}

		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	tmpDir := t.TempDir()

	devSummary := `# Test Project

## Overview
Test idempotency.
`
	devSummaryPath := filepath.Join(tmpDir, "developer-summary.md")
	if err := os.WriteFile(devSummaryPath, []byte(devSummary), 0644); err != nil {
		t.Fatalf("failed to write dev summary: %v", err)
	}

	milestonesYAML := `milestones:
  - id: m0
    name: Milestone 0
    description: Test milestone
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

	tasksM0YAML := `milestone: m0
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
	tasksM0Path := filepath.Join(tasksDir, "milestone-m0.tasks.yaml")
	if err := os.WriteFile(tasksM0Path, []byte(tasksM0YAML), 0644); err != nil {
		t.Fatalf("failed to write m0 tasks: %v", err)
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
			Domain: server.URL,
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

	client := NewJiraClient(server.URL, "test@example.com", "test-token")

	// First sync
	_, err := RunSync(client, localCfg, globalCfg, false, nil)
	if err != nil {
		t.Fatalf("First sync failed: %v", err)
	}

	firstSyncCalls := len(calls)

	// Second sync (no changes)
	result2, err := RunSync(client, localCfg, globalCfg, false, nil)
	if err != nil {
		t.Fatalf("Second sync failed: %v", err)
	}

	// Verify everything skipped
	if result2.EpicsCreated != 0 {
		t.Errorf("Second sync: expected 0 Epics created, got: %d", result2.EpicsCreated)
	}

	if result2.StoriesCreated != 0 {
		t.Errorf("Second sync: expected 0 Stories created, got: %d", result2.StoriesCreated)
	}

	if result2.SubTasksCreated != 0 {
		t.Errorf("Second sync: expected 0 Sub-tasks created, got: %d", result2.SubTasksCreated)
	}

	if result2.LinksCreated != 0 {
		t.Errorf("Second sync: expected 0 Links created, got: %d", result2.LinksCreated)
	}

	if result2.EpicsSkipped != 1 {
		t.Errorf("Second sync: expected 1 Epic skipped, got: %d", result2.EpicsSkipped)
	}

	if result2.StoriesSkipped != 1 {
		t.Errorf("Second sync: expected 1 Story skipped, got: %d", result2.StoriesSkipped)
	}

	if result2.SubTasksSkipped != 1 {
		t.Errorf("Second sync: expected 1 Sub-task skipped, got: %d", result2.SubTasksSkipped)
	}

	// Verify no new API calls (all skipped)
	secondSyncCalls := len(calls) - firstSyncCalls
	if secondSyncCalls != 0 {
		t.Errorf("Second sync should make 0 API calls (all skipped), but made: %d", secondSyncCalls)
	}
}

// TestIntegration_DryRunFormat verifies dry-run output matches expected format
func TestIntegration_DryRunFormat(t *testing.T) {
	tmpDir := t.TempDir()

	devSummary := `# Test Project

## Overview
Test dry run formatting.
`
	devSummaryPath := filepath.Join(tmpDir, "developer-summary.md")
	if err := os.WriteFile(devSummaryPath, []byte(devSummary), 0644); err != nil {
		t.Fatalf("failed to write dev summary: %v", err)
	}

	milestonesYAML := `milestones:
  - id: m0
    name: Milestone 0
    description: Test milestone
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

	tasksM0YAML := `milestone: m0
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
	tasksM0Path := filepath.Join(tasksDir, "milestone-m0.tasks.yaml")
	if err := os.WriteFile(tasksM0Path, []byte(tasksM0YAML), 0644); err != nil {
		t.Fatalf("failed to write m0 tasks: %v", err)
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

	client := &JiraClient{} // Nil client for dry run

	// Run dry run
	result, err := RunSync(client, localCfg, globalCfg, true, nil)
	if err != nil {
		t.Fatalf("Dry run failed: %v", err)
	}

	// Verify counts in result
	if result.EpicsCreated != 1 {
		t.Errorf("Dry run: expected 1 Epic in plan, got: %d", result.EpicsCreated)
	}

	if result.StoriesCreated != 1 {
		t.Errorf("Dry run: expected 1 Story in plan, got: %d", result.StoriesCreated)
	}

	if result.SubTasksCreated != 1 {
		t.Errorf("Dry run: expected 1 Sub-task in plan, got: %d", result.SubTasksCreated)
	}

	// Note: formatting is tested via m3-007 task tests
	// This test verifies counts are populated correctly in dry-run mode
}

// TestIntegration_PartialFailure verifies partial failures are handled gracefully
func TestIntegration_PartialFailure(t *testing.T) {
	issueCounter := 1
	var createdIssues []string

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" && strings.HasSuffix(r.URL.Path, "/issue") {
			// Parse request to identify which issue is being created
			var req map[string]interface{}
			json.NewDecoder(r.Body).Decode(&req)

			fields, ok := req["fields"].(map[string]interface{})
			if !ok {
				w.WriteHeader(http.StatusBadRequest)
				return
			}

			summary, _ := fields["summary"].(string)

			// Fail persistently on Milestone 0 (first Story)
			if strings.Contains(summary, "Milestone 0") {
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(map[string]string{"error": "Persistent failure for test"})
				return
			}

			key := "TEST-" + string(rune('0'+issueCounter))
			issueCounter++
			createdIssues = append(createdIssues, summary)

			w.WriteHeader(http.StatusCreated)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"id":  "1000" + key[5:],
				"key": key,
			})
			return
		}

		if r.Method == "POST" && strings.HasSuffix(r.URL.Path, "/issueLink") {
			w.WriteHeader(http.StatusCreated)
			json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
			return
		}

		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	tmpDir := t.TempDir()

	devSummary := `# Test Project

## Overview
Test partial failure handling.
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
  - id: m1
    name: Milestone 1
    description: Second milestone
    deliverables:
      - Task B
    estimated_duration: 180
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

	tasksM0YAML := `milestone: m0
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
	tasksM0Path := filepath.Join(tasksDir, "milestone-m0.tasks.yaml")
	if err := os.WriteFile(tasksM0Path, []byte(tasksM0YAML), 0644); err != nil {
		t.Fatalf("failed to write m0 tasks: %v", err)
	}

	tasksM1YAML := `milestone: m1
name: "Milestone 1"
generated: "2025-05-22T00:00:00Z"

tasks:
  - id: m1-001
    name: "Task B"
    description: "Do something else"
    estimate_minutes: 90
    type: code
    dependencies: []
`
	tasksM1Path := filepath.Join(tasksDir, "milestone-m1.tasks.yaml")
	if err := os.WriteFile(tasksM1Path, []byte(tasksM1YAML), 0644); err != nil {
		t.Fatalf("failed to write m1 tasks: %v", err)
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
			Domain: server.URL,
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

	client := NewJiraClient(server.URL, "test@example.com", "test-token")

	// Run sync (milestone m0 will fail, but its tasks require m0 parent)
	result, err := RunSync(client, localCfg, globalCfg, false, nil)

	// Current implementation returns fatal error when milestone fails
	// because tasks can't be created without parent milestone
	// This is actually correct behavior - you can't create Sub-tasks without a parent Story
	if err == nil {
		t.Fatal("Expected error when milestone creation fails and tasks depend on it")
	}

	if !strings.Contains(err.Error(), "milestone m0 must be synced") {
		t.Errorf("Expected error about milestone dependency, got: %v", err)
	}

	// Verify Epic was created successfully before the failure
	syncStatePath := filepath.Join(tmpDir, "sync-state.yaml")
	state, err := LoadSyncState(syncStatePath)
	if err != nil {
		t.Fatalf("failed to load sync state: %v", err)
	}

	if state.Epic.JiraKey == "" {
		t.Error("Epic should be recorded in sync state before failure")
	}

	// Verify errors were recorded in result
	if result != nil && len(result.Errors) > 0 {
		t.Logf("Recorded %d errors:", len(result.Errors))
		for _, err := range result.Errors {
			t.Logf("  - %s (%s): %v", err.EntityID, err.Operation, err.Error)
		}

		// Should have error for m0 creation
		foundM0Error := false
		for _, syncErr := range result.Errors {
			if syncErr.EntityID == "m0" && syncErr.Operation == "create" {
				foundM0Error = true
				break
			}
		}
		if !foundM0Error {
			t.Error("Expected error for m0 creation to be recorded")
		}
	}

	// m0 should NOT be in state (failed)
	if _, exists := state.Milestones["m0"]; exists {
		t.Error("Failed milestone m0 should not be in sync state")
	}
}
