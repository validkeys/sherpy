package jira

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
)

// TestE2E_InitDiscoversFiles tests the init command discovers and configures Sherpy files.
func TestE2E_InitDiscoversFiles(t *testing.T) {
	tmpDir := t.TempDir()
	fixtureDir := filepath.Join("testdata", "jira-e2e")

	// Copy fixture files to tmpDir
	copyFixtures(t, fixtureDir, tmpDir)

	// Run init
	if err := RunInit(tmpDir); err != nil {
		t.Fatalf("RunInit failed: %v", err)
	}

	// Verify sherpy-jira.yaml created
	configPath := filepath.Join(tmpDir, "sherpy-jira.yaml")
	cfg, err := LoadLocalConfig(configPath)
	if err != nil {
		t.Fatalf("LoadLocalConfig failed: %v", err)
	}

	// Verify relative paths
	if cfg.DeveloperSummary != "developer-summary.md" {
		t.Errorf("DeveloperSummary = %q, want %q", cfg.DeveloperSummary, "developer-summary.md")
	}
	if cfg.Milestones != "milestones.yaml" {
		t.Errorf("Milestones = %q, want %q", cfg.Milestones, "milestones.yaml")
	}
	if cfg.TasksDir != "tasks" {
		t.Errorf("TasksDir = %q, want %q", cfg.TasksDir, "tasks")
	}
	if cfg.Timeline != "timeline.yaml" {
		t.Errorf("Timeline = %q, want %q", cfg.Timeline, "timeline.yaml")
	}
}

// TestE2E_SetupCreatesProject tests the setup command creates Jira project and saves config.
func TestE2E_SetupCreatesProject(t *testing.T) {
	tmpDir := t.TempDir()
	globalConfigPath := filepath.Join(tmpDir, "global-config.yaml")

	// Set up mock server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasSuffix(r.URL.Path, "/myself"):
			json.NewEncoder(w).Encode(map[string]string{"accountId": "test-account-123"})
		case strings.HasSuffix(r.URL.Path, "/project") && r.Method == "POST":
			json.NewEncoder(w).Encode(map[string]interface{}{
				"key": "TEST",
				"id":  "10000",
			})
		case strings.Contains(r.URL.Path, "/createmeta"):
			json.NewEncoder(w).Encode(map[string]interface{}{
				"projects": []map[string]interface{}{
					{
						"issuetypes": []map[string]interface{}{
							{"id": "10000", "name": "Epic"},
							{"id": "10001", "name": "Story"},
							{"id": "10002", "name": "Sub-task"},
						},
					},
				},
			})
		default:
			t.Logf("Unexpected request: %s %s", r.Method, r.URL.Path)
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer server.Close()

	// Set env vars
	t.Setenv("JIRA_EMAIL", "test@example.com")
	t.Setenv("JIRA_TOKEN", "test-token")

	// Create local config with project info
	localConfigPath := filepath.Join(tmpDir, "sherpy-jira.yaml")
	cfg := &LocalConfig{
		ProjectKey:       "TEST",
		ProjectName:      "Test Project",
		DeveloperSummary: "developer-summary.md",
		Milestones:       "milestones.yaml",
		TasksDir:         "tasks",
		SyncState:        "sherpy-jira-sync-state.yaml",
	}
	if err := SaveLocalConfig(cfg, localConfigPath); err != nil {
		t.Fatal(err)
	}

	// Create minimal sherpy files
	if err := os.WriteFile(filepath.Join(tmpDir, "developer-summary.md"), []byte("# Test Project\n"), 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(tmpDir, "milestones.yaml"), []byte("project: test-project\nmilestones: []\n"), 0644); err != nil {
		t.Fatal(err)
	}

	// Create initial global config with domain
	globalCfg := &GlobalConfig{
		Jira: GlobalJiraConfig{
			Domain: server.URL,
		},
	}
	if err := SaveGlobalConfig(globalCfg, globalConfigPath); err != nil {
		t.Fatal(err)
	}

	// Create client and discover issue types manually (since RunSetup is interactive)
	client := NewJiraClient(server.URL, "test@example.com", "test-token")

	// Get account ID
	_, err := client.GetSelf()
	if err != nil {
		t.Fatalf("GetSelf failed: %v", err)
	}

	// Create project
	_, err = client.CreateProject("TEST", "Test Project", "test-account-123")
	if err != nil && !strings.Contains(err.Error(), "400") {
		t.Fatalf("CreateProject failed: %v", err)
	}

	// Get issue types
	epicID, storyID, subTaskID, err := client.GetCreateMeta("TEST")
	if err != nil {
		t.Fatalf("GetCreateMeta failed: %v", err)
	}

	// Update global config
	globalCfg.Jira.IssueTypes.Epic = epicID
	globalCfg.Jira.IssueTypes.Story = storyID
	globalCfg.Jira.IssueTypes.SubTask = subTaskID
	if err := SaveGlobalConfig(globalCfg, globalConfigPath); err != nil {
		t.Fatal(err)
	}

	// Verify global config written
	loadedGlobalCfg, err := LoadGlobalConfig(globalConfigPath)
	if err != nil {
		t.Fatalf("LoadGlobalConfig failed: %v", err)
	}
	if loadedGlobalCfg.Jira.IssueTypes.Epic != "10000" {
		t.Errorf("EpicTypeID = %q, want %q", loadedGlobalCfg.Jira.IssueTypes.Epic, "10000")
	}
	if loadedGlobalCfg.Jira.IssueTypes.Story != "10001" {
		t.Errorf("StoryTypeID = %q, want %q", loadedGlobalCfg.Jira.IssueTypes.Story, "10001")
	}
	if loadedGlobalCfg.Jira.IssueTypes.SubTask != "10002" {
		t.Errorf("SubtaskTypeID = %q, want %q", loadedGlobalCfg.Jira.IssueTypes.SubTask, "10002")
	}
}

