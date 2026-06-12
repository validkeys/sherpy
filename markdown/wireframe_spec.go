package markdown

import (
	"github.com/kydavis/sherpy/schema"
)

const wsTemplate = `# Wireframe Specification

**Project:** {{.Metadata.ProjectName}}
**Generated:** {{.Metadata.GeneratedDate}}
**Has UI Changes:** {{.Metadata.HasUIChanges}}
{{if .Metadata.DetectionSummary}}
**Detection Summary:** {{.Metadata.DetectionSummary}}
{{end}}
**Source Documents:** {{joinComma .Metadata.SourceDocuments}}

---
{{if not .Metadata.HasUIChanges}}

No UI changes detected. This project does not require wireframes.
{{else}}
{{range $i, $page := .Pages}}
## {{$page.ID}}: {{$page.Name}}

**Route:** ` + "`{{$page.Route}}`" + `
**Description:** {{$page.Description}}
{{if $page.SourceRequirement}}
**Source Requirement:** {{$page.SourceRequirement}}
{{end}}
{{if $page.Components}}

### Components

| ID | Name | Type | States | Description |
|----|------|------|--------|-------------|
{{range $page.Components}}| {{.ID}} | {{.Name}} | {{.Type}} | {{joinComma .States}} | {{.Description}} |
{{end}}
{{end}}
{{range $page.Components}}{{if .Interactions}}

#### {{.ID}} {{.Name}} — Interactions

| Trigger | Action | Destination |
|---------|--------|-------------|
{{range .Interactions}}| {{.Trigger}} | {{.Action}} | {{.Destination}} |
{{end}}
{{end}}{{end}}
{{if $page.UserFlows}}

### User Flows

{{range $page.UserFlows}}
#### {{$j := .Name}}{{$j}}

| Step | From | To | Action |
|------|------|----|--------|
{{range $k, $step := .Steps}}| {{$k}} | {{.From}} | {{.To}} | {{.Action}} |
{{end}}
{{end}}
{{end}}

---
{{end}}

## Wireframe Files

| Page | Pen File | Preview | Status |
|------|----------|---------|--------|
{{range .Wireframes}}| {{.PageID}} | {{.PenFile}} | {{.PreviewPNG}} | {{.Status}} |
{{end}}
{{end}}
`

func ConvertWireframeSpec(data []byte) (string, error) {
	var doc schema.WireframeSpec
	if err := parseYAML(data, &doc); err != nil {
		return "", err
	}
	return execTemplate("wireframe-spec", wsTemplate, doc)
}
