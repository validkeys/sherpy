package jira

import (
	"os"
	"path/filepath"
	"testing"
)

func TestGlobalConfigRoundTrip(t *testing.T) {
	tempDir := t.TempDir()
	configPath := filepath.Join(tempDir, "config.yaml")

	original := &GlobalConfig{
		Jira: GlobalJiraConfig{
			Domain: "mycompany.atlassian.net",
			IssueTypes: IssueTypes{
				Epic:    "10000",
				Story:   "10001",
				SubTask: "10002",
			},
		},
	}

	if err := SaveGlobalConfig(original, configPath); err != nil {
		t.Fatalf("SaveGlobalConfig failed: %v", err)
	}

	loaded, err := LoadGlobalConfig(configPath)
	if err != nil {
		t.Fatalf("LoadGlobalConfig failed: %v", err)
	}

	if loaded.Jira.Domain != original.Jira.Domain {
		t.Errorf("Domain mismatch: got %s, want %s", loaded.Jira.Domain, original.Jira.Domain)
	}
	if loaded.Jira.IssueTypes.Epic != original.Jira.IssueTypes.Epic {
		t.Errorf("Epic type mismatch: got %s, want %s", loaded.Jira.IssueTypes.Epic, original.Jira.IssueTypes.Epic)
	}
	if loaded.Jira.IssueTypes.Story != original.Jira.IssueTypes.Story {
		t.Errorf("Story type mismatch: got %s, want %s", loaded.Jira.IssueTypes.Story, original.Jira.IssueTypes.Story)
	}
	if loaded.Jira.IssueTypes.SubTask != original.Jira.IssueTypes.SubTask {
		t.Errorf("SubTask type mismatch: got %s, want %s", loaded.Jira.IssueTypes.SubTask, original.Jira.IssueTypes.SubTask)
	}
}

func TestLoadSyncStateMissing(t *testing.T) {
	tempDir := t.TempDir()
	missingPath := filepath.Join(tempDir, "nonexistent.yaml")

	state, err := LoadSyncState(missingPath)
	if err != nil {
		t.Errorf("LoadSyncState with missing file should not error: %v", err)
	}
	if state != nil {
		t.Errorf("LoadSyncState with missing file should return nil state, got %+v", state)
	}
}

func TestGlobalConfigPath(t *testing.T) {
	path := GlobalConfigPath()
	if path == "" {
		t.Fatal("GlobalConfigPath returned empty string")
	}
	if !filepath.IsAbs(path) {
		t.Errorf("GlobalConfigPath should return absolute path, got %s", path)
	}
	if filepath.Base(filepath.Dir(path)) != "sherpy-to-jira" {
		t.Errorf("GlobalConfigPath should be in sherpy-to-jira directory, got %s", path)
	}
	if filepath.Base(path) != "config.yaml" {
		t.Errorf("GlobalConfigPath should end with config.yaml, got %s", path)
	}
}

func TestInvalidYAML(t *testing.T) {
	tempDir := t.TempDir()
	invalidPath := filepath.Join(tempDir, "invalid.yaml")

	if err := os.WriteFile(invalidPath, []byte("invalid: yaml: content: [[["), 0600); err != nil {
		t.Fatalf("Failed to write invalid YAML: %v", err)
	}

	_, err := LoadGlobalConfig(invalidPath)
	if err == nil {
		t.Fatal("LoadGlobalConfig should fail with invalid YAML")
	}
}

func TestLocalConfigDefaultSyncState(t *testing.T) {
	tempDir := t.TempDir()
	configPath := filepath.Join(tempDir, "sherpy-jira.yaml")

	original := &LocalConfig{
		ProjectKey:       "TEST",
		ProjectName:      "Test Project",
		DeveloperSummary: "docs/developer-summary.md",
		Milestones:       "docs/milestones.yaml",
		TasksDir:         "docs/tasks",
		Timeline:         "docs/timeline.yaml",
		// SyncState left empty - should default
	}

	if err := SaveLocalConfig(original, configPath); err != nil {
		t.Fatalf("SaveLocalConfig failed: %v", err)
	}

	loaded, err := LoadLocalConfig(configPath)
	if err != nil {
		t.Fatalf("LoadLocalConfig failed: %v", err)
	}

	if loaded.SyncState != "sherpy-jira-sync-state.yaml" {
		t.Errorf("SyncState default mismatch: got %s, want sherpy-jira-sync-state.yaml", loaded.SyncState)
	}
}

