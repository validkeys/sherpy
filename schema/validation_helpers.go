package schema

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
)

const (
	// MaxIDLength prevents ReDoS attacks by rejecting overly long IDs before regex evaluation
	MaxIDLength = 100
)

// validateRequiredField checks if a string field is non-empty after trimming whitespace
func validateRequiredField(r *ValidationResult, value, fieldName string) {
	if strings.TrimSpace(value) == "" {
		r.Errors = append(r.Errors, fieldRequiredError(fieldName))
	}
}

// validateRequiredFields validates multiple required string fields
func validateRequiredFields(r *ValidationResult, fields map[string]string) {
	for fieldName, value := range fields {
		validateRequiredField(r, value, fieldName)
	}
}

// validateStringLength checks if a string meets minimum length requirement
func validateStringLength(r *ValidationResult, value, fieldName string, minLength int) {
	trimmed := strings.TrimSpace(value)
	if len(trimmed) > 0 && len(trimmed) < minLength {
		r.Warnings = append(r.Warnings, fmt.Sprintf("%s should be at least %d characters (got %d)",
			fieldName, minLength, len(trimmed)))
	}
}

// validateEnum checks if value is in allowed set
func validateEnum(r *ValidationResult, value, fieldName string, allowedValues map[string]struct{}) {
	if _, ok := allowedValues[value]; !ok {
		allowed := make([]string, 0, len(allowedValues))
		for k := range allowedValues {
			allowed = append(allowed, k)
		}
		r.Errors = append(r.Errors, fmt.Sprintf("%s must be one of %v (got %q)",
			fieldName, allowed, value))
	}
}

// validateIDFormat checks ID length and format to prevent ReDoS attacks
// Returns true if ID is valid, false otherwise
func validateIDFormat(r *ValidationResult, id string, pattern *regexp.Regexp, fieldName string) bool {
	if len(id) > MaxIDLength {
		r.Errors = append(r.Errors, fmt.Sprintf("%s: ID exceeds maximum length of %d characters: %s",
			fieldName, MaxIDLength, id))
		return false
	}

	if !pattern.MatchString(id) {
		r.Errors = append(r.Errors, fmt.Sprintf("%s: invalid ID format: %s", fieldName, id))
		return false
	}

	return true
}

// validateSequentialIDs checks that IDs follow sequential pattern (e.g., FR-001, FR-002, FR-003)
func validateSequentialIDs(r *ValidationResult, ids []string, pattern *regexp.Regexp, typeName string) {
	for i, id := range ids {
		// Check length before regex to prevent ReDoS
		if !validateIDFormat(r, id, pattern, typeName) {
			continue
		}

		matches := pattern.FindStringSubmatch(id)
		if len(matches) != 2 {
			// Already reported by validateIDFormat
			continue
		}

		num, _ := strconv.Atoi(matches[1])
		expected := i + 1
		if num != expected {
			r.Errors = append(r.Errors, fmt.Sprintf("%s IDs must be sequential (expected %s-%d, got %s)",
				typeName, typeName[:2], expected, id))
		}
	}
}

// detectCircularDependencies checks for cycles in a dependency graph
// Returns true and the cycle path if a cycle is detected
func detectCircularDependencies(dependencies map[string][]string) (bool, []string) {
	visited := make(map[string]bool)
	recStack := make(map[string]bool)
	cycle := []string{}

	var dfs func(node string) bool
	dfs = func(node string) bool {
		visited[node] = true
		recStack[node] = true
		cycle = append(cycle, node)

		for _, dep := range dependencies[node] {
			if !visited[dep] {
				if dfs(dep) {
					return true
				}
			} else if recStack[dep] {
				// Found cycle
				cycleStart := 0
				for i, n := range cycle {
					if n == dep {
						cycleStart = i
						break
					}
				}
				cycle = cycle[cycleStart:]
				return true
			}
		}

		recStack[node] = false
		cycle = cycle[:len(cycle)-1]
		return false
	}

	for node := range dependencies {
		if !visited[node] {
			cycle = []string{}
			if dfs(node) {
				return true, cycle
			}
		}
	}

	return false, nil
}

// Helper functions for error messages
func fieldRequiredError(fieldName string) string {
	return fmt.Sprintf("%s is required", fieldName)
}

func fieldInvalidError(fieldName, reason string) string {
	return fmt.Sprintf("%s: %s", fieldName, reason)
}
