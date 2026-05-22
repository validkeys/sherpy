package jira

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"gopkg.in/yaml.v3"
)

// DeveloperSummary represents the parsed developer-summary.md file.
type DeveloperSummary struct {
	Title   string // Extracted from first H1 heading
	Content string // Full file content for ADF conversion
}

// ParseDeveloperSummary parses the developer-summary.md file to extract
// the title (from the first H1 heading) and the full content.
func ParseDeveloperSummary(path string) (*DeveloperSummary, error) {
	// Read file content
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read developer summary: %w", err)
	}

	content := string(data)

	// Check for empty file
	if len(strings.TrimSpace(content)) == 0 {
		return nil, fmt.Errorf("developer summary file is empty")
	}

	// Find first line starting with "# "
	lines := strings.Split(content, "\n")
	var title string
	for _, line := range lines {
		if trimmed, found := strings.CutPrefix(line, "# "); found {
			// Extract title by stripping "# " prefix
			title = trimmed
			break
		}
	}

	// Validate that we found a heading
	if title == "" {
		return nil, fmt.Errorf("developer summary must contain an H1 heading (line starting with '# ')")
	}

	return &DeveloperSummary{
		Title:   title,
		Content: content,
	}, nil
}

// Milestone represents a single milestone from milestones.yaml.
type Milestone struct {
	ID                string   `yaml:"id"`
	Name              string   `yaml:"name"`
	Description       string   `yaml:"description"`
	Dependencies      []string `yaml:"dependencies"`
	EstimatedDuration string   `yaml:"estimated_duration"`
	TasksFile         string   `yaml:"tasks_file"`
	SuccessCriteria   []string `yaml:"success_criteria"`
}

// MilestonesFile represents the root structure of milestones.yaml.
type MilestonesFile struct {
	Version    string      `yaml:"version"`
	Project    string      `yaml:"project"`
	Milestones []Milestone `yaml:"milestones"`
}

// ParseMilestones parses the milestones.yaml file and validates required fields.
func ParseMilestones(path string) (*MilestonesFile, error) {
	// Read file
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read milestones file: %w", err)
	}

	// Unmarshal YAML
	var mf MilestonesFile
	if err := yaml.Unmarshal(data, &mf); err != nil {
		return nil, fmt.Errorf("failed to parse milestones YAML: %w", err)
	}

	// Validate: at least one milestone
	if len(mf.Milestones) == 0 {
		return nil, fmt.Errorf("milestones file must contain at least one milestone")
	}

	// Validate: all milestones have ID and name
	for i, m := range mf.Milestones {
		if m.ID == "" {
			return nil, fmt.Errorf("milestone at index %d is missing required field 'id'", i)
		}
		if m.Name == "" {
			return nil, fmt.Errorf("milestone %q is missing required field 'name'", m.ID)
		}
	}

	return &mf, nil
}

// Task represents a single task from a milestone task file.
type Task struct {
	ID              string   `yaml:"id"`
	Name            string   `yaml:"name"`
	Description     string   `yaml:"description"`
	EstimateMinutes int      `yaml:"estimate_minutes"`
	Type            string   `yaml:"type"`
	Dependencies    []string `yaml:"dependencies"`
}

// TasksFile represents the root structure of a milestone-m*.tasks.yaml file.
type TasksFile struct {
	Milestone string `yaml:"milestone"`
	Name      string `yaml:"name"`
	Tasks     []Task `yaml:"tasks"`
}

// ParseTasksDir parses all milestone-m*.tasks.yaml files in the given directory
// and returns a map of milestone ID to tasks.
func ParseTasksDir(tasksDir string) (map[string][]Task, error) {
	// Glob for task files
	pattern := filepath.Join(tasksDir, "milestone-m*.tasks.yaml")
	matches, err := filepath.Glob(pattern)
	if err != nil {
		return nil, fmt.Errorf("failed to glob task files: %w", err)
	}

	// Check that we found at least one file
	if len(matches) == 0 {
		return nil, fmt.Errorf("no task files found in directory %q", tasksDir)
	}

	// Parse each file and build the map
	tasksMap := make(map[string][]Task)
	for _, path := range matches {
		// Read file
		data, err := os.ReadFile(path)
		if err != nil {
			return nil, fmt.Errorf("failed to read task file %q: %w", path, err)
		}

		// Unmarshal YAML
		var tf TasksFile
		if err := yaml.Unmarshal(data, &tf); err != nil {
			return nil, fmt.Errorf("failed to parse task file %q: %w", path, err)
		}

		// Add tasks to map keyed by milestone ID
		tasksMap[tf.Milestone] = tf.Tasks
	}

	return tasksMap, nil
}

// TimelineEntry represents a single entry in the timeline workback schedule.
type TimelineEntry struct {
	ID             string `yaml:"id"`
	Name           string `yaml:"name"`
	Type           string `yaml:"type"`
	StartDate      string `yaml:"start_date"`
	CompletionDate string `yaml:"completion_date"`
}

// TimelineFile represents the root structure of timeline.yaml.
type TimelineFile struct {
	Version  string `yaml:"version"`
	Project  string `yaml:"project"`
	Workback struct {
		Schedule []TimelineEntry `yaml:"schedule"`
	} `yaml:"workback"`
}

// ParseTimeline parses timeline.yaml and returns a map of milestone ID to completion date.
// Only entries with type "milestone" are included, and entries with IDs starting with "post-"
// are excluded.
func ParseTimeline(path string) (map[string]string, error) {
	// Read file
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read timeline file: %w", err)
	}

	// Unmarshal YAML
	var tf TimelineFile
	if err := yaml.Unmarshal(data, &tf); err != nil {
		return nil, fmt.Errorf("failed to parse timeline YAML: %w", err)
	}

	// Build map of milestone ID to completion date
	dueDates := make(map[string]string)

	// Handle missing workback section gracefully
	if tf.Workback.Schedule == nil {
		return dueDates, nil
	}

	for _, entry := range tf.Workback.Schedule {
		// Only include milestone entries
		if entry.Type != "milestone" {
			continue
		}

		// Skip post-* entries
		if strings.HasPrefix(entry.ID, "post-") {
			continue
		}

		dueDates[entry.ID] = entry.CompletionDate
	}

	return dueDates, nil
}
