package prompt

import (
	"fmt"
	"os"
	"sort"
	"strings"
)

type Prompt struct {
	Name        string
	Description string
	Step        int
	Category    string
}

var registry = map[string]Prompt{
	"gap-analysis-worksheet": {
		Name:        "gap-analysis-worksheet",
		Step:        1,
		Category:    "planning",
		Description: "Analyzes initial requirements document for gaps and ambiguities",
	},
	"business-requirements-interview": {
		Name:        "business-requirements-interview",
		Step:        2,
		Category:    "interview",
		Description: "Conducts structured interview to gather business requirements",
	},
	"technical-requirements-interview": {
		Name:        "technical-requirements-interview",
		Step:        3,
		Category:    "interview",
		Description: "Conducts structured interview to gather technical requirements",
	},
	"style-anchors-collection": {
		Name:        "style-anchors-collection",
		Step:        4,
		Category:    "implementation",
		Description: "Collects and documents exemplar code patterns as style anchors",
	},
	"ux-wireframe-planning": {
		Name:        "ux-wireframe-planning",
		Step:        6,
		Category:    "design",
		Description: "Detects UI/webapp changes and generates wireframe specs and visual wireframes",
	},
	"implementation-planner": {
		Name:        "implementation-planner",
		Step:        5,
		Category:    "implementation",
		Description: "Generates detailed implementation plan with TDD task breakdown",
	},
	"implementation-plan-review": {
		Name:        "implementation-plan-review",
		Step:        7,
		Category:    "review",
		Description: "Reviews implementation plans against best practices and quality gates",
	},
	"definition-of-done": {
		Name:        "definition-of-done",
		Step:        8,
		Category:    "planning",
		Description: "Enhances milestones with detailed acceptance criteria and exit checklists",
	},
	"architecture-decision-record": {
		Name:        "architecture-decision-record",
		Step:        9,
		Category:    "documentation",
		Description: "Documents architectural decisions with context and consequences",
	},
	"delivery-timeline": {
		Name:        "delivery-timeline",
		Step:        10,
		Category:    "planning",
		Description: "Generates delivery timeline from milestones and task estimates",
	},
	"qa-test-plan": {
		Name:        "qa-test-plan",
		Step:        11,
		Category:    "testing",
		Description: "Generates comprehensive QA test plan from business and technical requirements",
	},
	"developer-summary": {
		Name:        "developer-summary",
		Step:        12,
		Category:    "documentation",
		Description: "Generates concise developer summary from planning artifacts",
	},
	"executive-summary": {
		Name:        "executive-summary",
		Step:        13,
		Category:    "documentation",
		Description: "Generates executive summary for non-technical stakeholders",
	},
}

var orphanedWarnings []string

func init() {
	// Validate all registered prompts have content
	var missing []string
	for name := range registry {
		if body, ok := content[name]; !ok {
			missing = append(missing, name)
		} else if len(body) == 0 {
			missing = append(missing, name+" (empty)")
		}
	}

	if len(missing) > 0 {
		panic(fmt.Sprintf("prompt validation failed - missing or empty content: %s",
			strings.Join(missing, ", ")))
	}

	// Also check for orphaned content (in content map but not registered)
	for name := range content {
		if _, ok := registry[name]; !ok {
			orphanedWarnings = append(orphanedWarnings, name)
		}
	}
}

func RegisteredPrompts() []Prompt {
	// Print orphaned warning once
	if len(orphanedWarnings) > 0 {
		fmt.Fprintf(os.Stderr, "Warning: orphaned prompt content (not in registry): %s\n",
			strings.Join(orphanedWarnings, ", "))
		orphanedWarnings = nil // Clear so we only warn once
	}

	prompts := make([]Prompt, 0, len(registry))
	for _, p := range registry {
		prompts = append(prompts, p)
	}
	sort.Slice(prompts, func(i, j int) bool {
		return prompts[i].Name < prompts[j].Name
	})
	return prompts
}

func ResolvePrompt(name string) (Prompt, error) {
	p, ok := registry[name]
	if !ok {
		return Prompt{}, fmt.Errorf("unknown prompt type: %q", name)
	}
	return p, nil
}

func PromptContent(name string) (string, error) {
	if _, err := ResolvePrompt(name); err != nil {
		return "", err
	}
	body, ok := content[name]
	if !ok {
		return "", fmt.Errorf("no content for prompt %q", name)
	}
	// Content already stripped by gen_prompts.go at build time
	return body, nil
}
