package markdown

import (
	"os"
	"strings"
	"testing"
)

func mustReadExample(t *testing.T, path string) []byte {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("failed to read %s: %v", path, err)
	}
	return data
}

func assertContains(t *testing.T, got, substr string) {
	t.Helper()
	if !strings.Contains(got, substr) {
		t.Errorf("output missing %q", substr)
	}
}


func TestConvertAllDocumentTypes(t *testing.T) {
	tests := []struct {
		name      string
		converter ConverterFunc
		yamlPath  string
		wantInMD  []string // Strings that should appear in output
	}{
		{
			name:      "business-requirements",
			converter: ConvertBusinessRequirements,
			yamlPath:  "../docs/specifications/business-requirements/example.yaml",
			wantInMD: []string{
				"# Business Requirements:",
				"## Problem Statement",
				"## Value Proposition",
				"## Scope",
				"## User Personas",
				"## Use Cases",
				"## Functional Requirements",
				"## Success Criteria",
				"## Assumptions",
				"## Risks",
				"## Constraints",
				"## Timeline",
				"| ID | Description | Priority | Rationale |",
				"| Criterion | Metric | Target |",
				"| Risk | Probability | Impact | Mitigation |",
				"### Technical",
				"### Task Management Requirements",
				"| FR-1 |",
				"**Phase:**",
				"**Duration:**",
				"Version:",
				"Generated:",
			},
		},
		{
			name:      "technical-requirements",
			converter: ConvertTechnicalRequirements,
			yamlPath:  "../docs/specifications/technical-requirements/example.yaml",
			wantInMD: []string{
				"# Technical Requirements:",
				"## Architecture",
				"## Technology Stack",
				"## Project Structure",
				"## Data Model",
				"## API",
				"## Security",
				"## Testing",
				"## Development / Code Quality",
				"## Operations / Deployment",
				"## Constraints",
				"## Trade-offs",
				"## Open Questions",
				"| Name | Responsibility |",
				"| Path | Purpose |",
				"| Name | Config |",
				"| Decision | Rationale | Alternative | Consequence |",
			},
		},
		{
			name:      "milestones",
			converter: ConvertMilestones,
			yamlPath:  "../docs/specifications/milestones/example.yaml",
			wantInMD: []string{
				"# Milestones:",
				"## Strategy",
				"## Milestones",
				"### m0:",
				"**Dependencies:**",
				"**Success Criteria:**",
			},
		},
		{
			name:      "milestone-tasks",
			converter: ConvertMilestoneTasks,
			yamlPath:  "../docs/specifications/milestone-tasks/example.yaml",
			wantInMD: []string{
				"## Global Constraints",
				"## Quality Gates",
				"## Tasks",
				"| Stage | Commands | Criteria |",
				"**Type:**",
				"**Instructions:**",
				"**Create:**",
				"**Modify:**",
			},
		},
		{
			name:      "timeline",
			converter: ConvertTimeline,
			yamlPath:  "../docs/specifications/timeline/example.yaml",
			wantInMD: []string{
				"# Timeline:",
				"## Summary",
				"## Development Milestones",
				"## Post-Development Phases",
				"## Workback Schedule",
				"| ID | Name | Start | Completion | Days |",
				"| ID | Name | Type | Start Date | Completion Date |",
				"**Development Days:**",
				"**Delivery Model:**",
				"| m0 |",
				"| post-pr-creation |",
				"production-deploy",
			},
		},
		{
			name:      "qa-test-plan",
			converter: ConvertQATestPlan,
			yamlPath:  "../docs/specifications/qa-test-plan/example.yaml",
			wantInMD: []string{
				"# QA Test Plan:",
				"## Summary",
				"## Test Suites",
				"**Test Suites:**",
				"**Priority Breakdown:**",
				"| ID | Name | Type | Priority |",
				"**Preconditions:**",
				"**Expected Result:**",
				"1. ",
				"2. ",
			},
		},
		{
			name:      "gap-analysis",
			converter: ConvertGapAnalysis,
			yamlPath:  "../docs/specifications/gap-analysis-worksheet/example.yaml",
			wantInMD: []string{
				"# Gap Analysis Worksheet",
				"**Document:**",
				"**Status:**",
				"**Total Gaps:**",
				"### Gap 1",
				"**Question:**",
				"**Requirement:**",
				"**Answer:**",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			data := mustReadExample(t, tt.yamlPath)
			md, err := tt.converter(data)
			if err != nil {
				t.Fatalf("conversion failed: %v", err)
			}

			// Common checks
			if len(md) == 0 {
				t.Fatal("output is empty")
			}
			if len(md) < 100 {
				t.Errorf("output suspiciously short: %d bytes", len(md))
			}

			// Check for expected content
			for _, want := range tt.wantInMD {
				assertContains(t, md, want)
			}
		})
	}
}