// TestE2E_SyncCreatesAllIssues tests sync creates Epic, Stories, Sub-tasks in correct order.
func TestE2E_SyncCreatesAllIssues(t *testing.T) {
	originalDir, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	defer os.Chdir(originalDir)

	tmpDir := t.TempDir()
	fixtureDir := filepath.Join(originalDir, "testdata", "jira-e2e")
	copyFixtures(t, fixtureDir, tmpDir)

	if err = os.Chdir(tmpDir); err != nil {
		t.Fatal(err)
	}

	var issueCounter int32
	var createCalls []string
	var linkCalls int32

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasSuffix(r.URL.Path, "/issue") && r.Method == "POST":
			var req map[string]interface{}
			json.NewDecoder(r.Body).Decode(&req)
			issueType := req["fields"].(map[string]interface{})["issuetype"].(map[string]interface{})["id"].(string)
			summary := req["fields"].(map[string]interface{})["summary"].(string)
			createCalls = append(createCalls, fmt.Sprintf("%s:%s", issueType, summary))

			key := fmt.Sprintf("TEST-%d", atomic.AddInt32(&issueCounter, 1))
			json.NewEncoder(w).Encode(map[string]interface{}{
				"key": key,
				"id":  fmt.Sprintf("%d", issueCounter),
			})
		case strings.Contains(r.URL.Path, "/issueLink") && r.Method == "POST":
			atomic.AddInt32(&linkCalls, 1)
			w.WriteHeader(http.StatusCreated)
		default:
			w.WriteHeader(http.StatusOK)
		}
	}))
	defer server.Close()

	t.Setenv("JIRA_EMAIL", "test@example.com")
	t.Setenv("JIRA_TOKEN", "test-token")

	// Create configs
	localCfg := &LocalConfig{
		ProjectKey:       "TEST",
		ProjectName:      "Test Project",
		DeveloperSummary: "developer-summary.md",
		Milestones:       "milestones.yaml",
		TasksDir:         "tasks",
		Timeline:         "timeline.yaml",
		SyncState:        "sherpy-jira-sync-state.yaml",
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

	// Run sync
	client := NewJiraClient(server.URL, "test@example.com", "test-token")
	result, err := RunSync(client, localCfg, globalCfg, false)
	if err != nil {
		t.Fatalf("Sync failed: %v", err)
	}

	// Verify issue creation order: Epic, then Stories (m0, m1), then Sub-tasks
	if len(createCalls) != 7 {
		t.Fatalf("Expected 7 CreateIssue calls, got %d: %v", len(createCalls), createCalls)
	}

	// First call should be Epic
	if !strings.HasPrefix(createCalls[0], "10000:") {
		t.Errorf("First issue should be Epic (10000), got %s", createCalls[0])
	}

	// Next 2 should be Stories (m0, m1)
	if !strings.HasPrefix(createCalls[1], "10001:") {
		t.Errorf("Second issue should be Story (10001), got %s", createCalls[1])
	}
	if !strings.HasPrefix(createCalls[2], "10001:") {
		t.Errorf("Third issue should be Story (10001), got %s", createCalls[2])
	}

	// Last 4 should be Sub-tasks
	for i := 3; i < 7; i++ {
		if !strings.HasPrefix(createCalls[i], "10002:") {
			t.Errorf("Issue %d should be Sub-task (10002), got %s", i, createCalls[i])
		}
	}

	// Verify dependency links created
	// Expected: 1 milestone link (m1→m0) + 2 task links within m1 (m1-002→m1-001) and m0 (m0-002→m0-001)
	if linkCalls < 1 {
		t.Errorf("Expected at least 1 issueLink call, got %d", linkCalls)
	}

	// Verify result counts (epic + 2 stories + 4 sub-tasks = 7)
	totalCreated := result.EpicsCreated + result.StoriesCreated + result.SubTasksCreated
	if totalCreated != 7 {
		t.Errorf("Total created = %d, want 7 (epics=%d, stories=%d, subtasks=%d)",
			totalCreated, result.EpicsCreated, result.StoriesCreated, result.SubTasksCreated)
	}

	// Verify sync state saved
	syncStatePath := filepath.Join(tmpDir, "sherpy-jira-sync-state.yaml")
	state, err := LoadSyncState(syncStatePath)
	if err != nil {
		t.Fatalf("LoadSyncState failed: %v", err)
	}
	totalIssues := 1 + len(state.Milestones) + len(state.Tasks) // epic + milestones + tasks
	if totalIssues != 7 {
		t.Errorf("SyncState has %d issues, want 7 (1 epic + %d milestones + %d tasks)",
			totalIssues, len(state.Milestones), len(state.Tasks))
	}
}

