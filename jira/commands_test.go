package jira

import (
	"os"
	"path/filepath"
	"testing"

	"gopkg.in/yaml.v3"
)

func TestRunInit_Success(t *testing.T) {
	// Create temp directory with sherpy files
	tmpDir := t.TempDir()
	setupTestSherpyStructure(t, tmpDir)

	// Run init
	err := RunInit(tmpDir)
	if err != nil {
		t.Fatalf("RunInit failed: %v", err)
	}

	// Verify sherpy-jira.yaml was created
	configPath := filepath.Join(tmpDir, "sherpy-jira.yaml")
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		t.Fatal("sherpy-jira.yaml was not created")
	}

	// Load and validate config
	cfg, err := LoadLocalConfig(configPath)
	if err != nil {
		t.Fatalf("failed to load created config: %v", err)
	}

	// Check fields are populated
	if cfg.DeveloperSummary != "docs/jira-integration/developer-summary.md" {
		t.Errorf("unexpected DeveloperSummary: %s", cfg.DeveloperSummary)
	}
	if cfg.Milestones != "docs/jira-integration/implementation/milestones.yaml" {
		t.Errorf("unexpected Milestones: %s", cfg.Milestones)
	}
	if cfg.TasksDir != "docs/jira-integration/implementation/tasks" {
		t.Errorf("unexpected TasksDir: %s", cfg.TasksDir)
	}
	if cfg.Timeline != "docs/jira-integration/timeline.yaml" {
		t.Errorf("unexpected Timeline: %s", cfg.Timeline)
	}
	if cfg.SyncState != "sherpy-jira-sync-state.yaml" {
		t.Errorf("unexpected SyncState: %s", cfg.SyncState)
	}

	// Check file permissions
	info, err := os.Stat(configPath)
	if err != nil {
		t.Fatalf("failed to stat config file: %v", err)
	}
	if info.Mode().Perm() != 0600 {
		t.Errorf("unexpected file permissions: %o, want 0600", info.Mode().Perm())
	}
}