func TestResolveConverter(t *testing.T) {
	_, err := ResolveConverter("business-requirements")
	if err != nil {
		t.Errorf("expected no error for known type, got: %v", err)
	}

	_, err = ResolveConverter("unknown-type")
	if err == nil {
		t.Error("expected error for unknown type")
	}
}

func TestResolveConverterAllTypes(t *testing.T) {
	types := []string{
		"business-requirements",
		"technical-requirements",
		"milestones",
		"milestone-tasks",
		"timeline",
		"qa-test-plan",
		"gap-analysis",
	}
	for _, typeName := range types {
		_, err := ResolveConverter(typeName)
		if err != nil {
			t.Errorf("ResolveConverter(%q) returned error: %v", typeName, err)
		}
	}
}

func TestConvertInvalidYAML(t *testing.T) {
	_, err := ConvertBusinessRequirements([]byte("not: valid: yaml: [[["))
	if err == nil {
		t.Error("expected error for invalid YAML")
	}
}

func TestExecTemplateParseError(t *testing.T) {
	// Test with invalid template syntax
	_, err := execTemplate("test", "{{.Invalid syntax", nil)
	if err == nil {
		t.Error("expected template parse error")
	}
	if !strings.Contains(err.Error(), "template parse error") {
		t.Errorf("unexpected error message: %v", err)
	}
}

func TestExecTemplateExecuteError(t *testing.T) {
	// Test with template that references missing field
	data := struct{ Name string }{"test"}
	_, err := execTemplate("test", "{{.MissingField}}", data)
	if err == nil {
		t.Error("expected template execution error")
	}
	if !strings.Contains(err.Error(), "template execute error") {
		t.Errorf("expected 'template execute error' in message, got: %v", err)
	}
}

func TestExecTemplatePanicRecovery(t *testing.T) {
	// Test with a template that attempts to access nested fields on nil
	// This should be caught by template execution error handling
	type TestData struct {
		Field *struct{ Nested string }
	}
	data := TestData{Field: nil}

	_, err := execTemplate("test", "{{.Field.Nested}}", data)
	// Template execution should either error or handle nil gracefully
	// The key is that it doesn't crash the program
	// Go templates handle nil pointers gracefully, so this might not error
	_ = err

	// Test with actually malformed data that would cause execute error
	_, err = execTemplate("test", "{{range .Items}}{{.Name}}{{end}}", struct{ Items []int }{Items: []int{1, 2, 3}})
	if err == nil {
		t.Error("expected error accessing .Name on int")
	}
}

func TestConvertMalformedYAML(t *testing.T) {
	converters := map[string]ConverterFunc{
		"business-requirements":  ConvertBusinessRequirements,
		"technical-requirements": ConvertTechnicalRequirements,
		"milestones":             ConvertMilestones,
		"timeline":               ConvertTimeline,
		"qa-test-plan":           ConvertQATestPlan,
		"gap-analysis":           ConvertGapAnalysis,
	}

	malformedYAML := []byte("invalid: yaml: content: [missing bracket")

	for name, converter := range converters {
		t.Run(name, func(t *testing.T) {
			_, err := converter(malformedYAML)
			if err == nil {
				t.Errorf("%s: expected error for malformed YAML", name)
			}
		})
	}
}

func TestConvertEmptyFields(t *testing.T) {
	// Test with YAML that has required fields but they're empty
	emptyBR := `
project: ""
version: ""
generated: ""
`
	_, err := ConvertBusinessRequirements([]byte(emptyBR))
	// Should not panic, may produce valid markdown or error
	// Just ensure no panic
	_ = err
}

func TestConvertNullFields(t *testing.T) {
	// Test with YAML that has null values
	nullBR := `
project: null
version: 1.0
generated: "2024-01-01"
`
	_, err := ConvertBusinessRequirements([]byte(nullBR))
	_ = err // Should not panic
}

