package markdown

import (
	"github.com/kydavis/sherpy/schema"
)

const tlTemplate = `# Timeline: {{.Project}}
Version: {{.Version}} | Generated: {{.Generated}}

## Summary
- **Development Days:** {{.Summary.TotalDevelopmentDays}}
- **Delivery Days:** {{.Summary.TotalDeliveryDays}}
- **Large Project:** {{.Summary.IsLargeProject}}
- **Milestones:** {{.Summary.MilestoneCount}}
- **QA Rounds:** {{.Summary.QARounds}} x {{.Summary.QADaysPerRound}} days
- **Deploy Date:** {{.Summary.ProductionDeployDate}}
- **Delivery Model:** {{.Summary.DeliveryModel}}

## Development Milestones

| ID | Name | Start | Completion | Days |
|----|------|-------|------------|------|
{{range .Timeline}}{{if eq .Type "milestone"}}| {{.ID}} | {{.Name}} | {{.StartDay}} | {{.CompletionDay}} | {{.EstimatedDays}} |
{{end}}{{end}}
## Post-Development Phases

| ID | Name | Start | Completion | Days |
|----|------|-------|------------|------|
{{range .Timeline}}{{if eq .Type "delivery"}}| {{.ID}} | {{.Name}} | {{.StartDay}} | {{.CompletionDay}} | {{.EstimatedDays}} |
{{end}}{{end}}
## Workback Schedule

**Project Start:** {{.Workback.ProjectStartDate}}
**Production Deploy:** {{.Workback.ProductionDeployDate}}

| ID | Name | Type | Start Date | Completion Date |
|----|------|------|------------|-----------------|
{{range .Workback.Schedule}}{{if eq .Type "deploy"}}| {{.ID}} | {{.Name}} | {{.Type}} | — | {{.Date}} |
{{else}}| {{.ID}} | {{.Name}} | {{.Type}} | {{.StartDate}} | {{.CompletionDate}} |
{{end}}{{end}}
`

func ConvertTimeline(data []byte) (string, error) {
	var doc schema.Timeline
	if err := parseYAML(data, &doc); err != nil {
		return "", err
	}
	return execTemplate("timeline", tlTemplate, doc)
}
