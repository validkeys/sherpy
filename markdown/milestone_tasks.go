package markdown

import (
	"github.com/kydavis/sherpy/schema"
)

const mtTemplate = `# {{.Name}} ({{.Milestone}})
Generated: {{.Generated}}

## Global Constraints
- **Allowed Patterns:** {{joinComma .GlobalConstraints.AllowedPatterns}}
- **Forbidden Patterns:** {{joinComma .GlobalConstraints.ForbiddenPatterns}}
- **TDD Required:** {{.GlobalConstraints.TDDRequired}}
- **Max Task Duration:** {{.GlobalConstraints.MaxTaskDurationMinutes}} minutes
- **Commit Strategy:** {{.GlobalConstraints.CommitStrategy}}

## Quality Gates

| Stage | Commands | Criteria |
|-------|----------|----------|
{{range .QualityGates}}| {{.Stage}} | {{joinComma .Commands}} | {{joinComma .Criteria}} |
{{end}}

## Tasks
{{range .Tasks}}
### {{.ID}}: {{.Name}}

{{.Description}}

**Type:** {{.Type}} | **Estimate:** {{.EstimateMinutes}} min{{if .Dependencies}} | **Dependencies:** {{joinComma .Dependencies}}{{end}}

{{if .Files.Create}}**Create:** {{joinComma .Files.Create}}{{end}}
{{if .Files.Modify}}**Modify:** {{joinComma .Files.Modify}}{{end}}
{{if .Files.TouchOnly}}**Touch:** {{joinComma .Files.TouchOnly}}{{end}}

**Instructions:**
{{.Instructions}}

---

{{end}}
`

func ConvertMilestoneTasks(data []byte) (string, error) {
	var doc schema.MilestoneTasks
	if err := parseYAML(data, &doc); err != nil {
		return "", err
	}
	return execTemplate("milestone-tasks", mtTemplate, doc)
}