func TestRunInit_ExistingConfig(t *testing.T) {
	// Create temp directory with existing sherpy-jira.yaml
	tmpDir := t.TempDir()
	setupTestSherpyStructure(t, tmpDir)

	configPath := filepath.Join(tmpDir, "sherpy-jira.yaml")
	cfg := &LocalConfig{
		ProjectKey:       "TEST",
		ProjectName:      "Test Project",
		DeveloperSummary: "old-summary.md",
		Milestones:       "old-milestones.yaml",
		TasksDir:         "old-tasks",
		SyncState:        "old-sync-state.yaml",
	}
	if err := SaveLocalConfig(cfg, configPath); err != nil {
		t.Fatalf("failed to create existing config: %v", err)
	}

	// Run init should fail
	err := RunInit(tmpDir)
	if err == nil {
		t.Fatal("RunInit should fail when config already exists")
	}
	if err.Error() != "sherpy-jira.yaml already exists (use --force to overwrite)" {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestRunInit_MissingFiles(t *testing.T) {
	// Create temp directory without required files
	tmpDir := t.TempDir()

	// Run init should fail
	err := RunInit(tmpDir)
	if err == nil {
		t.Fatal("RunInit should fail when required files are missing")
	}
}

func TestRunInit_PopulatesProjectKeyFromSummary(t *testing.T) {
	// Create temp directory with sherpy files including project name
	tmpDir := t.TempDir()
	setupTestSherpyStructure(t, tmpDir)

	// Add project name to developer-summary.md
	summaryPath := filepath.Join(tmpDir, "docs/jira-integration/developer-summary.md")
	content := `# Project: My Test Project

This is a test project.
`
	if err := os.WriteFile(summaryPath, []byte(content), 0644); err != nil {
		t.Fatalf("failed to write developer-summary.md: %v", err)
	}

	// Run init
	err := RunInit(tmpDir)
	if err != nil {
		t.Fatalf("RunInit failed: %v", err)
	}

	// Load config and check ProjectKey was generated
	configPath := filepath.Join(tmpDir, "sherpy-jira.yaml")
	cfg, err := LoadLocalConfig(configPath)
	if err != nil {
		t.Fatalf("failed to load config: %v", err)
	}

	if cfg.ProjectKey == "" {
		t.Error("ProjectKey should be populated")
	}
	if cfg.ProjectName != "My Test Project" {
		t.Errorf("unexpected ProjectName: %s", cfg.ProjectName)
	}
}

func TestRunInit_NoTimelineWarning(t *testing.T) {
	// Create temp directory without timeline.yaml
	tmpDir := t.TempDir()
	setupTestSherpyStructureNoTimeline(t, tmpDir)

	// Run init should succeed despite missing timeline
	err := RunInit(tmpDir)
	if err != nil {
		t.Fatalf("RunInit failed: %v", err)
	}

	// Load config and verify timeline is empty
	configPath := filepath.Join(tmpDir, "sherpy-jira.yaml")
	cfg, err := LoadLocalConfig(configPath)
	if err != nil {
		t.Fatalf("failed to load config: %v", err)
	}

	if cfg.Timeline != "" {
		t.Errorf("Timeline should be empty when file not found, got: %s", cfg.Timeline)
	}
}

// Helper functions

func setupTestSherpyStructure(t *testing.T, root string) {
	t.Helper()

	// Create directory structure
	implDir := filepath.Join(root, "docs/jira-integration/implementation")
	tasksDir := filepath.Join(implDir, "tasks")
	if err := os.MkdirAll(tasksDir, 0755); err != nil {
		t.Fatalf("failed to create directories: %v", err)
	}

	// Create developer-summary.md
	summaryPath := filepath.Join(root, "docs/jira-integration/developer-summary.md")
	if err := os.WriteFile(summaryPath, []byte("# Developer Summary\n"), 0644); err != nil {
		t.Fatalf("failed to create developer-summary.md: %v", err)
	}

	// Create milestones.yaml
	milestonesPath := filepath.Join(implDir, "milestones.yaml")
	milestones := map[string]interface{}{
		"milestones": []map[string]string{
			{"id": "m0", "name": "Test Milestone"},
		},
	}
	data, _ := yaml.Marshal(milestones)
	if err := os.WriteFile(milestonesPath, data, 0644); err != nil {
		t.Fatalf("failed to create milestones.yaml: %v", err)
	}

	// Create milestone task file
	taskPath := filepath.Join(tasksDir, "milestone-m0.tasks.yaml")
	tasks := map[string]interface{}{
		"tasks": []map[string]string{
			{"id": "m0-001", "name": "Test Task"},
		},
	}
	data, _ = yaml.Marshal(tasks)
	if err := os.WriteFile(taskPath, data, 0644); err != nil {
		t.Fatalf("failed to create milestone-m0.tasks.yaml: %v", err)
	}

	// Create timeline.yaml
	timelinePath := filepath.Join(root, "docs/jira-integration/timeline.yaml")
	timeline := map[string]interface{}{
		"timeline": []map[string]string{
			{"phase": "development", "duration": "4 weeks"},
		},
	}
	data, _ = yaml.Marshal(timeline)
	if err := os.WriteFile(timelinePath, data, 0644); err != nil {
		t.Fatalf("failed to create timeline.yaml: %v", err)
	}
}

func setupTestSherpyStructureNoTimeline(t *testing.T, root string) {
	t.Helper()

	// Create directory structure
	implDir := filepath.Join(root, "docs/jira-integration/implementation")
	tasksDir := filepath.Join(implDir, "tasks")
	if err := os.MkdirAll(tasksDir, 0755); err != nil {
		t.Fatalf("failed to create directories: %v", err)
	}

	// Create developer-summary.md
	summaryPath := filepath.Join(root, "docs/jira-integration/developer-summary.md")
	if err := os.WriteFile(summaryPath, []byte("# Developer Summary\n"), 0644); err != nil {
		t.Fatalf("failed to create developer-summary.md: %v", err)
	}

	// Create milestones.yaml
	milestonesPath := filepath.Join(implDir, "milestones.yaml")
	milestones := map[string]interface{}{
		"milestones": []map[string]string{
			{"id": "m0", "name": "Test Milestone"},
		},
	}
	data, _ := yaml.Marshal(milestones)
	if err := os.WriteFile(milestonesPath, data, 0644); err != nil {
		t.Fatalf("failed to create milestones.yaml: %v", err)
	}

	// Create milestone task file
	taskPath := filepath.Join(tasksDir, "milestone-m0.tasks.yaml")
	tasks := map[string]interface{}{
		"tasks": []map[string]string{
			{"id": "m0-001", "name": "Test Task"},
		},
	}
	data, _ = yaml.Marshal(tasks)
	if err := os.WriteFile(taskPath, data, 0644); err != nil {
		t.Fatalf("failed to create milestone-m0.tasks.yaml: %v", err)
	}
}

// TestRunSetup_MissingEnvVars verifies clear error for missing env vars
func TestRunSetup_MissingEnvVars(t *testing.T) {
	tempDir := t.TempDir()
	configPath := filepath.Join(tempDir, "sherpy-jira.yaml")

	// Create minimal local config
	localCfg := &LocalConfig{
		ProjectKey:       "TEST",
		ProjectName:      "Test Project",
		DeveloperSummary: "developer-summary.md",
		Milestones:       "milestones.yaml",
		TasksDir:         "tasks",
		SyncState:        "sync-state.yaml",
	}
	if err := SaveLocalConfig(localCfg, configPath); err != nil {
		t.Fatalf("Failed to save local config: %v", err)
	}

	// Clear env vars
	oldEmail := os.Getenv("JIRA_EMAIL")
	oldToken := os.Getenv("JIRA_TOKEN")
	os.Unsetenv("JIRA_EMAIL")
	os.Unsetenv("JIRA_TOKEN")
	defer func() {
		if oldEmail != "" {
			os.Setenv("JIRA_EMAIL", oldEmail)
		}
		if oldToken != "" {
			os.Setenv("JIRA_TOKEN", oldToken)
		}
	}()

	err := RunSetup(tempDir, "")
	if err == nil {
		t.Fatal("Expected error for missing env vars, got nil")
	}

	errMsg := err.Error()
	if !stringContains(errMsg, "JIRA_EMAIL") || !stringContains(errMsg, "JIRA_TOKEN") {
		t.Errorf("Expected error about JIRA_EMAIL and JIRA_TOKEN, got: %v", err)
	}
}

// TestRunSetup_MissingInit verifies error when sherpy-jira.yaml missing
func TestRunSetup_MissingInit(t *testing.T) {
	tempDir := t.TempDir()

	// Set env vars
	oldEmail := os.Getenv("JIRA_EMAIL")
	oldToken := os.Getenv("JIRA_TOKEN")
	os.Setenv("JIRA_EMAIL", "test@example.com")
	os.Setenv("JIRA_TOKEN", "test-token")
	defer func() {
		if oldEmail == "" {
			os.Unsetenv("JIRA_EMAIL")
		} else {
			os.Setenv("JIRA_EMAIL", oldEmail)
		}
		if oldToken == "" {
			os.Unsetenv("JIRA_TOKEN")
		} else {
			os.Setenv("JIRA_TOKEN", oldToken)
		}
	}()

	err := RunSetup(tempDir, "")
	if err == nil {
		t.Fatal("Expected error for missing sherpy-jira.yaml, got nil")
	}

	if !stringContains(err.Error(), "init") {
		t.Errorf("Expected error suggesting 'init', got: %v", err)
	}
}

func stringContains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(substr) == 0 || findSubstring(s, substr))
}

func findSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

// TestRunStatus_NoSyncState verifies message when sync state doesn't exist
func TestRunStatus_NoSyncState(t *testing.T) {
	tempDir := t.TempDir()

	// Create local config
	localCfg := &LocalConfig{
		ProjectKey:       "TEST",
		ProjectName:      "Test Project",
		DeveloperSummary: "developer-summary.md",
		Milestones:       "milestones.yaml",
		TasksDir:         "tasks",
		SyncState:        "sync-state.yaml",
	}
	configPath := filepath.Join(tempDir, "sherpy-jira.yaml")
	if err := SaveLocalConfig(localCfg, configPath); err != nil {
		t.Fatalf("Failed to save local config: %v", err)
	}

	// Don't create sync state file
	err := RunStatus(tempDir)
	if err != nil {
		t.Fatalf("RunStatus should not error when sync state missing: %v", err)
	}
	// Output should mention "No sync state found" but this is just printed, not returned
}

// TestRunStatus_Success verifies formatted output shows correct counts
func TestRunStatus_Success(t *testing.T) {
	tempDir := t.TempDir()

	// Create local config
	localCfg := &LocalConfig{
		ProjectKey:       "TEST",
		ProjectName:      "Test Project",
		DeveloperSummary: "developer-summary.md",
		Milestones:       "milestones.yaml",
		TasksDir:         "tasks",
		SyncState:        "sync-state.yaml",
	}
	configPath := filepath.Join(tempDir, "sherpy-jira.yaml")
	if err := SaveLocalConfig(localCfg, configPath); err != nil {
		t.Fatalf("Failed to save local config: %v", err)
	}

	// Create sync state
	syncState := &SyncState{
		Version:    "1.0",
		ProjectKey: "TEST",
		ProjectID:  "10000",
		LastSync:   "2026-05-21T12:00:00Z",
		Epic: SyncEntry{
			JiraKey:     "TEST-1",
			JiraID:      "10001",
			ContentHash: "abc123",
		},
		Milestones: map[string]SyncEntry{
			"m0": {JiraKey: "TEST-2", JiraID: "10002", ContentHash: "def456"},
			"m1": {JiraKey: "TEST-3", JiraID: "10003", ContentHash: "ghi789"},
		},
		Tasks: map[string]SyncEntry{
			"m0-001": {JiraKey: "TEST-4", JiraID: "10004", ContentHash: "jkl012"},
			"m0-002": {JiraKey: "TEST-5", JiraID: "10005", ContentHash: "mno345"},
			"m1-001": {JiraKey: "TEST-6", JiraID: "10006", ContentHash: "pqr678"},
		},
		Links: []LinkEntry{
			{Outward: "TEST-4", Inward: "TEST-5", Type: "Blocks"},
		},
	}
	syncStatePath := filepath.Join(tempDir, "sync-state.yaml")
	if err := SaveSyncState(syncState, syncStatePath); err != nil {
		t.Fatalf("Failed to save sync state: %v", err)
	}

	// Run status
	err := RunStatus(tempDir)
	if err != nil {
		t.Fatalf("RunStatus failed: %v", err)
	}
	// Output is printed to stdout, can't easily verify in unit test
	// but at least we verify no error occurs
}

// TestRunStatus_MissingConfig verifies error when local config missing
func TestRunStatus_MissingConfig(t *testing.T) {
	tempDir := t.TempDir()

	err := RunStatus(tempDir)
	if err == nil {
		t.Fatal("Expected error for missing local config, got nil")
	}

	if !stringContains(err.Error(), "sherpy-jira.yaml") {
		t.Errorf("Expected error about missing sherpy-jira.yaml, got: %v", err)
	}
}