// TestE2E_SyncIdempotent tests second sync skips all existing issues.
func TestE2E_SyncIdempotent(t *testing.T) {
	originalDir, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	defer os.Chdir(originalDir)

	tmpDir := t.TempDir()
	fixtureDir := filepath.Join(originalDir, "testdata", "jira-e2e")
	copyFixtures(t, fixtureDir, tmpDir)

	if err = os.Chdir(tmpDir); err != nil {
		t.Fatal(err)
	}

	var createCalls, updateCalls int32

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasSuffix(r.URL.Path, "/issue") && r.Method == "POST":
			atomic.AddInt32(&createCalls, 1)
			key := fmt.Sprintf("TEST-%d", createCalls)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"key": key,
				"id":  fmt.Sprintf("%d", createCalls),
			})
		case strings.Contains(r.URL.Path, "/issue/TEST-") && r.Method == "PUT":
			atomic.AddInt32(&updateCalls, 1)
			w.WriteHeader(http.StatusNoContent)
		case r.Method == "POST":
			w.WriteHeader(http.StatusCreated)
		default:
			w.WriteHeader(http.StatusOK)
		}
	}))
	defer server.Close()

	t.Setenv("JIRA_EMAIL", "test@example.com")
	t.Setenv("JIRA_TOKEN", "test-token")

	localCfg := &LocalConfig{
		ProjectKey:       "TEST",
		ProjectName:      "Test Project",
		DeveloperSummary: "developer-summary.md",
		Milestones:       "milestones.yaml",
		TasksDir:         "tasks",
		Timeline:         "timeline.yaml",
		SyncState:        "sherpy-jira-sync-state.yaml",
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

	client := NewJiraClient(server.URL, "test@example.com", "test-token")

	// First sync
	result1, err := RunSync(client, localCfg, globalCfg, false)
	if err != nil {
		t.Fatalf("First sync failed: %v", err)
	}
	totalCreated1 := result1.EpicsCreated + result1.StoriesCreated + result1.SubTasksCreated
	if totalCreated1 != 7 {
		t.Errorf("First sync: Created = %d, want 7", totalCreated1)
	}

	firstSyncCreates := atomic.LoadInt32(&createCalls)
	firstSyncUpdates := atomic.LoadInt32(&updateCalls)

	// Second sync (idempotent)
	result2, err := RunSync(client, localCfg, globalCfg, false)
	if err != nil {
		t.Fatalf("Second sync failed: %v", err)
	}

	// Verify no new creates or updates
	if atomic.LoadInt32(&createCalls) != firstSyncCreates {
		t.Errorf("Second sync made %d new CreateIssue calls, expected 0", atomic.LoadInt32(&createCalls)-firstSyncCreates)
	}
	if atomic.LoadInt32(&updateCalls) != firstSyncUpdates {
		t.Errorf("Second sync made %d UpdateIssue calls, expected 0", atomic.LoadInt32(&updateCalls)-firstSyncUpdates)
	}

	totalSkipped := result2.EpicsSkipped + result2.StoriesSkipped + result2.SubTasksSkipped
	if totalSkipped != 7 {
		t.Errorf("Second sync: Skipped = %d, want 7", totalSkipped)
	}
	totalCreated2 := result2.EpicsCreated + result2.StoriesCreated + result2.SubTasksCreated
	if totalCreated2 != 0 {
		t.Errorf("Second sync: Created = %d, want 0", totalCreated2)
	}
	totalUpdated := result2.EpicsUpdated + result2.StoriesUpdated + result2.SubTasksUpdated
	if totalUpdated != 0 {
		t.Errorf("Second sync: Updated = %d, want 0", totalUpdated)
	}
}

