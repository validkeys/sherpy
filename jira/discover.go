package jira

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// FileStatus represents the discovery status of a file
type FileStatus struct {
	Name        string   // Human-readable name (e.g., "developer-summary.md")
	Required    bool     // Whether this file is required
	Found       bool     // Whether the file was found
	Path        string   // Relative path if found, empty if not
	Searched    []string // Paths that were checked for this file
	Suggestions []string // Remediation suggestions if not found
}

// DiscoverResult contains the paths to discovered sherpy source documents.
// All paths are relative to the root directory passed to DiscoverFiles.
type DiscoverResult struct {
	DeveloperSummary string   // Path to developer-summary.md (required)
	Milestones       string   // Path to milestones.yaml (required)
	TasksDir         string   // Path to directory containing milestone-m*.tasks.yaml files (required)
	Timeline         string   // Path to timeline.yaml (optional, empty if not found)
	Warnings         []string // Non-fatal warnings (e.g., missing timeline)

	// Search tracking fields for enhanced reporting
	FileStatuses []FileStatus // Detailed status of each file searched
}

// DiscoverFiles searches for sherpy source documents starting from root.
// It uses a convention-first search, then falls back to recursive walk.
// Returns a result with detailed file status information, even if some required files are missing.
func DiscoverFiles(root string) (*DiscoverResult, error) {
	// Phase 1: Convention-first search
	// Look for standard patterns: docs/**/implementation/milestones.yaml
	conventionResult := searchConvention(root)
	conventionResult.buildFileStatuses(root)
	if conventionResult.isComplete() {
		return conventionResult, nil
	}

	// Phase 2: Recursive fallback
	// Walk the entire tree looking for exact filename matches
	fallbackResult := searchRecursive(root)
	fallbackResult.buildFileStatuses(root)

	if !fallbackResult.isComplete() {
		return fallbackResult, fmt.Errorf("could not find required files")
	}

	return fallbackResult, nil
}

// isComplete checks if all required fields are populated
func (r *DiscoverResult) isComplete() bool {
	return r.DeveloperSummary != "" && r.Milestones != "" && r.TasksDir != ""
}

// searchConvention looks for files in common sherpy directory patterns
func searchConvention(root string) *DiscoverResult {
	result := &DiscoverResult{}

	// Walk the tree looking for implementation directories containing milestones.yaml
	var candidates []string
	filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
		if err != nil || shouldSkipDir(d) {
			if d != nil && d.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		if d.IsDir() && strings.HasSuffix(path, "implementation") {
			milestonesPath := filepath.Join(path, "milestones.yaml")
			if _, err := os.Stat(milestonesPath); err == nil {
				candidates = append(candidates, path)
			}
		}
		return nil
	})

	// Score candidates and pick the best match
	for _, implDir := range candidates {
		relImplDir, _ := filepath.Rel(root, implDir)

		milestonesPath := filepath.Join(relImplDir, "milestones.yaml")
		if _, err := os.Stat(filepath.Join(root, milestonesPath)); err == nil {
			result.Milestones = milestonesPath
		}

		// Look for developer-summary.md in parent directory
		parentDir := filepath.Dir(implDir)
		summaryPath := filepath.Join(parentDir, "developer-summary.md")
		if _, err := os.Stat(summaryPath); err == nil {
			relSummary, _ := filepath.Rel(root, summaryPath)
			result.DeveloperSummary = relSummary
		}

		// Look for tasks directory
		tasksDir := filepath.Join(implDir, "tasks")
		if hasTaskFiles(tasksDir) {
			relTasksDir, _ := filepath.Rel(root, tasksDir)
			result.TasksDir = relTasksDir
		}

		// Look for timeline.yaml in common locations
		timelineLocations := []string{
			filepath.Join(parentDir, "timeline.yaml"),
			filepath.Join(parentDir, "delivery", "timeline.yaml"),
		}
		for _, timelinePath := range timelineLocations {
			if _, err := os.Stat(timelinePath); err == nil {
				relTimeline, _ := filepath.Rel(root, timelinePath)
				result.Timeline = relTimeline
				break
			}
		}
		if result.Timeline == "" {
			result.Warnings = append(result.Warnings, "timeline.yaml not found (optional)")
		}

		// If we found everything, return this candidate
		if result.isComplete() {
			return result
		}
	}

	// Add warning if timeline wasn't found
	if result.Timeline == "" && result.isComplete() {
		result.Warnings = append(result.Warnings, "timeline.yaml not found (optional)")
	}

	return result
}

// searchRecursive performs a recursive walk looking for exact filename matches
func searchRecursive(root string) *DiscoverResult {
	result := &DiscoverResult{}

	var tasksDirs []string

	filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
		if err != nil || shouldSkipDir(d) {
			if d != nil && d.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		if d.IsDir() {
			return nil
		}

		relPath, _ := filepath.Rel(root, path)
		name := d.Name()

		switch name {
		case "developer-summary.md":
			if result.DeveloperSummary == "" {
				result.DeveloperSummary = relPath
			}
		case "milestones.yaml":
			if result.Milestones == "" {
				result.Milestones = relPath
			}
		case "timeline.yaml":
			if result.Timeline == "" {
				result.Timeline = relPath
			}
		}

		// Check for milestone task files
		if strings.HasPrefix(name, "milestone-m") && strings.HasSuffix(name, ".tasks.yaml") {
			dir := filepath.Dir(path)
			relDir, _ := filepath.Rel(root, dir)
			if !contains(tasksDirs, relDir) {
				tasksDirs = append(tasksDirs, relDir)
			}
		}

		return nil
	})

	// Pick the first (closest to root) tasks directory
	if len(tasksDirs) > 0 {
		result.TasksDir = tasksDirs[0]
	}

	// Add warning if timeline wasn't found
	if result.Timeline == "" {
		result.Warnings = append(result.Warnings, "timeline.yaml not found (optional)")
	}

	return result
}

