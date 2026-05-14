package schema

import (
	"fmt"
	"sort"
	"strings"
)

type ValidationResult struct {
	Errors   []string
	Warnings []string
}

func (r *ValidationResult) Valid() bool {
	return len(r.Errors) == 0
}

type ValidatorFunc func(data []byte, strict bool) (*ValidationResult, error)

var registry = map[string]struct {
	pattern   string
	validator ValidatorFunc
}{
	"business-requirements":  {pattern: "business-requirements.yaml", validator: ValidateBusinessRequirements},
	"technical-requirements": {pattern: "technical-requirements.yaml", validator: ValidateTechnicalRequirements},
	"milestones":             {pattern: "milestones.yaml", validator: ValidateMilestones},
	"milestone-tasks":        {pattern: "milestone-m*.tasks.yaml", validator: ValidateMilestoneTasks},
	"timeline":               {pattern: "timeline.yaml", validator: ValidateTimeline},
	"qa-test-plan":           {pattern: "qa-test-plan.yaml", validator: ValidateQATestPlan},
	"gap-analysis":           {pattern: "gap-analysis-worksheet.yaml", validator: ValidateGapAnalysis},
}

func RegisteredTypes() []string {
	types := make([]string, 0, len(registry))
	for k := range registry {
		types = append(types, k)
	}
	sort.Strings(types)
	return types
}

func FilePattern(typeName string) (string, bool) {
	entry, ok := registry[typeName]
	if !ok {
		return "", false
	}
	return entry.pattern, true
}

func ResolveValidator(typeName string) (ValidatorFunc, error) {
	entry, ok := registry[typeName]
	if !ok {
		return nil, fmt.Errorf("unknown document type: %q", typeName)
	}
	return entry.validator, nil
}

func DetectType(filename string) (string, bool) {
	base := filename
	if idx := strings.LastIndex(filename, "/"); idx >= 0 {
		base = filename[idx+1:]
	}

	for typeName, entry := range registry {
		if matchFilename(entry.pattern, base) {
			return typeName, true
		}
	}
	return "", false
}

func matchFilename(pattern, filename string) bool {
	if pattern == filename {
		return true
	}
	if strings.Contains(pattern, "*") {
		parts := strings.SplitN(pattern, "*", 2)
		if len(parts) == 2 {
			return strings.HasPrefix(filename, parts[0]) && strings.HasSuffix(filename, parts[1])
		}
	}
	return false
}

func RegisterValidator(typeName string, v ValidatorFunc) {
	if entry, ok := registry[typeName]; ok {
		entry.validator = v
		registry[typeName] = entry
	}
}
