package schema

import (
	"os"
	"testing"
)

func mustReadTRExample(t *testing.T) []byte {
	t.Helper()
	data, err := os.ReadFile("../docs/specifications/technical-requirements/example.yaml")
	if err != nil {
		t.Fatalf("failed to read technical-requirements example.yaml: %v", err)
	}
	return data
}

func TestTechnicalRequirementsExamplePasses(t *testing.T) {
	data := mustReadTRExample(t)
	result, err := ValidateTechnicalRequirements(data, false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	if !result.Valid() {
		t.Errorf("technical-requirements example.yaml should pass validation, got errors:\n%v", result.Errors)
	}
}

func TestTechnicalRequirementsMissingProject(t *testing.T) {
	yaml := `version: "2.0.0"
generated: "2026-01-01T00:00:00Z"
business_requirements_ref: "./br.yaml"
architecture:
  pattern: "Monolith"
  description: "A simple monolith"
  components:
    - name: "API"
      responsibility: "HTTP interface"
technology_stack:
  language: "Go"
  runtime: "Go 1.21"
  frameworks: ["cobra"]
  package_manager: "go modules"
project_structure:
  type: "single-repo"
  layout: "some layout"
  key_directories:
    - path: "src"
      purpose: "source code"
data_model:
  strategy: "file-based"
api:
  style: "REST"
  framework: "chi"
  versioning: "URL path"
security:
  authentication:
    method: "JWT"
  authorization:
    method: "RBAC"
  secrets:
    storage: "env vars"
    rotation: "quarterly"
  data_validation:
    input: "zod"
    output: "zod"
testing:
  strategy: "TDD"
development:
  code_quality:
    linter: "eslint"
    formatter: "prettier"
    type_checker: "tsc"
operations:
  deployment:
    target: "kubernetes"
    environments:
      - name: "prod"
        config: "production"
constraints:
  technical: ["must use Go"]
  operational: ["2 week timeline"]
trade_offs:
  - decision: "use files"
    rationale: "simplicity"
    alternative: "database"
    consequence: "no concurrency"
open_questions:
  - question: "how to scale?"
    options: ["vertical", "horizontal"]
    impact: "performance"
`
	result, err := ValidateTechnicalRequirements([]byte(yaml), false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	if result.Valid() {
		t.Fatal("expected validation to fail for missing project")
	}
}

func TestTechnicalRequirementsMissingArchitecture(t *testing.T) {
	yaml := `project: "test"
version: "2.0.0"
generated: "2026-01-01T00:00:00Z"
business_requirements_ref: "./br.yaml"
architecture:
  pattern: ""
  description: ""
  components: []
technology_stack:
  language: "Go"
  runtime: "Go 1.21"
  frameworks: ["cobra"]
  package_manager: "go modules"
project_structure:
  type: "single-repo"
  layout: "some layout"
  key_directories:
    - path: "src"
      purpose: "source code"
data_model:
  strategy: "file-based"
api:
  style: "REST"
  framework: "chi"
  versioning: "URL path"
security:
  authentication:
    method: "JWT"
  authorization:
    method: "RBAC"
  secrets:
    storage: "env vars"
    rotation: "quarterly"
  data_validation:
    input: "zod"
    output: "zod"
testing:
  strategy: "TDD"
development:
  code_quality:
    linter: "eslint"
    formatter: "prettier"
    type_checker: "tsc"
operations:
  deployment:
    target: "kubernetes"
    environments:
      - name: "prod"
        config: "production"
constraints:
  technical: ["must use Go"]
  operational: ["2 week timeline"]
trade_offs: []
open_questions: []
`
	result, err := ValidateTechnicalRequirements([]byte(yaml), false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	if result.Valid() {
		t.Fatal("expected validation to fail for missing architecture fields")
	}
}

func TestTechnicalRequirementsInvalidProjectStructureType(t *testing.T) {
	yaml := `project: "test"
version: "2.0.0"
generated: "2026-01-01T00:00:00Z"
business_requirements_ref: "./br.yaml"
architecture:
  pattern: "Monolith"
  description: "A monolith"
  components:
    - name: "API"
      responsibility: "HTTP"
technology_stack:
  language: "Go"
  runtime: "Go 1.21"
  frameworks: ["cobra"]
  package_manager: "go modules"
project_structure:
  type: "invalid-type"
  layout: "some layout"
  key_directories:
    - path: "src"
      purpose: "source code"
data_model:
  strategy: "file-based"
api:
  style: "REST"
  framework: "chi"
  versioning: "URL path"
security:
  authentication:
    method: "JWT"
  authorization:
    method: "RBAC"
  secrets:
    storage: "env vars"
    rotation: "quarterly"
  data_validation:
    input: "zod"
    output: "zod"
testing:
  strategy: "TDD"
development:
  code_quality:
    linter: "eslint"
    formatter: "prettier"
    type_checker: "tsc"
operations:
  deployment:
    target: "kubernetes"
    environments:
      - name: "prod"
        config: "production"
constraints:
  technical: ["must use Go"]
  operational: ["2 week timeline"]
trade_offs:
  - decision: "use files"
    rationale: "simplicity"
    alternative: "database"
    consequence: "no concurrency"
open_questions:
  - question: "how to scale?"
    options: ["vertical", "horizontal"]
    impact: "performance"
`
	result, err := ValidateTechnicalRequirements([]byte(yaml), false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	found := false
	for _, e := range result.Errors {
		if contains(e, "project_structure.type") {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected error about project_structure.type, got: %v", result.Errors)
	}
}

func TestTechnicalRequirementsDuplicateComponentNames(t *testing.T) {
	yaml := `project: "test"
version: "2.0.0"
generated: "2026-01-01T00:00:00Z"
business_requirements_ref: "./br.yaml"
architecture:
  pattern: "Monolith"
  description: "A monolith"
  components:
    - name: "API"
      responsibility: "HTTP"
    - name: "API"
      responsibility: "HTTP again"
technology_stack:
  language: "Go"
  runtime: "Go 1.21"
  frameworks: ["cobra"]
  package_manager: "go modules"
project_structure:
  type: "single-repo"
  layout: "some layout"
  key_directories:
    - path: "src"
      purpose: "source code"
data_model:
  strategy: "file-based"
api:
  style: "REST"
  framework: "chi"
  versioning: "URL path"
security:
  authentication:
    method: "JWT"
  authorization:
    method: "RBAC"
  secrets:
    storage: "env vars"
    rotation: "quarterly"
  data_validation:
    input: "zod"
    output: "zod"
testing:
  strategy: "TDD"
development:
  code_quality:
    linter: "eslint"
    formatter: "prettier"
    type_checker: "tsc"
operations:
  deployment:
    target: "kubernetes"
    environments:
      - name: "prod"
        config: "production"
constraints:
  technical: ["must use Go"]
  operational: ["2 week timeline"]
trade_offs:
  - decision: "use files"
    rationale: "simplicity"
    alternative: "database"
    consequence: "no concurrency"
open_questions:
  - question: "how to scale?"
    options: ["vertical", "horizontal"]
    impact: "performance"
`
	result, err := ValidateTechnicalRequirements([]byte(yaml), false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	found := false
	for _, e := range result.Errors {
		if contains(e, "duplicated") {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected error about duplicate component names, got: %v", result.Errors)
	}
}

func TestTechnicalRequirementsEmptyConstraints(t *testing.T) {
	yaml := `project: "test"
version: "2.0.0"
generated: "2026-01-01T00:00:00Z"
business_requirements_ref: "./br.yaml"
architecture:
  pattern: "Monolith"
  description: "A monolith"
  components:
    - name: "API"
      responsibility: "HTTP"
technology_stack:
  language: "Go"
  runtime: "Go 1.21"
  frameworks: ["cobra"]
  package_manager: "go modules"
project_structure:
  type: "single-repo"
  layout: "some layout"
  key_directories:
    - path: "src"
      purpose: "source code"
data_model:
  strategy: "file-based"
api:
  style: "REST"
  framework: "chi"
  versioning: "URL path"
security:
  authentication:
    method: "JWT"
  authorization:
    method: "RBAC"
  secrets:
    storage: "env vars"
    rotation: "quarterly"
  data_validation:
    input: "zod"
    output: "zod"
testing:
  strategy: "TDD"
development:
  code_quality:
    linter: "eslint"
    formatter: "prettier"
    type_checker: "tsc"
operations:
  deployment:
    target: "kubernetes"
    environments:
      - name: "prod"
        config: "production"
constraints:
  technical: []
  operational: []
trade_offs: []
open_questions: []
`
	result, err := ValidateTechnicalRequirements([]byte(yaml), false)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	if result.Valid() {
		t.Fatal("expected failure for empty constraints")
	}
}
