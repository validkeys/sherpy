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