func TestEscapeMarkdown(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{
			name:  "escapes brackets",
			input: "[link](url)",
			want:  `\[link\]\(url\)`,
		},
		{
			name:  "escapes asterisks",
			input: "*bold* **bolder**",
			want:  `\*bold\* \*\*bolder\*\*`,
		},
		{
			name:  "escapes underscores",
			input: "_italic_ __bold__",
			want:  `\_italic\_ \_\_bold\_\_`,
		},
		{
			name:  "escapes backticks",
			input: "`code` ```block```",
			want:  "\\`code\\` \\`\\`\\`block\\`\\`\\`",
		},
		{
			name:  "escapes hash and exclamation",
			input: "# header ![image](url)",
			want:  `\# header \!\[image\]\(url\)`,
		},
		{
			name:  "escapes backslashes",
			input: `\escape`,
			want:  `\\escape`,
		},
		{
			name:  "malicious markdown injection",
			input: "[click me](javascript:alert('xss'))",
			want:  `\[click me\]\(javascript:alert\('xss'\)\)`,
		},
		{
			name:  "empty string",
			input: "",
			want:  "",
		},
		{
			name:  "no special chars",
			input: "plain text",
			want:  "plain text",
		},
	}

	escapeMarkdown := funcMap["escapeMarkdown"].(func(string) string)

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := escapeMarkdown(tt.input)
			if got != tt.want {
				t.Errorf("escapeMarkdown(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestEscapeHTML(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{
			name:  "escapes script tags",
			input: "<script>alert('xss')</script>",
			want:  "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;",
		},
		{
			name:  "escapes img tags",
			input: `<img src=x onerror="alert('xss')">`,
			want:  "&lt;img src=x onerror=&quot;alert(&#39;xss&#39;)&quot;&gt;",
		},
		{
			name:  "escapes ampersands",
			input: "A & B",
			want:  "A &amp; B",
		},
		{
			name:  "escapes quotes",
			input: `"double" and 'single'`,
			want:  "&quot;double&quot; and &#39;single&#39;",
		},
		{
			name:  "escapes angle brackets",
			input: "<tag>content</tag>",
			want:  "&lt;tag&gt;content&lt;/tag&gt;",
		},
		{
			name:  "malicious iframe injection",
			input: `<iframe src="data:text/html,<script>alert('xss')</script>"></iframe>`,
			want:  "&lt;iframe src=&quot;data:text/html,&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;&quot;&gt;&lt;/iframe&gt;",
		},
		{
			name:  "empty string",
			input: "",
			want:  "",
		},
		{
			name:  "no special chars",
			input: "plain text",
			want:  "plain text",
		},
	}

	escapeHTML := funcMap["escapeHTML"].(func(string) string)

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := escapeHTML(tt.input)
			if got != tt.want {
				t.Errorf("escapeHTML(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestMarkdownInjectionInTemplates(t *testing.T) {
	// Test that malicious content can be safely rendered using escape functions
	tests := []struct {
		name     string
		template string
		data     interface{}
		wantErr  bool
		contains []string
		notContains []string
	}{
		{
			name:     "escape markdown in user field",
			template: "# {{escapeMarkdown .Title}}",
			data:     struct{ Title string }{Title: "[malicious](javascript:alert('xss'))"},
			wantErr:  false,
			contains: []string{`\[malicious\]\(javascript:alert\('xss'\)\)`},
			notContains: []string{"[malicious]"},
		},
		{
			name:     "escape HTML in user field",
			template: "Content: {{escapeHTML .Content}}",
			data:     struct{ Content string }{Content: "<script>alert('xss')</script>"},
			wantErr:  false,
			contains: []string{"&lt;script&gt;"},
			notContains: []string{"<script>"},
		},
		{
			name:     "unescaped structural markdown preserved",
			template: "## {{.Title}}\n\n- Item 1\n- Item 2",
			data:     struct{ Title string }{Title: "Safe Title"},
			wantErr:  false,
			contains: []string{"## Safe Title", "- Item 1", "- Item 2"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := execTemplate("test", tt.template, tt.data)
			if (err != nil) != tt.wantErr {
				t.Errorf("execTemplate() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if err != nil {
				return
			}

			for _, want := range tt.contains {
				if !strings.Contains(result, want) {
					t.Errorf("output missing %q\nGot: %s", want, result)
				}
			}

			for _, notWant := range tt.notContains {
				if strings.Contains(result, notWant) {
					t.Errorf("output should not contain %q\nGot: %s", notWant, result)
				}
			}
		})
	}
}
