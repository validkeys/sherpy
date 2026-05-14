package markdown

import (
	"github.com/kydavis/sherpy/schema"
)

const trTemplate = `# Technical Requirements: {{.Project}}
Version: {{.Version}} | Generated: {{.Generated}}{{if .Overview}}

## Overview
{{.Overview}}{{end}}

## Architecture
**Pattern:** {{.Architecture.Pattern}}

{{.Architecture.Description}}

### Components

| Name | Responsibility |
|------|---------------|
{{range .Architecture.Components}}| {{.Name}} | {{.Responsibility}} |
{{end}}

## Technology Stack
- **Language:** {{.TechnologyStack.Language}}
- **Runtime:** {{.TechnologyStack.Runtime}}
- **Frameworks:** {{joinComma .TechnologyStack.Frameworks}}
- **Package Manager:** {{.TechnologyStack.PackageManager}}

## Project Structure
**Type:** {{.ProjectStructure.Type}} | **Layout:** {{.ProjectStructure.Layout}}

### Key Directories

| Path | Purpose |
|------|---------|
{{range .ProjectStructure.KeyDirectories}}| {{.Path}} | {{.Purpose}} |
{{end}}

## Data Model
- **Strategy:** {{.DataModel.Strategy}}{{if .DataModel.Database}}
- **Database:** {{.DataModel.Database}}{{end}}{{if .DataModel.SchemaApproach}}
- **Schema Approach:** {{.DataModel.SchemaApproach}}{{end}}

## API
- **Style:** {{.API.Style}}
- **Framework:** {{.API.Framework}}
- **Versioning:** {{.API.Versioning}}

## Security
- **Authentication:** {{.Security.Authentication.Method}}{{if .Security.Authentication.Implementation}} — {{.Security.Authentication.Implementation}}{{end}}
- **Authorization:** {{.Security.Authorization.Model}}{{if .Security.Authorization.Implementation}} — {{.Security.Authorization.Implementation}}{{end}}
- **Secrets Storage:** {{.Security.Secrets.Storage}}
- **Secrets Rotation:** {{.Security.Secrets.Rotation}}
- **Input Validation:** {{.Security.DataValidation.Input}}
- **Output Validation:** {{.Security.DataValidation.Output}}

## Testing
- **Strategy:** {{.Testing.Strategy}}

## Development / Code Quality
- **Linter:** {{.Development.CodeQuality.Linter}}
- **Formatter:** {{.Development.CodeQuality.Formatter}}
- **Type Checker:** {{.Development.CodeQuality.TypeChecker}}

## Operations / Deployment
- **Target:** {{.Operations.Deployment.Target}}

### Environments

| Name | Config |
|------|--------|
{{range .Operations.Deployment.Environments}}| {{.Name}} | {{.Config}} |
{{end}}

## Constraints

### Technical
{{bulletList .Constraints.Technical}}

### Operational
{{bulletList .Constraints.Operational}}
{{if .TradeOffs}}

## Trade-offs

| Decision | Rationale | Alternative | Consequence |
|----------|-----------|-------------|-------------|
{{range .TradeOffs}}| {{.Decision}} | {{.Rationale}} | {{.Alternative}} | {{.Consequence}} |
{{end}}
{{end}}{{if .OpenQuestions}}

## Open Questions
{{range .OpenQuestions}}
### {{.Question}}
**Options:**
{{bulletList .Options}}
**Impact:** {{.Impact}}
{{end}}
{{end}}
`

func ConvertTechnicalRequirements(data []byte) (string, error) {
	var doc schema.TechnicalRequirements
	if err := parseYAML(data, &doc); err != nil {
		return "", err
	}
	return execTemplate("technical-requirements", trTemplate, doc)
}
