package schema

import (
	"bytes"
	"fmt"
	"regexp"
	"strconv"
	"strings"

	"gopkg.in/yaml.v3"
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

// enhanceYAMLError takes a yaml unmarshal error and the original YAML data,
// then provides a more helpful error message with context and suggestions
func enhanceYAMLError(err error, data []byte, docType string) error {
	errMsg := err.Error()

	// Extract line number from error message
	lineNumRe := regexp.MustCompile(`line (\d+)`)
	matches := lineNumRe.FindStringSubmatch(errMsg)
	if len(matches) < 2 {
		return fmt.Errorf("failed to parse YAML: %w", err)
	}

	lineNum, _ := strconv.Atoi(matches[1])

	// Get the problematic line and surrounding context
	lines := bytes.Split(data, []byte("\n"))
	if lineNum < 1 || lineNum > len(lines) {
		return fmt.Errorf("failed to parse YAML: %w", err)
	}

	problematicLine := string(lines[lineNum-1])
	fieldName := extractFieldName(problematicLine)

	// Build enhanced error message
	var msg strings.Builder
	msg.WriteString(fmt.Sprintf("YAML parsing error at line %d", lineNum))

	if fieldName != "" {
		msg.WriteString(fmt.Sprintf(" (field: %s)", fieldName))
	}

	msg.WriteString(":\n\n")

	// Show context (2 lines before and after)
	contextStart := lineNum - 3
	if contextStart < 1 {
		contextStart = 1
	}
	contextEnd := lineNum + 2
	if contextEnd > len(lines) {
		contextEnd = len(lines)
	}

	for i := contextStart; i <= contextEnd; i++ {
		prefix := "  "
		if i == lineNum {
			prefix = "> "
		}
		msg.WriteString(fmt.Sprintf("%s%4d | %s\n", prefix, i, lines[i-1]))
	}

	msg.WriteString("\n")

	// Provide specific suggestions based on error type
	if strings.Contains(errMsg, "cannot unmarshal !!map into string") {
		msg.WriteString("Problem: Found a map/object where a simple string value was expected.\n\n")
		msg.WriteString("Suggestions:\n")
		msg.WriteString("  • If this should be a string, remove the nested structure and use a simple value\n")
		msg.WriteString("  • Check that indentation is correct (YAML is whitespace-sensitive)\n")
		msg.WriteString("  • Verify the field matches the expected schema structure\n")
		if fieldName != "" {
			msg.WriteString(fmt.Sprintf("  • Check the %s schema documentation for the correct format\n", docType))
		}
	} else if strings.Contains(errMsg, "cannot unmarshal !!str into") {
		msg.WriteString("Problem: Found a string where a structured value (map/array) was expected.\n\n")
		msg.WriteString("Suggestions:\n")
		msg.WriteString("  • If this should be a map, use key-value pairs with proper indentation\n")
		msg.WriteString("  • If this should be an array, use '- item' format with dashes\n")
		msg.WriteString("  • Check the schema documentation for the expected structure\n")
	} else if strings.Contains(errMsg, "cannot unmarshal !!seq into") {
		msg.WriteString("Problem: Found an array where a different type was expected.\n\n")
		msg.WriteString("Suggestions:\n")
		msg.WriteString("  • Check if this field should be a single value instead of a list\n")
		msg.WriteString("  • Verify the field type in the schema documentation\n")
	} else {
		msg.WriteString(fmt.Sprintf("Problem: %s\n\n", errMsg))
		msg.WriteString("Suggestions:\n")
		msg.WriteString("  • Check YAML syntax (proper indentation, quotes, colons)\n")
		msg.WriteString("  • Verify field names match the schema exactly\n")
		msg.WriteString("  • Ensure all required fields are present\n")
	}

	msg.WriteString("\nFor schema reference, run: sherpy types")

	return fmt.Errorf("%s", msg.String())
}

// extractFieldName attempts to extract the YAML field name from a line
func extractFieldName(line string) string {
	trimmed := strings.TrimSpace(line)
	if idx := strings.Index(trimmed, ":"); idx > 0 {
		return strings.TrimSpace(trimmed[:idx])
	}
	return ""
}

// unmarshalWithBetterErrors attempts to unmarshal YAML with enhanced error messages
func unmarshalWithBetterErrors(data []byte, v interface{}, docType string) error {
	if err := yaml.Unmarshal(data, v); err != nil {
		return enhanceYAMLError(err, data, docType)
	}
	return nil
}