// TestE2E_SyncUpdate tests sync updates changed milestone.
func TestE2E_SyncUpdate(t *testing.T) {
	originalDir, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	defer os.Chdir(originalDir)

	tmpDir := t.TempDir()
	fixtureDir := filepath.Join(originalDir, "testdata", "jira-e2e")
	copyFixtures(t, fixtureDir, tmpDir)

	if err = os.Chdir(tmpDir); err != nil {
		t.Fatal(err)
	}

	var createCalls, updateCalls int32

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasSuffix(r.URL.Path, "/issue") && r.Method == "POST":
			atomic.AddInt32(&createCalls, 1)
			key := fmt.Sprintf("TEST-%d", createCalls)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"key": key,
				"id":  fmt.Sprintf("%d", createCalls),
			})
		case strings.Contains(r.URL.Path, "/issue/TEST-") && r.Method == "PUT":
			atomic.AddInt32(&updateCalls, 1)
			w.WriteHeader(http.StatusNoContent)
		case r.Method == "POST":
			w.WriteHeader(http.StatusCreated)
		default:
			w.WriteHeader(http.StatusOK)
		}
	}))
	defer server.Close()

	t.Setenv("JIRA_EMAIL", "test@example.com")
	t.Setenv("JIRA_TOKEN", "test-token")

	localCfg := &LocalConfig{
		ProjectKey:       "TEST",
		ProjectName:      "Test Project",
		DeveloperSummary: "developer-summary.md",
		Milestones:       "milestones.yaml",
		TasksDir:         "tasks",
		Timeline:         "timeline.yaml",
		SyncState:        "sherpy-jira-sync-state.yaml",
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

	client := NewJiraClient(server.URL, "test@example.com", "test-token")

	// First sync
	_, err = RunSync(client, localCfg, globalCfg, false)
	if err != nil {
		t.Fatalf("First sync failed: %v", err)
	}

	firstSyncUpdates := atomic.LoadInt32(&updateCalls)

	// Modify milestone description
	milestonesData, err := os.ReadFile("milestones.yaml")
	if err != nil {
		t.Fatal(err)
	}
	modified := strings.Replace(string(milestonesData), "Project initialization and configuration", "MODIFIED: New description for m0", 1)
	if err := os.WriteFile("milestones.yaml", []byte(modified), 0644); err != nil {
		t.Fatal(err)
	}

	// Second sync
	result2, err := RunSync(client, localCfg, globalCfg, false)
	if err != nil {
		t.Fatalf("Second sync failed: %v", err)
	}

	// Verify exactly 1 update (the modified milestone)
	updatesAfter := atomic.LoadInt32(&updateCalls) - firstSyncUpdates
	if updatesAfter != 1 {
		t.Errorf("Second sync made %d UpdateIssue calls, expected 1", updatesAfter)
	}

	totalUpdated := result2.EpicsUpdated + result2.StoriesUpdated + result2.SubTasksUpdated
	if totalUpdated != 1 {
		t.Errorf("Second sync: Updated = %d, want 1", totalUpdated)
	}
	totalSkipped := result2.EpicsSkipped + result2.StoriesSkipped + result2.SubTasksSkipped
	if totalSkipped != 6 {
		t.Errorf("Second sync: Skipped = %d, want 6", totalSkipped)
	}
}

