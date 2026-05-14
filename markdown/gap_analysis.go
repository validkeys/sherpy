package markdown

import (
	"github.com/kydavis/sherpy/schema"
)

const gaTemplate = `# Gap Analysis Worksheet

**Document:** {{.Metadata.SourceDocument}}
**Generated:** {{.Metadata.GeneratedDate}}
**Status:** {{.Metadata.Status}}
**Total Gaps:** {{.Metadata.TotalGaps}}

---
{{range .Categories}}
## {{.Name}}
{{range .Gaps}}

### Gap {{.ID}} [{{.Priority}}]

**Requirement:** "{{.Requirement}}"
**Question:** {{.Question}}
**Answer:** {{if .Answer}}{{.}}{{else}}_No answer yet_{{end}}{{if .Tags}}
**Tags:** {{joinComma .Tags}}{{end}}

---
{{end}}
{{end}}
`

func ConvertGapAnalysis(data []byte) (string, error) {
	var doc schema.GapAnalysis
	if err := parseYAML(data, &doc); err != nil {
		return "", err
	}
	return execTemplate("gap-analysis", gaTemplate, doc)
}
