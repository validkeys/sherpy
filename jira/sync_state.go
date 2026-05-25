package jira

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"sort"
	"strings"
)

// HashDeveloperSummary computes a SHA-256 content hash for the developer summary.
func HashDeveloperSummary(summary *DeveloperSummary) string {
	// Hash title + content
	data := summary.Title + "\n" + summary.Content
	hash := sha256.Sum256([]byte(data))
	return "sha256:" + hex.EncodeToString(hash[:])
}

// HashMilestone computes a SHA-256 content hash for a milestone.
// Dependencies are sorted to ensure deterministic hashing.
func HashMilestone(m *Milestone) string {
	// Sort dependencies to ensure deterministic order
	deps := make([]string, len(m.Dependencies))
	copy(deps, m.Dependencies)
	sort.Strings(deps)

	// Sort success criteria for determinism
	criteria := make([]string, len(m.SuccessCriteria))
	copy(criteria, m.SuccessCriteria)
	sort.Strings(criteria)

	// Build canonical representation
	var parts []string
	parts = append(parts, "name:"+m.Name)
	parts = append(parts, "description:"+m.Description)
	parts = append(parts, "estimated_duration:"+m.EstimatedDuration)
	parts = append(parts, "success_criteria:"+strings.Join(criteria, ","))
	parts = append(parts, "dependencies:"+strings.Join(deps, ","))

	data := strings.Join(parts, "\n")
	hash := sha256.Sum256([]byte(data))
	return "sha256:" + hex.EncodeToString(hash[:])
}

// HashTask computes a SHA-256 content hash for a task.
// Dependencies are sorted to ensure deterministic hashing.
func HashTask(t *Task) string {
	deps := t.GetDependencies()
	sortedDeps := make([]string, len(deps))
	copy(sortedDeps, deps)
	sort.Strings(sortedDeps)

	var parts []string
	parts = append(parts, "name:"+t.GetSummary())
	parts = append(parts, "description:"+t.Description)
	parts = append(parts, fmt.Sprintf("estimate_minutes:%d", t.GetEstimate()))
	parts = append(parts, "type:"+t.Type)
	parts = append(parts, "dependencies:"+strings.Join(sortedDeps, ","))

	data := strings.Join(parts, "\n")
	hash := sha256.Sum256([]byte(data))
	return "sha256:" + hex.EncodeToString(hash[:])
}
