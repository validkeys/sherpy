package markdown

import (
	"github.com/kydavis/sherpy/schema"
)

type brFRGroup struct {
	Category     string
	Requirements []schema.BRFunctionalRequirement
}

func groupFRsByCategory(frs []schema.BRFunctionalRequirement) []brFRGroup {
	var groups []brFRGroup
	var current *brFRGroup
	for _, fr := range frs {
		if current == nil || current.Category != fr.Category {
			groups = append(groups, brFRGroup{Category: fr.Category})
			current = &groups[len(groups)-1]
		}
		current.Requirements = append(current.Requirements, fr)
	}
	return groups
}

type brViewModel struct {
	Project                   string
	Version                   string
	Generated                 string
	Overview                  schema.BROverview
	Personas                  []schema.BRPersona
	UseCases                  []schema.BRUseCase
	FRByCategory              []brFRGroup
	NonFunctionalRequirements *schema.BRNonFunctionalRequirements
	SuccessCriteria           []schema.BRSuccessCriterion
	Constraints               *schema.BRConstraints
	Dependencies              *schema.BRDependencies
	Timeline                  *schema.BRTimeline
	Assumptions               []string
	Risks                     []schema.BRRisk
	FutureEnhancements        []string
	DocumentationReferences   map[string]string
	Notes                     string
}

const brTemplate = `# Business Requirements: {{.Project}}
Version: {{.Version}} | Generated: {{.Generated}}

## Problem Statement
{{.Overview.Problem}}

## Value Proposition
{{.Overview.ValueProposition}}

## Scope
**In Scope:**
{{bulletList .Overview.Scope.InScope}}{{if .Overview.Scope.OutOfScope}}
**Out of Scope:**
{{bulletList .Overview.Scope.OutOfScope}}{{end}}
## User Personas
{{range .Personas}}
### {{.Name}}
{{.Description}}

**Goals:**
{{bulletList .Goals}}
**Pain Points:**
{{bulletList .PainPoints}}
{{end}}
## Use Cases
{{range .UseCases}}
### {{.Name}}
**Actor:** {{.Actor}}

{{.Description}}

**Expected Outcome:** {{.Outcome}}
{{end}}
## Functional Requirements
{{range .FRByCategory}}
### {{.Category}} Requirements

| ID | Description | Priority | Rationale |
|----|-------------|----------|-----------|
{{range .Requirements}}| {{.ID}} | {{.Description}} | {{.Priority}} | {{.Rationale}} |
{{end}}
{{end}}{{if .NonFunctionalRequirements}}
## Non-Functional Requirements
{{with .NonFunctionalRequirements}}{{if .Performance}}
### Performance
{{bulletList .Performance}}{{end}}{{if .Security}}
### Security
{{bulletList .Security}}{{end}}{{if .Usability}}
### Usability
{{bulletList .Usability}}{{end}}{{if .Reliability}}
### Reliability
{{bulletList .Reliability}}{{end}}{{if .Maintainability}}
### Maintainability
{{bulletList .Maintainability}}{{end}}{{if .Observability}}
### Observability
{{bulletList .Observability}}{{end}}{{end}}{{end}}

## Success Criteria

| Criterion | Metric | Target |
|-----------|--------|--------|
{{range .SuccessCriteria}}| {{.Criterion}} | {{.Metric}} | {{.Target}} |
{{end}}
{{if .Constraints}}
## Constraints
{{with .Constraints}}{{if .Technical}}
### Technical
{{bulletList .Technical}}{{end}}{{if .Business}}
### Business
{{bulletList .Business}}{{end}}{{if .Timeline}}
### Timeline
{{bulletList .Timeline}}{{end}}{{if .Budget}}
### Budget
{{bulletList .Budget}}{{end}}{{if .Operational}}
### Operational
{{bulletList .Operational}}{{end}}{{end}}{{end}}{{if .Dependencies}}
## Dependencies
{{with .Dependencies}}{{if .Internal}}
### Internal
{{bulletList .Internal}}{{end}}{{if .External}}
### External
{{bulletList .External}}{{end}}{{end}}{{end}}{{if .Timeline}}
## Timeline

**Phase:** {{.Timeline.Phase}}
**Duration:** {{.Timeline.Duration}}

**Milestones:**
{{bulletList .Timeline.Milestones}}{{end}}
## Assumptions
{{bulletList .Assumptions}}
{{if .Risks}}
## Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
{{range .Risks}}| {{.Risk}} | {{.Probability}} | {{.Impact}} | {{.Mitigation}} |
{{end}}
{{end}}{{if .FutureEnhancements}}
## Future Enhancements
{{bulletList .FutureEnhancements}}{{end}}{{if .DocumentationReferences}}
## Documentation References
{{range $key, $path := .DocumentationReferences}}
- **{{$key}}**: {{$path}}
{{end}}
{{end}}{{if .Notes}}
## Notes
{{.Notes}}
{{end}}
`

func ConvertBusinessRequirements(data []byte) (string, error) {
	var doc schema.BusinessRequirements
	if err := parseYAML(data, &doc); err != nil {
		return "", err
	}

	vm := brViewModel{
		Project:                   doc.Project,
		Version:                   doc.Version,
		Generated:                 doc.Generated,
		Overview:                  doc.Overview,
		Personas:                  doc.Personas,
		UseCases:                  doc.UseCases,
		FRByCategory:              groupFRsByCategory(doc.FunctionalRequirements),
		NonFunctionalRequirements: doc.NonFunctionalRequirements,
		SuccessCriteria:           doc.SuccessCriteria,
		Constraints:               doc.Constraints,
		Dependencies:              doc.Dependencies,
		Timeline:                  doc.Timeline,
		Assumptions:               doc.Assumptions,
		Risks:                     doc.Risks,
		FutureEnhancements:        doc.FutureEnhancements,
		DocumentationReferences:   doc.DocumentationReferences,
		Notes:                     doc.Notes,
	}

	return execTemplate("business-requirements", brTemplate, vm)
}