// shouldSkipDir returns true if the directory should be skipped during traversal
func shouldSkipDir(d os.DirEntry) bool {
	if d == nil || !d.IsDir() {
		return false
	}
	name := d.Name()
	return name == ".git" || name == "node_modules" || name == "vendor"
}

// hasTaskFiles checks if a directory contains milestone-m*.tasks.yaml files
func hasTaskFiles(dir string) bool {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return false
	}

	for _, e := range entries {
		if !e.IsDir() {
			name := e.Name()
			if strings.HasPrefix(name, "milestone-m") && strings.HasSuffix(name, ".tasks.yaml") {
				return true
			}
		}
	}
	return false
}

// contains checks if a string slice contains a value
func contains(slice []string, val string) bool {
	for _, item := range slice {
		if item == val {
			return true
		}
	}
	return false
}

// Note: We keep this simple implementation instead of using slices.Contains
// to maintain compatibility with Go 1.20 and avoid additional dependencies.

// buildFileStatuses populates the FileStatuses field with detailed information
// about what files were searched for and found.
func (r *DiscoverResult) buildFileStatuses(root string) {
	r.FileStatuses = []FileStatus{
		{
			Name:        "developer-summary.md",
			Required:    true,
			Found:       r.DeveloperSummary != "",
			Path:        r.DeveloperSummary,
			Searched:    r.buildSearchedPaths(root, "developer-summary.md"),
			Suggestions: r.buildSuggestions(root, "developer-summary.md", r.DeveloperSummary == ""),
		},
		{
			Name:        "milestones.yaml",
			Required:    true,
			Found:       r.Milestones != "",
			Path:        r.Milestones,
			Searched:    r.buildSearchedPaths(root, "milestones.yaml"),
			Suggestions: r.buildSuggestions(root, "milestones.yaml", r.Milestones == ""),
		},
		{
			Name:        "milestone task files",
			Required:    true,
			Found:       r.TasksDir != "",
			Path:        r.TasksDir,
			Searched:    r.buildSearchedPaths(root, "milestone-m*.tasks.yaml"),
			Suggestions: r.buildSuggestions(root, "milestone-m*.tasks.yaml", r.TasksDir == ""),
		},
		{
			Name:        "timeline.yaml",
			Required:    false,
			Found:       r.Timeline != "",
			Path:        r.Timeline,
			Searched:    r.buildSearchedPaths(root, "timeline.yaml"),
			Suggestions: r.buildSuggestions(root, "timeline.yaml", r.Timeline == ""),
		},
	}
}

// buildSearchedPaths returns common paths that were likely searched for a given filename
func (r *DiscoverResult) buildSearchedPaths(root, filename string) []string {
	if filename == "milestone-m*.tasks.yaml" {
		return []string{
			"./implementation/tasks/",
			"./tasks/",
			"./**/implementation/tasks/",
		}
	}

	commonPaths := []string{
		"./" + filename,
	}

	if filename == "developer-summary.md" {
		commonPaths = append(commonPaths,
			"./docs/"+filename,
			"./**/"+filename,
		)
	} else if filename == "milestones.yaml" {
		commonPaths = append(commonPaths,
			"./implementation/"+filename,
			"./docs/implementation/"+filename,
			"./**/implementation/"+filename,
		)
	} else if filename == "timeline.yaml" {
		commonPaths = append(commonPaths,
			"./delivery/"+filename,
			"./docs/delivery/"+filename,
			"./**/"+filename,
		)
	}

	return commonPaths
}

// buildSuggestions returns actionable remediation suggestions when a file is missing
func (r *DiscoverResult) buildSuggestions(root, filename string, missing bool) []string {
	if !missing {
		return nil
	}

	var suggestions []string

	switch filename {
	case "developer-summary.md":
		// Check for alternative names
		alternativeNames := []string{"PROJECT-SUMMARY.md", "project-summary.md", "README.md"}
		for _, altName := range alternativeNames {
			if fileExists(filepath.Join(root, altName)) {
				suggestions = append(suggestions, fmt.Sprintf("Found %s - try: mv %s developer-summary.md", altName, altName))
				break
			}
		}
		if len(suggestions) == 0 {
			suggestions = append(suggestions, "Create developer-summary.md with project overview and deliverables")
		}

	case "milestones.yaml":
		suggestions = append(suggestions, "Expected location: ./implementation/milestones.yaml")
		suggestions = append(suggestions, "Run 'sherpy plan' to generate implementation artifacts")

	case "milestone-m*.tasks.yaml":
		suggestions = append(suggestions, "Expected location: ./implementation/tasks/milestone-m*.tasks.yaml")
		suggestions = append(suggestions, "Task files should follow pattern: milestone-m1.tasks.yaml, milestone-m2.tasks.yaml, etc.")

	case "timeline.yaml":
		suggestions = append(suggestions, "timeline.yaml is optional but recommended")
		suggestions = append(suggestions, "Expected location: ./delivery/timeline.yaml or ./timeline.yaml")
	}

	return suggestions
}

// fileExists checks if a file exists at the given path
func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}