// TestE2E_StatusOutput tests status command output.
func TestE2E_StatusOutput(t *testing.T) {
	originalDir, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	defer os.Chdir(originalDir)

	tmpDir := t.TempDir()
	fixtureDir := filepath.Join(originalDir, "testdata", "jira-e2e")
	copyFixtures(t, fixtureDir, tmpDir)

	if err = os.Chdir(tmpDir); err != nil {
		t.Fatal(err)
	}

	var issueCounter int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasSuffix(r.URL.Path, "/issue") && r.Method == "POST":
			key := fmt.Sprintf("TEST-%d", atomic.AddInt32(&issueCounter, 1))
			json.NewEncoder(w).Encode(map[string]interface{}{
				"key": key,
				"id":  fmt.Sprintf("%d", issueCounter),
			})
		case r.Method == "POST":
			w.WriteHeader(http.StatusCreated)
		default:
			w.WriteHeader(http.StatusOK)
		}
	}))
	defer server.Close()

	t.Setenv("JIRA_EMAIL", "test@example.com")
	t.Setenv("JIRA_TOKEN", "test-token")

	localCfg := &LocalConfig{
		ProjectKey:       "TEST",
		ProjectName:      "Test Project",
		DeveloperSummary: "developer-summary.md",
		Milestones:       "milestones.yaml",
		TasksDir:         "tasks",
		Timeline:         "timeline.yaml",
		SyncState:        "sherpy-jira-sync-state.yaml",
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

	client := NewJiraClient(server.URL, "test@example.com", "test-token")

	// Run sync to populate state
	_, err = RunSync(client, localCfg, globalCfg, false)
	if err != nil {
		t.Fatalf("Sync failed: %v", err)
	}

	// Load sync state to verify status
	syncStatePath := filepath.Join(tmpDir, "sherpy-jira-sync-state.yaml")
	state, err := LoadSyncState(syncStatePath)
	if err != nil {
		t.Fatalf("LoadSyncState failed: %v", err)
	}

	// Verify counts
	if state.Epic.JiraKey == "" {
		t.Error("SyncState missing Epic JiraKey")
	}
	if len(state.Milestones) != 2 {
		t.Errorf("Milestones = %d, want 2", len(state.Milestones))
	}
	if len(state.Tasks) != 4 {
		t.Errorf("Tasks = %d, want 4", len(state.Tasks))
	}
	// Expected: 1 milestone link (m1→m0) + 2 task links (m0-002→m0-001, m1-002→m1-001)
	if len(state.Links) < 1 {
		t.Errorf("DependencyLinks = %d, want at least 1", len(state.Links))
	}
}

// copyFixtures recursively copies test fixture files.
func copyFixtures(t *testing.T, src, dst string) {
	t.Helper()
	entries, err := os.ReadDir(src)
	if err != nil {
		t.Fatal(err)
	}
	for _, entry := range entries {
		srcPath := filepath.Join(src, entry.Name())
		dstPath := filepath.Join(dst, entry.Name())
		if entry.IsDir() {
			if err := os.Mkdir(dstPath, 0755); err != nil {
				t.Fatal(err)
			}
			copyFixtures(t, srcPath, dstPath)
		} else {
			data, err := os.ReadFile(srcPath)
			if err != nil {
				t.Fatal(err)
			}
			if err := os.WriteFile(dstPath, data, 0644); err != nil {
				t.Fatal(err)
			}
		}
	}
}
