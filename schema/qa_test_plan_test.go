package schema

import (
	"os"
	"testing"
)

func mustReadQATestPlanExample(t *testing.T) []byte {
	t.Helper()
	data, err := os.ReadFile("../docs/specifications/qa-test-plan/example.yaml")
	if err != nil {
		t.Fatalf("failed to read qa-test-plan example.yaml: %v", err)
	}
	return data
}

func TestQATestPlanExamplePasses(t *testing.T) {
	data := mustReadQATestPlanExample(t)
	result, err := ValidateQATestPlan(data, false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	if !result.Valid() {
		t.Errorf("qa-test-plan example.yaml should pass validation, got errors:\n%v", result.Errors)
	}
}

func TestQATestPlanInvalidCaseType(t *testing.T) {
	yaml := `project: test
version: "1.0.0"
generated: "2026-01-01T00:00:00Z"
sources:
  business_requirements: "br.yaml"
  technical_requirements: "tr.yaml"
summary:
  total_test_suites: 1
  total_test_cases: 1
  by_priority:
    high: 1
    medium: 0
    low: 0
  coverage:
    functional_requirements: "100%"
    personas: "100%"
    has_performance_tests: false
    has_security_tests: false
test_suites:
  - id: ts-auth
    name: "Authentication"
    description: "Auth test suite description here"
    requirement_refs: ["BR-001"]
    test_cases:
      - id: tc-auth-001
        name: "Test valid login works correctly"
        type: invalid
        priority: high
        preconditions:
          - "User account exists"
        steps:
          - "Login with valid credentials"
        expected_result: "User is authenticated and redirected"
        requirement_refs: ["BR-001"]
`
	result, err := ValidateQATestPlan([]byte(yaml), false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	if result.Valid() {
		t.Fatal("expected failure for invalid test case type")
	}
}

func TestQATestPlanPriorityMismatch(t *testing.T) {
	yaml := `project: test
version: "1.0.0"
generated: "2026-01-01T00:00:00Z"
sources:
  business_requirements: "br.yaml"
  technical_requirements: "tr.yaml"
summary:
  total_test_suites: 1
  total_test_cases: 1
  by_priority:
    high: 5
    medium: 0
    low: 0
  coverage:
    functional_requirements: "100%"
    personas: "100%"
    has_performance_tests: false
    has_security_tests: false
test_suites:
  - id: ts-auth
    name: "Authentication"
    description: "Auth test suite description here"
    requirement_refs: ["BR-001"]
    test_cases:
      - id: tc-auth-001
        name: "Test valid login works correctly"
        type: positive
        priority: high
        preconditions:
          - "User account exists"
        steps:
          - "Login with valid credentials"
        expected_result: "User is authenticated and redirected"
        requirement_refs: ["BR-001"]
`
	result, err := ValidateQATestPlan([]byte(yaml), false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	found := false
	for _, e := range result.Errors {
		if contains(e, "by_priority") {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected error about by_priority sum, got: %v", result.Errors)
	}
}

func TestQATestPlanInvalidSuiteID(t *testing.T) {
	yaml := `project: test
version: "1.0.0"
generated: "2026-01-01T00:00:00Z"
sources:
  business_requirements: "br.yaml"
  technical_requirements: "tr.yaml"
summary:
  total_test_suites: 1
  total_test_cases: 1
  by_priority:
    high: 1
    medium: 0
    low: 0
  coverage:
    functional_requirements: "100%"
    personas: "100%"
    has_performance_tests: false
    has_security_tests: false
test_suites:
  - id: BAD_ID
    name: "Authentication"
    description: "Auth test suite description here"
    requirement_refs: ["BR-001"]
    test_cases:
      - id: tc-auth-001
        name: "Test valid login works correctly"
        type: positive
        priority: high
        preconditions:
          - "User account exists"
        steps:
          - "Login with valid credentials"
        expected_result: "User is authenticated and redirected"
        requirement_refs: ["BR-001"]
`
	result, err := ValidateQATestPlan([]byte(yaml), false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	found := false
	for _, e := range result.Errors {
		if contains(e, "ts-[slug]") {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected error about suite ID pattern, got: %v", result.Errors)
	}
}

func TestQATestPlanMissingSteps(t *testing.T) {
	yaml := `project: test
version: "1.0.0"
generated: "2026-01-01T00:00:00Z"
sources:
  business_requirements: "br.yaml"
  technical_requirements: "tr.yaml"
summary:
  total_test_suites: 1
  total_test_cases: 1
  by_priority:
    high: 1
    medium: 0
    low: 0
  coverage:
    functional_requirements: "100%"
    personas: "100%"
    has_performance_tests: false
    has_security_tests: false
test_suites:
  - id: ts-auth
    name: "Authentication"
    description: "Auth test suite description here"
    requirement_refs: ["BR-001"]
    test_cases:
      - id: tc-auth-001
        name: "Test valid login works correctly"
        type: positive
        priority: high
        preconditions:
          - "User account exists"
        steps: []
        expected_result: "User is authenticated and redirected"
        requirement_refs: ["BR-001"]
`
	result, err := ValidateQATestPlan([]byte(yaml), false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	if result.Valid() {
		t.Fatal("expected failure for empty steps")
	}
}

func TestQATestPlanSuiteCountMismatch(t *testing.T) {
	yaml := `project: test
version: "1.0.0"
generated: "2026-01-01T00:00:00Z"
sources:
  business_requirements: "br.yaml"
  technical_requirements: "tr.yaml"
summary:
  total_test_suites: 3
  total_test_cases: 1
  by_priority:
    high: 1
    medium: 0
    low: 0
  coverage:
    functional_requirements: "100%"
    personas: "100%"
    has_performance_tests: false
    has_security_tests: false
test_suites:
  - id: ts-auth
    name: "Authentication"
    description: "Auth test suite description here"
    requirement_refs: ["BR-001"]
    test_cases:
      - id: tc-auth-001
        name: "Test valid login works correctly"
        type: positive
        priority: high
        preconditions:
          - "User account exists"
        steps:
          - "Login with valid credentials"
        expected_result: "User is authenticated and redirected"
        requirement_refs: ["BR-001"]
`
	result, err := ValidateQATestPlan([]byte(yaml), false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	found := false
	for _, e := range result.Errors {
		if contains(e, "total_test_suites") {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected error about suite count, got: %v", result.Errors)
	}
}
