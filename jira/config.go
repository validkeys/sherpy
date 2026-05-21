package jira

import (
	"fmt"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

// GlobalConfig stores Jira instance metadata shared across all projects.
// Typically located at ~/.config/sherpy-to-jira/config.yaml
type GlobalConfig struct {
	Jira GlobalJiraConfig `yaml:"jira"`
}

type GlobalJiraConfig struct {
	Domain     string     `yaml:"domain"`
	IssueTypes IssueTypes `yaml:"issue_types"`
}

type IssueTypes struct {
	Epic    string `yaml:"epic"`
	Story   string `yaml:"story"`
	SubTask string `yaml:"sub_task"`
}

// LocalConfig points the tool at sherpy source documents for a project.
// Located at sherpy-jira.yaml in the current working directory.
type LocalConfig struct {
	ProjectKey       string `yaml:"project_key"`
	ProjectName      string `yaml:"project_name"`
	DeveloperSummary string `yaml:"developer_summary"`
	Milestones       string `yaml:"milestones"`
	TasksDir         string `yaml:"tasks_dir"`
	Timeline         string `yaml:"timeline"`
	SyncState        string `yaml:"sync_state"`
}

// SyncState maps YAML IDs to Jira issue keys and numeric IDs plus content hashes.
// Located at sherpy-jira-sync-state.yaml by default.
type SyncState struct {
	Version    string               `yaml:"version"`
	ProjectKey string               `yaml:"project_key"`
	ProjectID  string               `yaml:"project_id"`
	LastSync   string               `yaml:"last_sync"`
	Epic       SyncEntry            `yaml:"epic"`
	Milestones map[string]SyncEntry `yaml:"milestones"`
	Tasks      map[string]SyncEntry `yaml:"tasks"`
	Links      []LinkEntry          `yaml:"links"`
}

type SyncEntry struct {
	JiraKey     string `yaml:"jira_key"`
	JiraID      string `yaml:"jira_id"`
	ContentHash string `yaml:"content_hash"`
}

type LinkEntry struct {
	Outward string `yaml:"outward"`
	Inward  string `yaml:"inward"`
	Type    string `yaml:"type"`
}

// GlobalConfigPath returns the default path for the global config file.
// Returns ~/.config/sherpy-to-jira/config.yaml
func GlobalConfigPath() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return filepath.Join(".config", "sherpy-to-jira", "config.yaml")
	}
	return filepath.Join(home, ".config", "sherpy-to-jira", "config.yaml")
}

// LoadGlobalConfig loads the global config from the specified path.
func LoadGlobalConfig(path string) (*GlobalConfig, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read global config: %w", err)
	}

	var cfg GlobalConfig
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("failed to parse global config: %w", err)
	}

	return &cfg, nil
}

// SaveGlobalConfig writes the global config to the specified path.
func SaveGlobalConfig(cfg *GlobalConfig, path string) error {
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return fmt.Errorf("failed to create config directory: %w", err)
	}

	data, err := yaml.Marshal(cfg)
	if err != nil {
		return fmt.Errorf("failed to marshal global config: %w", err)
	}

	if err := os.WriteFile(path, data, 0600); err != nil {
		return fmt.Errorf("failed to write global config: %w", err)
	}

	return nil
}

// LoadLocalConfig loads the project-local config from the specified path.
// Sets SyncState to default value if empty.
func LoadLocalConfig(path string) (*LocalConfig, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read local config: %w", err)
	}

	var cfg LocalConfig
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("failed to parse local config: %w", err)
	}

	// Set default SyncState if empty
	if cfg.SyncState == "" {
		cfg.SyncState = "sherpy-jira-sync-state.yaml"
	}

	return &cfg, nil
}

// SaveLocalConfig writes the project-local config to the specified path.
func SaveLocalConfig(cfg *LocalConfig, path string) error {
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return fmt.Errorf("failed to create config directory: %w", err)
	}

	data, err := yaml.Marshal(cfg)
	if err != nil {
		return fmt.Errorf("failed to marshal local config: %w", err)
	}

	if err := os.WriteFile(path, data, 0600); err != nil {
		return fmt.Errorf("failed to write local config: %w", err)
	}

	return nil
}

// LoadSyncState loads the sync state from the specified path.
// Returns (nil, nil) if the file does not exist (not an error).
func LoadSyncState(path string) (*SyncState, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to read sync state: %w", err)
	}

	var state SyncState
	if err := yaml.Unmarshal(data, &state); err != nil {
		return nil, fmt.Errorf("failed to parse sync state: %w", err)
	}

	return &state, nil
}

// SaveSyncState writes the sync state to the specified path.
func SaveSyncState(state *SyncState, path string) error {
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return fmt.Errorf("failed to create sync state directory: %w", err)
	}

	data, err := yaml.Marshal(state)
	if err != nil {
		return fmt.Errorf("failed to marshal sync state: %w", err)
	}

	if err := os.WriteFile(path, data, 0600); err != nil {
		return fmt.Errorf("failed to write sync state: %w", err)
	}

	return nil
}
