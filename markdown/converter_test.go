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


func TestConvertBusinessRequirements(t *testing.T) {
	data := mustReadExample(t, "../docs/specifications/business-requirements/example.yaml")
	got, err := ConvertBusinessRequirements(data)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) == 0 {
		t.Fatal("output is empty")
	}

	for _, s := range []string{
		"# Business Requirements:",
		"## Problem Statement",
		"## Value Proposition",
		"## Scope",
		"## User Personas",
		"## Use Cases",
		"## Functional Requirements",
		"## Success Criteria",
		"## Assumptions",
		"| ID | Description | Priority | Rationale |",
		"| Criterion | Metric | Target |",
		"Version:",
		"Generated:",
	} {
		assertContains(t, got, s)
	}
}

func TestConvertBusinessRequirementsRisks(t *testing.T) {
	data := mustReadExample(t, "../docs/specifications/business-requirements/example.yaml")
	got, err := ConvertBusinessRequirements(data)
	if err != nil {
		t.Fatal(err)
	}
	assertContains(t, got, "## Risks")
	assertContains(t, got, "| Risk | Probability | Impact | Mitigation |")
}

func TestConvertBusinessRequirementsConstraints(t *testing.T) {
	data := mustReadExample(t, "../docs/specifications/business-requirements/example.yaml")
	got, err := ConvertBusinessRequirements(data)
	if err != nil {
		t.Fatal(err)
	}
	assertContains(t, got, "## Constraints")
	assertContains(t, got, "### Technical")
}

func TestConvertBusinessRequirementsTimeline(t *testing.T) {
	data := mustReadExample(t, "../docs/specifications/business-requirements/example.yaml")
	got, err := ConvertBusinessRequirements(data)
	if err != nil {
		t.Fatal(err)
	}
	assertContains(t, got, "## Timeline")
	assertContains(t, got, "**Phase:**")
	assertContains(t, got, "**Duration:**")
}

func TestConvertBusinessRequirementsFRGrouping(t *testing.T) {
	data := mustReadExample(t, "../docs/specifications/business-requirements/example.yaml")
	got, err := ConvertBusinessRequirements(data)
	if err != nil {
		t.Fatal(err)
	}
	assertContains(t, got, "### Task Management Requirements")
	assertContains(t, got, "| FR-1 |")
}

func TestConvertTechnicalRequirements(t *testing.T) {
	data := mustReadExample(t, "../docs/specifications/technical-requirements/example.yaml")
	got, err := ConvertTechnicalRequirements(data)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) == 0 {
		t.Fatal("output is empty")
	}

	for _, s := range []string{
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
		"| Name | Responsibility |",
		"| Path | Purpose |",
		"| Name | Config |",
	} {
		assertContains(t, got, s)
	}
}

func TestConvertTechnicalRequirementsTradeOffs(t *testing.T) {
	data := mustReadExample(t, "../docs/specifications/technical-requirements/example.yaml")
	got, err := ConvertTechnicalRequirements(data)
	if err != nil {
		t.Fatal(err)
	}
	assertContains(t, got, "## Trade-offs")
	assertContains(t, got, "| Decision | Rationale | Alternative | Consequence |")
}

func TestConvertTechnicalRequirementsOpenQuestions(t *testing.T) {
	data := mustReadExample(t, "../docs/specifications/technical-requirements/example.yaml")
	got, err := ConvertTechnicalRequirements(data)
	if err != nil {
		t.Fatal(err)
	}
	assertContains(t, got, "## Open Questions")
}

func TestConvertMilestones(t *testing.T) {
	data := mustReadExample(t, "../docs/specifications/milestones/example.yaml")
	got, err := ConvertMilestones(data)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) == 0 {
		t.Fatal("output is empty")
	}

	for _, s := range []string{
		"# Milestones:",
		"## Strategy",
		"## Milestones",
		"### m0:",
		"**Dependencies:**",
		"**Success Criteria:**",
	} {
		assertContains(t, got, s)
	}
}

func TestConvertMilestoneTasks(t *testing.T) {
	data := mustReadExample(t, "../docs/specifications/milestone-tasks/example.yaml")
	got, err := ConvertMilestoneTasks(data)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) == 0 {
		t.Fatal("output is empty")
	}

	for _, s := range []string{
		"## Global Constraints",
		"## Quality Gates",
		"## Tasks",
		"| Stage | Commands | Criteria |",
		"**Type:**",
		"**Instructions:**",
	} {
		assertContains(t, got, s)
	}
}

func TestConvertMilestoneTasksFiles(t *testing.T) {
	data := mustReadExample(t, "../docs/specifications/milestone-tasks/example.yaml")
	got, err := ConvertMilestoneTasks(data)
	if err != nil {
		t.Fatal(err)
	}
	assertContains(t, got, "**Create:**")
	assertContains(t, got, "**Modify:**")
}

func TestConvertTimeline(t *testing.T) {
	data := mustReadExample(t, "../docs/specifications/timeline/example.yaml")
	got, err := ConvertTimeline(data)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) == 0 {
		t.Fatal("output is empty")
	}

	for _, s := range []string{
		"# Timeline:",
		"## Summary",
		"## Development Milestones",
		"## Post-Development Phases",
		"## Workback Schedule",
		"| ID | Name | Start | Completion | Days |",
		"| ID | Name | Type | Start Date | Completion Date |",
		"**Development Days:**",
		"**Delivery Model:**",
	} {
		assertContains(t, got, s)
	}
}

func TestConvertTimelineSeparatesTypes(t *testing.T) {
	data := mustReadExample(t, "../docs/specifications/timeline/example.yaml")
	got, err := ConvertTimeline(data)
	if err != nil {
		t.Fatal(err)
	}
	assertContains(t, got, "| m0 |")
	assertContains(t, got, "| post-pr-creation |")
	assertContains(t, got, "production-deploy")
}

func TestConvertQATestPlan(t *testing.T) {
	data := mustReadExample(t, "../docs/specifications/qa-test-plan/example.yaml")
	got, err := ConvertQATestPlan(data)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) == 0 {
		t.Fatal("output is empty")
	}

	for _, s := range []string{
		"# QA Test Plan:",
		"## Summary",
		"## Test Suites",
		"**Test Suites:**",
		"**Priority Breakdown:**",
		"| ID | Name | Type | Priority |",
		"**Preconditions:**",
		"**Expected Result:**",
	} {
		assertContains(t, got, s)
	}
}

func TestConvertQATestPlanSteps(t *testing.T) {
	data := mustReadExample(t, "../docs/specifications/qa-test-plan/example.yaml")
	got, err := ConvertQATestPlan(data)
	if err != nil {
		t.Fatal(err)
	}
	assertContains(t, got, "1. ")
	assertContains(t, got, "2. ")
}

func TestConvertGapAnalysis(t *testing.T) {
	data := mustReadExample(t, "../docs/specifications/gap-analysis-worksheet/example.yaml")
	got, err := ConvertGapAnalysis(data)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) == 0 {
		t.Fatal("output is empty")
	}

	for _, s := range []string{
		"# Gap Analysis Worksheet",
		"**Document:**",
		"**Status:**",
		"**Total Gaps:**",
		"### Gap 1",
		"**Question:**",
		"**Requirement:**",
	} {
		assertContains(t, got, s)
	}
}

func TestConvertGapAnalysisAnswer(t *testing.T) {
	data := mustReadExample(t, "../docs/specifications/gap-analysis-worksheet/example.yaml")
	got, err := ConvertGapAnalysis(data)
	if err != nil {
		t.Fatal(err)
	}
	assertContains(t, got, "**Answer:**")
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