func TestSyncStateRoundTrip(t *testing.T) {
	tempDir := t.TempDir()
	statePath := filepath.Join(tempDir, "sync-state.yaml")

	original := &SyncState{
		Version:    "1.0.0",
		ProjectKey: "TEST",
		ProjectID:  "10001",
		LastSync:   "2026-05-21T10:00:00Z",
		Epic: SyncEntry{
			JiraKey:     "TEST-1",
			JiraID:      "10099",
			ContentHash: "sha256:abc123",
		},
		Milestones: map[string]SyncEntry{
			"m0": {
				JiraKey:     "TEST-2",
				JiraID:      "10100",
				ContentHash: "sha256:def456",
			},
		},
		Tasks: map[string]SyncEntry{
			"m0-001": {
				JiraKey:     "TEST-3",
				JiraID:      "10101",
				ContentHash: "sha256:ghi789",
			},
		},
		Links: []LinkEntry{
			{
				Outward: "TEST-3",
				Inward:  "TEST-2",
				Type:    "Blocks",
			},
		},
	}

	if err := SaveSyncState(original, statePath); err != nil {
		t.Fatalf("SaveSyncState failed: %v", err)
	}

	loaded, err := LoadSyncState(statePath)
	if err != nil {
		t.Fatalf("LoadSyncState failed: %v", err)
	}

	if loaded.Version != original.Version {
		t.Errorf("Version mismatch: got %s, want %s", loaded.Version, original.Version)
	}
	if loaded.ProjectKey != original.ProjectKey {
		t.Errorf("ProjectKey mismatch: got %s, want %s", loaded.ProjectKey, original.ProjectKey)
	}
	if loaded.Epic.JiraKey != original.Epic.JiraKey {
		t.Errorf("Epic JiraKey mismatch: got %s, want %s", loaded.Epic.JiraKey, original.Epic.JiraKey)
	}
	if len(loaded.Milestones) != len(original.Milestones) {
		t.Errorf("Milestones length mismatch: got %d, want %d", len(loaded.Milestones), len(original.Milestones))
	}
	if len(loaded.Tasks) != len(original.Tasks) {
		t.Errorf("Tasks length mismatch: got %d, want %d", len(loaded.Tasks), len(original.Tasks))
	}
	if len(loaded.Links) != len(original.Links) {
		t.Errorf("Links length mismatch: got %d, want %d", len(loaded.Links), len(original.Links))
	}
}

func TestConfigFilePermissions(t *testing.T) {
	tempDir := t.TempDir()

	// Test global config permissions
	globalPath := filepath.Join(tempDir, "global-config.yaml")
	globalCfg := &GlobalConfig{
		Jira: GlobalJiraConfig{
			Domain: "test.atlassian.net",
			IssueTypes: IssueTypes{
				Epic:    "10000",
				Story:   "10001",
				SubTask: "10002",
			},
		},
	}
	if err := SaveGlobalConfig(globalCfg, globalPath); err != nil {
		t.Fatalf("SaveGlobalConfig failed: %v", err)
	}

	info, err := os.Stat(globalPath)
	if err != nil {
		t.Fatalf("Failed to stat global config: %v", err)
	}
	if info.Mode().Perm() != 0600 {
		t.Errorf("Global config permissions: got %o, want 0600", info.Mode().Perm())
	}

	// Test local config permissions
	localPath := filepath.Join(tempDir, "local-config.yaml")
	localCfg := &LocalConfig{
		ProjectKey: "TEST",
		ProjectName: "Test Project",
	}
	if err := SaveLocalConfig(localCfg, localPath); err != nil {
		t.Fatalf("SaveLocalConfig failed: %v", err)
	}

	info, err = os.Stat(localPath)
	if err != nil {
		t.Fatalf("Failed to stat local config: %v", err)
	}
	if info.Mode().Perm() != 0600 {
		t.Errorf("Local config permissions: got %o, want 0600", info.Mode().Perm())
	}

	// Test sync state permissions
	statePath := filepath.Join(tempDir, "sync-state.yaml")
	state := &SyncState{
		Version: "1.0.0",
		ProjectKey: "TEST",
	}
	if err := SaveSyncState(state, statePath); err != nil {
		t.Fatalf("SaveSyncState failed: %v", err)
	}

	info, err = os.Stat(statePath)
	if err != nil {
		t.Fatalf("Failed to stat sync state: %v", err)
	}
	if info.Mode().Perm() != 0600 {
		t.Errorf("Sync state permissions: got %o, want 0600", info.Mode().Perm())
	}
}
