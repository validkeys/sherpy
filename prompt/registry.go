package prompt

import (
	"fmt"
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
	"implementation-planner": {
		Name:        "implementation-planner",
		Step:        5,
		Category:    "implementation",
		Description: "Generates detailed implementation plan with TDD task breakdown",
	},
	"implementation-plan-review": {
		Name:        "implementation-plan-review",
		Step:        6,
		Category:    "review",
		Description: "Reviews implementation plans against best practices and quality gates",
	},
	"definition-of-done": {
		Name:        "definition-of-done",
		Step:        7,
		Category:    "planning",
		Description: "Enhances milestones with detailed acceptance criteria and exit checklists",
	},
	"architecture-decision-record": {
		Name:        "architecture-decision-record",
		Step:        8,
		Category:    "documentation",
		Description: "Documents architectural decisions with context and consequences",
	},
	"delivery-timeline": {
		Name:        "delivery-timeline",
		Step:        9,
		Category:    "planning",
		Description: "Generates delivery timeline from milestones and task estimates",
	},
	"qa-test-plan": {
		Name:        "qa-test-plan",
		Step:        10,
		Category:    "testing",
		Description: "Generates comprehensive QA test plan from business and technical requirements",
	},
	"developer-summary": {
		Name:        "developer-summary",
		Step:        11,
		Category:    "documentation",
		Description: "Generates concise developer summary from planning artifacts",
	},
	"executive-summary": {
		Name:        "executive-summary",
		Step:        12,
		Category:    "documentation",
		Description: "Generates executive summary for non-technical stakeholders",
	},
}

func RegisteredPrompts() []Prompt {
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

func stripFrontmatter(content string) string {
	content = strings.TrimSpace(content)

	if !strings.HasPrefix(content, "---") {
		return content
	}

	rest := content[3:]
	if len(rest) > 0 && rest[0] != '\n' {
		return content
	}

	idx := strings.Index(rest, "\n---")
	if idx == -1 {
		return content
	}

	after := rest[idx+4:]
	if len(after) > 0 && after[0] != '\n' && after[0] != '\r' {
		return content
	}

	body := rest[idx+4:]
	return strings.TrimSpace(body)
}

func PromptContent(name string) (string, error) {
	if _, err := ResolvePrompt(name); err != nil {
		return "", err
	}
	body, ok := content[name]
	if !ok {
		return "", fmt.Errorf("no content for prompt %q", name)
	}
	return body, nil
}
