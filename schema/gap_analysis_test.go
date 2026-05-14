package schema

import (
	"os"
	"testing"
)

func mustReadGapAnalysisExample(t *testing.T) []byte {
	t.Helper()
	data, err := os.ReadFile("../docs/specifications/gap-analysis-worksheet/example.yaml")
	if err != nil {
		t.Fatalf("failed to read gap-analysis example.yaml: %v", err)
	}
	return data
}

func TestGapAnalysisExamplePasses(t *testing.T) {
	data := mustReadGapAnalysisExample(t)
	result, err := ValidateGapAnalysis(data, false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	if !result.Valid() {
		t.Errorf("gap-analysis example.yaml should pass validation, got errors:\n%v", result.Errors)
	}
}

func TestGapAnalysisMissingStatus(t *testing.T) {
	yaml := `metadata:
  source_document: "test.md"
  generated_date: "2026-01-01"
  status: ""
  total_gaps: 1
  version: "1.0"
categories:
  - name: "problem_and_goals"
    gaps:
      - id: 1
        requirement: "test"
        question: "what is the problem?"
        answer: null
        priority: "high"
`
	result, err := ValidateGapAnalysis([]byte(yaml), false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	if result.Valid() {
		t.Fatal("expected validation to fail for missing status")
	}
	found := false
	for _, e := range result.Errors {
		if contains(e, "status") {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected error about status, got: %v", result.Errors)
	}
}

func TestGapAnalysisTotalGapsMismatch(t *testing.T) {
	yaml := `metadata:
  source_document: "test.md"
  generated_date: "2026-01-01"
  status: "awaiting_review"
  total_gaps: 5
  version: "1.0"
categories:
  - name: "problem_and_goals"
    gaps:
      - id: 1
        requirement: "test"
        question: "what is the problem?"
        answer: null
        priority: "high"
`
	result, err := ValidateGapAnalysis([]byte(yaml), false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	if result.Valid() {
		t.Fatal("expected validation to fail for total_gaps mismatch")
	}
	found := false
	for _, e := range result.Errors {
		if contains(e, "total_gaps") {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected error about total_gaps, got: %v", result.Errors)
	}
}

func TestGapAnalysisNonSequentialGapIDs(t *testing.T) {
	yaml := `metadata:
  source_document: "test.md"
  generated_date: "2026-01-01"
  status: "awaiting_review"
  total_gaps: 3
  version: "1.0"
categories:
  - name: "problem_and_goals"
    gaps:
      - id: 1
        requirement: "test"
        question: "question one here"
        answer: null
        priority: "high"
      - id: 3
        requirement: "test"
        question: "question two here"
        answer: null
        priority: "medium"
      - id: 5
        requirement: "test"
        question: "question three here"
        answer: null
        priority: "low"
`
	result, err := ValidateGapAnalysis([]byte(yaml), false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	found := false
	for _, e := range result.Errors {
		if contains(e, "sequential") {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected error about sequential gap IDs, got: %v", result.Errors)
	}
}

func TestGapAnalysisInvalidPriority(t *testing.T) {
	yaml := `metadata:
  source_document: "test.md"
  generated_date: "2026-01-01"
  status: "awaiting_review"
  total_gaps: 1
  version: "1.0"
categories:
  - name: "problem_and_goals"
    gaps:
      - id: 1
        requirement: "test"
        question: "what is the problem?"
        answer: null
        priority: "urgent"
`
	result, err := ValidateGapAnalysis([]byte(yaml), false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	if result.Valid() {
		t.Fatal("expected failure for invalid priority")
	}
}

func TestGapAnalysisInvalidCategory(t *testing.T) {
	yaml := `metadata:
  source_document: "test.md"
  generated_date: "2026-01-01"
  status: "awaiting_review"
  total_gaps: 1
  version: "1.0"
categories:
  - name: "invalid_category"
    gaps:
      - id: 1
        requirement: "test"
        question: "what?"
        answer: null
        priority: "high"
`
	result, err := ValidateGapAnalysis([]byte(yaml), false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	found := false
	for _, e := range result.Errors {
		if contains(e, "standard category") {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected error about standard category, got: %v", result.Errors)
	}
}
