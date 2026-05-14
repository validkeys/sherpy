package markdown

import (
	"github.com/kydavis/sherpy/schema"
)

const qaTemplate = `# QA Test Plan: {{.Project}}
Version: {{.Version}} | Generated: {{.Generated}}

## Summary
- **Test Suites:** {{.Summary.TotalTestSuites}}
- **Test Cases:** {{.Summary.TotalTestCases}}
- **Priority Breakdown:** High: {{.Summary.ByPriority.High}}, Medium: {{.Summary.ByPriority.Medium}}, Low: {{.Summary.ByPriority.Low}}
- **Coverage:**
  - Functional Requirements: {{.Summary.Coverage.FunctionalRequirements}}
  - Personas: {{.Summary.Coverage.Personas}}
  - Performance Tests: {{.Summary.Coverage.HasPerformanceTests}}
  - Security Tests: {{.Summary.Coverage.HasSecurityTests}}

## Test Suites
{{range .TestSuites}}
### {{.ID}}: {{.Name}}

{{.Description}}

**Requirement Refs:** {{joinComma .RequirementRefs}}

#### Test Cases

| ID | Name | Type | Priority |
|----|------|------|----------|
{{range .TestCases}}| {{.ID}} | {{.Name}} | {{.Type}} | {{.Priority}} |
{{end}}
{{range .TestCases}}
##### {{.ID}}: {{.Name}}
**Type:** {{.Type}} | **Priority:** {{.Priority}}

**Preconditions:**
{{bulletList .Preconditions}}
**Steps:**
{{range $i, $step := .Steps}}{{add 1 $i}}. {{$step}}
{{end}}
**Expected Result:** {{.ExpectedResult}}

**Requirement Refs:** {{joinComma .RequirementRefs}}{{if .Tags}}
**Tags:** {{joinComma .Tags}}{{end}}

{{end}}
{{end}}
`

func ConvertQATestPlan(data []byte) (string, error) {
	var doc schema.QATestPlan
	if err := parseYAML(data, &doc); err != nil {
		return "", err
	}
	return execTemplate("qa-test-plan", qaTemplate, doc)
}
