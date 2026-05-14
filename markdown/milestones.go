package markdown

import (
	"github.com/kydavis/sherpy/schema"
)

const msTemplate = `# Milestones: {{.Project}}
Version: {{.Version}} | Generated: {{.Generated}}

## Strategy
**Ordering:** {{.Meta.OrderingStrategy}}

{{.Meta.OrderingRationale}}

## Milestones
{{range .Milestones}}
### {{.ID}}: {{.Name}}

{{.Description}}

**Dependencies:** {{joinComma .Dependencies}} | **Estimated Duration:** {{.EstimatedDuration}} | **Tasks File:** {{.TasksFile}}

**Success Criteria:**
{{bulletList .SuccessCriteria}}
{{end}}
`

func ConvertMilestones(data []byte) (string, error) {
	var doc schema.Milestones
	if err := parseYAML(data, &doc); err != nil {
		return "", err
	}
	return execTemplate("milestones", msTemplate, doc)
}
