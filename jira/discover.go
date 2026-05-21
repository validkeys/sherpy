package jira

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// DiscoverResult contains the paths to discovered sherpy source documents.
// All paths are relative to the root directory passed to DiscoverFiles.
type DiscoverResult struct {
	DeveloperSummary string   // Path to developer-summary.md (required)
	Milestones       string   // Path to milestones.yaml (required)
	TasksDir         string   // Path to directory containing milestone-m*.tasks.yaml files (required)
	Timeline         string   // Path to timeline.yaml (optional, empty if not found)
	Warnings         []string // Non-fatal warnings (e.g., missing timeline)
}

// DiscoverFiles searches for sherpy source documents starting from root.
// It uses a convention-first search, then falls back to recursive walk.
// Returns an error only if required files (developer-summary.md, milestones.yaml, tasks) are missing.
func DiscoverFiles(root string) (*DiscoverResult, error) {
	// Phase 1: Convention-first search
	// Look for standard patterns: docs/**/implementation/milestones.yaml
	conventionResult := searchConvention(root)
	if conventionResult.isComplete() {
		return conventionResult, nil
	}

	// Phase 2: Recursive fallback
	// Walk the entire tree looking for exact filename matches
	fallbackResult := searchRecursive(root)
	if !fallbackResult.isComplete() {
		return nil, fmt.Errorf("could not find required files")
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

		// Look for timeline.yaml in parent directory
		timelinePath := filepath.Join(parentDir, "timeline.yaml")
		if _, err := os.Stat(timelinePath); err == nil {
			relTimeline, _ := filepath.Rel(root, timelinePath)
			result.Timeline = relTimeline
		} else {
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
