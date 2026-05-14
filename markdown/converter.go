package markdown

import (
	"fmt"
	"sort"
	"strings"
	"text/template"

	"gopkg.in/yaml.v3"
)

type ConverterFunc func(data []byte) (string, error)

var converters = map[string]ConverterFunc{
	"business-requirements":  ConvertBusinessRequirements,
	"technical-requirements": ConvertTechnicalRequirements,
	"milestones":             ConvertMilestones,
	"milestone-tasks":        ConvertMilestoneTasks,
	"timeline":               ConvertTimeline,
	"qa-test-plan":           ConvertQATestPlan,
	"gap-analysis":           ConvertGapAnalysis,
}

func ResolveConverter(typeName string) (ConverterFunc, error) {
	fn, ok := converters[typeName]
	if !ok {
		return nil, fmt.Errorf("unknown document type: %q", typeName)
	}
	return fn, nil
}

func RegisteredTypes() []string {
	types := make([]string, 0, len(converters))
	for k := range converters {
		types = append(types, k)
	}
	sort.Strings(types)
	return types
}

var funcMap = template.FuncMap{
	"join":      func(sep string, items []string) string { return strings.Join(items, sep) },
	"bulletList": func(items []string) string {
		var b strings.Builder
		for _, item := range items {
			b.WriteString("- ")
			b.WriteString(item)
			b.WriteByte('\n')
		}
		return b.String()
	},
	"joinComma": func(items []string) string { return strings.Join(items, ", ") },
	"add":      func(a, b int) int { return a + b },
}

func execTemplate(name, text string, data interface{}) (result string, err error) {
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("template execution panic: %v", r)
		}
	}()

	tmpl, err := template.New(name).Funcs(funcMap).Parse(text)
	if err != nil {
		return "", fmt.Errorf("template parse error: %w", err)
	}

	var buf strings.Builder
	if err := tmpl.Execute(&buf, data); err != nil {
		return "", fmt.Errorf("template execute error: %w", err)
	}

	return buf.String(), nil
}

func parseYAML(data []byte, v interface{}) error {
	return yaml.Unmarshal(data, v)
}
