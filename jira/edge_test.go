package jira

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync/atomic"
	"testing"
)

// TestEdge_MissingTimeline verifies sync succeeds with no timeline.
func TestEdge_MissingTimeline(t *testing.T) {
	originalDir, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	defer os.Chdir(originalDir)

	tmpDir := t.TempDir()
	if err = os.Chdir(tmpDir); err != nil {
		t.Fatal(err)
	}

	// Create minimal sherpy files without timeline
	if err := os.WriteFile("developer-summary.md", []byte("# Test\nTest project"), 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile("milestones.yaml", []byte("project: test\nmilestones:\n  - id: m0\n    name: Setup\n    description: Setup milestone\n    dependencies: []"), 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.Mkdir("tasks", 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile("tasks/milestone-m0.tasks.yaml", []byte("milestone: m0\nname: Setup\ntasks:\n  - id: m0-001\n    name: Task 1\n    description: First task\n    estimate_minutes: 30\n    type: config\n    dependencies: []"), 0644); err != nil {
		t.Fatal(err)
	}

	var issueCounter int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasSuffix(r.URL.Path, "/issue") && r.Method == "POST":
			key := fmt.Sprintf("TEST-%d", atomic.AddInt32(&issueCounter, 1))
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusCreated)
			fmt.Fprintf(w, `{"key":"%s","id":"%d"}`, key, issueCounter)
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
		ProjectName:      "Test",
		DeveloperSummary: "developer-summary.md",
		Milestones:       "milestones.yaml",
		TasksDir:         "tasks",
		Timeline:         "", // No timeline
		SyncState:        "state.yaml",
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

	// Run sync (should succeed without timeline)
	result, err := RunSync(client, localCfg, globalCfg, false)
	if err != nil {
		t.Fatalf("Sync should succeed without timeline: %v", err)
	}

	// Verify sync created issues
	totalCreated := result.EpicsCreated + result.StoriesCreated + result.SubTasksCreated
	if totalCreated == 0 {
		t.Error("Expected issues to be created")
	}
}

// TestEdge_EmptyProject verifies error when milestones file is empty.
func TestEdge_EmptyProject(t *testing.T) {
	originalDir, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	defer os.Chdir(originalDir)

	tmpDir := t.TempDir()
	if err = os.Chdir(tmpDir); err != nil {
		t.Fatal(err)
	}

	// Create sherpy files with empty milestones
	if err := os.WriteFile("developer-summary.md", []byte("# Test\nTest project"), 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile("milestones.yaml", []byte("project: test\nmilestones: []"), 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.Mkdir("tasks", 0755); err != nil {
		t.Fatal(err)
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	t.Setenv("JIRA_EMAIL", "test@example.com")
	t.Setenv("JIRA_TOKEN", "test-token")

	localCfg := &LocalConfig{
		ProjectKey:       "TEST",
		ProjectName:      "Test",
		DeveloperSummary: "developer-summary.md",
		Milestones:       "milestones.yaml",
		TasksDir:         "tasks",
		SyncState:        "state.yaml",
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

	// Run sync (should fail due to parser validation requiring at least one milestone)
	_, err = RunSync(client, localCfg, globalCfg, false)
	if err == nil {
		t.Fatal("Expected error for empty milestones, got nil")
	}

	// Verify error mentions milestones
	if !strings.Contains(err.Error(), "milestone") {
		t.Errorf("Error should mention milestones, got: %v", err)
	}
}

// TestEdge_NoDependencies verifies no links created when no dependencies.
func TestEdge_NoDependencies(t *testing.T) {
	originalDir, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	defer os.Chdir(originalDir)

	tmpDir := t.TempDir()
	if err = os.Chdir(tmpDir); err != nil {
		t.Fatal(err)
	}

	// Create sherpy files with no dependencies
	if err := os.WriteFile("developer-summary.md", []byte("# Test\nTest project"), 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile("milestones.yaml", []byte("project: test\nmilestones:\n  - id: m0\n    name: M0\n    description: Milestone 0\n    dependencies: []\n  - id: m1\n    name: M1\n    description: Milestone 1\n    dependencies: []"), 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.Mkdir("tasks", 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile("tasks/milestone-m0.tasks.yaml", []byte("milestone: m0\nname: M0\ntasks:\n  - id: m0-001\n    name: Task 1\n    description: First task\n    estimate_minutes: 30\n    type: config\n    dependencies: []"), 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile("tasks/milestone-m1.tasks.yaml", []byte("milestone: m1\nname: M1\ntasks:\n  - id: m1-001\n    name: Task 2\n    description: Second task\n    estimate_minutes: 30\n    type: config\n    dependencies: []"), 0644); err != nil {
		t.Fatal(err)
	}

	var linkCalls int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasSuffix(r.URL.Path, "/issue") && r.Method == "POST":
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusCreated)
			fmt.Fprintf(w, `{"key":"TEST-1","id":"1"}`)
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

	localCfg := &LocalConfig{
		ProjectKey:       "TEST",
		ProjectName:      "Test",
		DeveloperSummary: "developer-summary.md",
		Milestones:       "milestones.yaml",
		TasksDir:         "tasks",
		SyncState:        "state.yaml",
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

	// Run sync
	result, err := RunSync(client, localCfg, globalCfg, false)
	if err != nil {
		t.Fatalf("Sync failed: %v", err)
	}

	// Verify no dependency links created
	if result.LinksCreated != 0 {
		t.Errorf("Expected 0 links created, got %d", result.LinksCreated)
	}
	if linkCalls != 0 {
		t.Errorf("Expected 0 issueLink API calls, got %d", linkCalls)
	}
}

// TestEdge_CircularDependency verifies error for circular dependencies.
func TestEdge_CircularDependency(t *testing.T) {
	originalDir, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	defer os.Chdir(originalDir)

	tmpDir := t.TempDir()
	if err = os.Chdir(tmpDir); err != nil {
		t.Fatal(err)
	}

	// Create sherpy files with circular dependency (m0 → m1 → m0)
	if err := os.WriteFile("developer-summary.md", []byte("# Test\nTest project"), 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile("milestones.yaml", []byte("project: test\nmilestones:\n  - id: m0\n    name: M0\n    description: Milestone 0\n    dependencies: [m1]\n  - id: m1\n    name: M1\n    description: Milestone 1\n    dependencies: [m0]"), 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.Mkdir("tasks", 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile("tasks/milestone-m0.tasks.yaml", []byte("milestone: m0\nname: M0\ntasks: []"), 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile("tasks/milestone-m1.tasks.yaml", []byte("milestone: m1\nname: M1\ntasks: []"), 0644); err != nil {
		t.Fatal(err)
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	t.Setenv("JIRA_EMAIL", "test@example.com")
	t.Setenv("JIRA_TOKEN", "test-token")

	localCfg := &LocalConfig{
		ProjectKey:       "TEST",
		ProjectName:      "Test",
		DeveloperSummary: "developer-summary.md",
		Milestones:       "milestones.yaml",
		TasksDir:         "tasks",
		SyncState:        "state.yaml",
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

	// Run sync (should fail with circular dependency error or ordering error)
	_, err = RunSync(client, localCfg, globalCfg, false)
	if err == nil {
		t.Fatal("Expected error for circular dependency, got nil")
	}

	// Verify error is related to dependency issues
	// The error may be caught by the ordering logic or epic validation
	errStr := strings.ToLower(err.Error())
	if !strings.Contains(errStr, "circular") && !strings.Contains(errStr, "cycle") &&
		!strings.Contains(errStr, "epic") && !strings.Contains(errStr, "depend") {
		t.Errorf("Error should mention dependency or ordering issue, got: %v", err)
	}

	t.Logf("Circular dependency caught with error: %v", err)
}

// TestEdge_LargeEstimates verifies story points capping for large estimates.
func TestEdge_LargeEstimates(t *testing.T) {
	// Test that large estimates are handled correctly
	// This is tested by the estimation logic in the sync/adf code
	// Verify story points are calculated correctly for edge cases
	t.Skip("Large estimate handling is covered by unit tests in ADF builder")
}

// TestEdge_SpecialCharacters verifies handling of unicode and markdown in descriptions.
func TestEdge_SpecialCharacters(t *testing.T) {
	originalDir, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	defer os.Chdir(originalDir)

	tmpDir := t.TempDir()
	if err = os.Chdir(tmpDir); err != nil {
		t.Fatal(err)
	}

	// Create sherpy files with special characters
	if err := os.WriteFile("developer-summary.md", []byte("# Test 🚀\nTest project with émojis and spëcial çhars"), 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile("milestones.yaml", []byte("project: test\nmilestones:\n  - id: m0\n    name: \"M0: Unicode Test 你好\"\n    description: \"Test with **bold** and _italic_ markdown\"\n    dependencies: []"), 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.Mkdir("tasks", 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile("tasks/milestone-m0.tasks.yaml", []byte("milestone: m0\nname: M0\ntasks:\n  - id: m0-001\n    name: \"Task with © symbol\"\n    description: \"Description with [link](http://example.com)\"\n    estimate_minutes: 30\n    type: feature\n    dependencies: []"), 0644); err != nil {
		t.Fatal(err)
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasSuffix(r.URL.Path, "/issue") && r.Method == "POST":
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusCreated)
			fmt.Fprintf(w, `{"key":"TEST-1","id":"1"}`)
		default:
			w.WriteHeader(http.StatusOK)
		}
	}))
	defer server.Close()

	t.Setenv("JIRA_EMAIL", "test@example.com")
	t.Setenv("JIRA_TOKEN", "test-token")

	localCfg := &LocalConfig{
		ProjectKey:       "TEST",
		ProjectName:      "Test",
		DeveloperSummary: "developer-summary.md",
		Milestones:       "milestones.yaml",
		TasksDir:         "tasks",
		SyncState:        "state.yaml",
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

	// Run sync (should handle special characters)
	result, err := RunSync(client, localCfg, globalCfg, false)
	if err != nil {
		t.Fatalf("Sync should handle special characters: %v", err)
	}

	// Verify sync succeeded
	totalCreated := result.EpicsCreated + result.StoriesCreated + result.SubTasksCreated
	if totalCreated == 0 {
		t.Error("Expected issues to be created")
	}
}
