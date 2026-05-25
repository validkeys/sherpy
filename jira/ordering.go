package jira

import (
	"fmt"
)

// OrderMilestones performs a topological sort of milestones based on their dependencies.
// Returns milestones grouped by levels: level 0 = no dependencies, level 1 = only depends on level 0, etc.
// Each level can be processed in parallel.
// Returns an error if a circular dependency is detected.
func OrderMilestones(milestones []Milestone) ([][]Milestone, error) {
	// Build dependency graph
	graph := make(map[string][]string) // milestone ID -> list of dependencies
	inDegree := make(map[string]int)   // milestone ID -> number of dependencies
	allIDs := make(map[string]Milestone)

	for _, m := range milestones {
		allIDs[m.ID] = m
		graph[m.ID] = m.Dependencies
		inDegree[m.ID] = len(m.Dependencies)
	}

	// BFS topological sort by levels
	var levels [][]Milestone
	processed := make(map[string]bool)

	for len(processed) < len(milestones) {
		// Find all milestones with in-degree 0 (no unprocessed dependencies)
		var currentLevel []Milestone
		for id, m := range allIDs {
			if processed[id] {
				continue
			}

			// Check if all dependencies have been processed
			allDepsProcessed := true
			for _, dep := range m.Dependencies {
				if !processed[dep] {
					allDepsProcessed = false
					break
				}
			}

			if allDepsProcessed {
				currentLevel = append(currentLevel, m)
			}
		}

		// Check for circular dependency
		if len(currentLevel) == 0 {
			// No progress made but still have unprocessed milestones
			return nil, fmt.Errorf("circular dependency detected in milestones")
		}

		// Mark current level as processed
		for _, m := range currentLevel {
			processed[m.ID] = true
		}

		levels = append(levels, currentLevel)
	}

	return levels, nil
}

// OrderTasks performs a topological sort of tasks within a milestone based on their dependencies.
// Returns tasks grouped by levels, similar to OrderMilestones.
// Returns an error if a circular dependency is detected.
func OrderTasks(tasks []Task) ([][]Task, error) {
	// Build dependency graph
	graph := make(map[string][]string) // task ID -> list of dependencies
	inDegree := make(map[string]int)   // task ID -> number of dependencies
	allIDs := make(map[string]Task)

	for _, t := range tasks {
		allIDs[t.ID] = t
		deps := t.GetDependencies()
		graph[t.ID] = deps
		inDegree[t.ID] = len(deps)
	}

	// BFS topological sort by levels
	var levels [][]Task
	processed := make(map[string]bool)

	for len(processed) < len(tasks) {
		var currentLevel []Task
		for id, t := range allIDs {
			if processed[id] {
				continue
			}

			allDepsProcessed := true
			for _, dep := range t.GetDependencies() {
				if !processed[dep] {
					allDepsProcessed = false
					break
				}
			}

			if allDepsProcessed {
				currentLevel = append(currentLevel, t)
			}
		}

		// Check for circular dependency
		if len(currentLevel) == 0 {
			// No progress made but still have unprocessed tasks
			return nil, fmt.Errorf("circular dependency detected in tasks")
		}

		// Mark current level as processed
		for _, t := range currentLevel {
			processed[t.ID] = true
		}

		levels = append(levels, currentLevel)
	}

	return levels, nil
}
