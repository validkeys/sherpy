package spec

import (
	"fmt"
	"os"
	"sort"
	"strings"
)

type Spec struct {
	Name        string
	Description string
}

var registry = map[string]Spec{
	"business-requirements": {
		Name:        "business-requirements",
		Description: "Business requirements with personas and use cases",
	},
	"technical-requirements": {
		Name:        "technical-requirements",
		Description: "Technical specs and architecture",
	},
	"milestones": {
		Name:        "milestones",
		Description: "Project milestones with dependencies",
	},
	"milestone-tasks": {
		Name:        "milestone-tasks",
		Description: "Detailed task breakdowns",
	},
	"timeline": {
		Name:        "timeline",
		Description: "Delivery timeline and workback dates",
	},
	"qa-test-plan": {
		Name:        "qa-test-plan",
		Description: "QA test suites and test cases",
	},
	"gap-analysis": {
		Name:        "gap-analysis",
		Description: "Gap analysis worksheets",
	},
}

var orphanedWarnings []string

func init() {
	// Validate all registered specs have content
	var missing []string
	for name := range registry {
		if body, ok := content[name]; !ok {
			missing = append(missing, name)
		} else if len(body) == 0 {
			missing = append(missing, name+" (empty)")
		}
	}

	if len(missing) > 0 {
		panic(fmt.Sprintf("spec validation failed - missing or empty content: %s",
			strings.Join(missing, ", ")))
	}

	// Also check for orphaned content (in content map but not registered)
	for name := range content {
		if _, ok := registry[name]; !ok {
			orphanedWarnings = append(orphanedWarnings, name)
		}
	}
}

func RegisteredSpecs() []Spec {
	// Print orphaned warning once
	if len(orphanedWarnings) > 0 {
		fmt.Fprintf(os.Stderr, "Warning: orphaned spec content (not in registry): %s\n",
			strings.Join(orphanedWarnings, ", "))
		orphanedWarnings = nil // Clear so we only warn once
	}

	specs := make([]Spec, 0, len(registry))
	for _, s := range registry {
		specs = append(specs, s)
	}
	sort.Slice(specs, func(i, j int) bool {
		return specs[i].Name < specs[j].Name
	})
	return specs
}

func ResolveSpec(name string) (Spec, error) {
	s, ok := registry[name]
	if !ok {
		return Spec{}, fmt.Errorf("unknown document type: %q", name)
	}
	return s, nil
}

func SpecContent(name string) (string, error) {
	if _, err := ResolveSpec(name); err != nil {
		return "", err
	}
	body, ok := content[name]
	if !ok {
		return "", fmt.Errorf("no content for spec %q", name)
	}
	return body, nil
}
