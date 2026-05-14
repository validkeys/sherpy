package schema

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
)

type BusinessRequirements struct {
	Project                   string                       `yaml:"project"`
	Version                   string                       `yaml:"version"`
	Generated                 string                       `yaml:"generated"`
	Overview                  BROverview                   `yaml:"overview"`
	Personas                  []BRPersona                  `yaml:"personas"`
	UseCases                  []BRUseCase                  `yaml:"use_cases"`
	FunctionalRequirements    []BRFunctionalRequirement    `yaml:"functional_requirements"`
	NonFunctionalRequirements *BRNonFunctionalRequirements `yaml:"non_functional_requirements,omitempty"`
	SuccessCriteria           []BRSuccessCriterion         `yaml:"success_criteria"`
	Constraints               *BRConstraints               `yaml:"constraints,omitempty"`
	Dependencies              *BRDependencies              `yaml:"dependencies,omitempty"`
	Timeline                  *BRTimeline                  `yaml:"timeline,omitempty"`
	Assumptions               []string                     `yaml:"assumptions"`
	Risks                     []BRRisk                     `yaml:"risks,omitempty"`
	FutureEnhancements        []string                     `yaml:"future_enhancements,omitempty"`
	DocumentationReferences   map[string]string            `yaml:"documentation_references,omitempty"`
	Notes                     string                       `yaml:"notes,omitempty"`
}

type BROverview struct {
	Problem          string  `yaml:"problem"`
	ValueProposition string  `yaml:"value_proposition"`
	Scope            BRScope `yaml:"scope"`
}

type BRScope struct {
	InScope    []string `yaml:"in_scope"`
	OutOfScope []string `yaml:"out_of_scope,omitempty"`
}

type BRPersona struct {
	Name        string   `yaml:"name"`
	Description string   `yaml:"description"`
	Goals       []string `yaml:"goals"`
	PainPoints  []string `yaml:"pain_points"`
}

type BRUseCase struct {
	Name        string `yaml:"name"`
	Actor       string `yaml:"actor"`
	Description string `yaml:"description"`
	Outcome     string `yaml:"outcome"`
}

type BRFunctionalRequirement struct {
	ID          string `yaml:"id"`
	Category    string `yaml:"category"`
	Description string `yaml:"description"`
	Priority    string `yaml:"priority"`
	Rationale   string `yaml:"rationale"`
}

type BRNonFunctionalRequirements struct {
	Performance     []string `yaml:"performance,omitempty"`
	Security        []string `yaml:"security,omitempty"`
	Usability       []string `yaml:"usability,omitempty"`
	Reliability     []string `yaml:"reliability,omitempty"`
	Maintainability []string `yaml:"maintainability,omitempty"`
	Observability   []string `yaml:"observability,omitempty"`
}

type BRSuccessCriterion struct {
	Criterion string `yaml:"criterion"`
	Metric    string `yaml:"metric"`
	Target    string `yaml:"target"`
}

type BRConstraints struct {
	Technical   []string `yaml:"technical,omitempty"`
	Business    []string `yaml:"business,omitempty"`
	Timeline    []string `yaml:"timeline,omitempty"`
	Budget      []string `yaml:"budget,omitempty"`
	Operational []string `yaml:"operational,omitempty"`
}

type BRDependencies struct {
	Internal []string `yaml:"internal,omitempty"`
	External []string `yaml:"external,omitempty"`
}

type BRTimeline struct {
	Phase      string   `yaml:"phase"`
	Duration   string   `yaml:"duration"`
	Milestones []string `yaml:"milestones"`
}

type BRRisk struct {
	Risk        string `yaml:"risk"`
	Probability string `yaml:"probability"`
	Impact      string `yaml:"impact"`
	Mitigation  string `yaml:"mitigation"`
}

const (
	MinProblemStatementLength   = 50
	MinValuePropositionLength   = 30
	MinPersonaDescriptionLength = 20
	MinUseCaseDescriptionLength = 20
	MinRequirementDescLength    = 20
	MinRationaleLength          = 10
	MinUseCaseNameLength        = 5
	MinUseCaseOutcomeLength     = 10
	MinPersonaNameLength        = 2
	MaxPersonaNameLength        = 50
	MinCategoryLength           = 3
)

var frIDPattern = regexp.MustCompile(`^FR-(\d{1,4})$`)
var validPriorities = map[string]struct{}{"high": {}, "medium": {}, "low": {}}
var validProbabilityImpact = map[string]struct{}{"high": {}, "medium": {}, "low": {}}

func ValidateBusinessRequirements(data []byte, strict bool) (*ValidationResult, error) {
	var doc BusinessRequirements
	if err := unmarshalWithBetterErrors(data, &doc, "business-requirements"); err != nil {
		return nil, err
	}

	result := &ValidationResult{}
	personaNames := map[string]bool{"System": true}

	validateBRMetadata(doc, result)
	validateBROverview(doc, result)
	validateBRPersonas(doc, personaNames, result)
	validateBRUseCases(doc, personaNames, result)
	validateBRFunctionalRequirements(doc, result)
	validateBRSuccessCriteria(doc, result)
	validateBRTimeline(doc, result)
	validateBRAssumptions(doc, result)
	validateBRRisks(doc, result)

	if strict {
		result.ApplyStrict()
	}

	return result, nil
}

func validateBRMetadata(doc BusinessRequirements, r *ValidationResult) {
	validateRequiredFields(r, map[string]string{
		"project":   doc.Project,
		"version":   doc.Version,
		"generated": doc.Generated,
	})
}

func validateBROverview(doc BusinessRequirements, r *ValidationResult) {
	problem := strings.TrimSpace(doc.Overview.Problem)
	if len(problem) < MinProblemStatementLength {
		r.Errors = append(r.Errors, fmt.Sprintf("overview.problem must be at least %d characters (got %d)", MinProblemStatementLength, len(problem)))
	}

	valueProp := strings.TrimSpace(doc.Overview.ValueProposition)
	if len(valueProp) < MinValuePropositionLength {
		r.Errors = append(r.Errors, fmt.Sprintf("overview.value_proposition must be at least %d characters (got %d)", MinValuePropositionLength, len(valueProp)))
	}

	if len(doc.Overview.Scope.InScope) < 1 {
		r.Errors = append(r.Errors, "overview.scope.in_scope must have at least 1 item")
	}
}

func validateBRPersonas(doc BusinessRequirements, personaNames map[string]bool, r *ValidationResult) {
	if len(doc.Personas) < 1 {
		r.Errors = append(r.Errors, "personas must have at least 1 entry")
		return
	}
	for i, p := range doc.Personas {
		name := strings.TrimSpace(p.Name)
		if len(name) < MinPersonaNameLength || len(name) > MaxPersonaNameLength {
			r.Errors = append(r.Errors, fmt.Sprintf("personas.%d.name must be %d-%d characters (got %d)", i, MinPersonaNameLength, MaxPersonaNameLength, len(name)))
		}

		desc := strings.TrimSpace(p.Description)
		if len(desc) < MinPersonaDescriptionLength {
			r.Errors = append(r.Errors, fmt.Sprintf("personas.%d.description must be at least %d characters", i, MinPersonaDescriptionLength))
		}

		if len(p.Goals) < 1 {
			r.Errors = append(r.Errors, fmt.Sprintf("personas.%d.goals must have at least 1 item", i))
		}
		if len(p.PainPoints) < 1 {
			r.Errors = append(r.Errors, fmt.Sprintf("personas.%d.pain_points must have at least 1 item", i))
		}
		personaNames[name] = true
	}
}

func validateBRUseCases(doc BusinessRequirements, personaNames map[string]bool, r *ValidationResult) {
	if len(doc.UseCases) < 1 {
		r.Errors = append(r.Errors, "use_cases must have at least 1 entry")
		return
	}
	for i, uc := range doc.UseCases {
		actor := strings.TrimSpace(uc.Actor)
		if !personaNames[actor] {
			r.Errors = append(r.Errors, fmt.Sprintf("use_cases.%d.actor %q does not match any persona name", i, actor))
		}

		name := strings.TrimSpace(uc.Name)
		if len(name) < MinUseCaseNameLength {
			r.Errors = append(r.Errors, fmt.Sprintf("use_cases.%d.name must be at least %d characters", i, MinUseCaseNameLength))
		}

		desc := strings.TrimSpace(uc.Description)
		if len(desc) < MinUseCaseDescriptionLength {
			r.Errors = append(r.Errors, fmt.Sprintf("use_cases.%d.description must be at least %d characters", i, MinUseCaseDescriptionLength))
		}

		outcome := strings.TrimSpace(uc.Outcome)
		if len(outcome) < MinUseCaseOutcomeLength {
			r.Errors = append(r.Errors, fmt.Sprintf("use_cases.%d.outcome must be at least %d characters", i, MinUseCaseOutcomeLength))
		}
	}
}

func validateBRFunctionalRequirements(doc BusinessRequirements, r *ValidationResult) {
	if len(doc.FunctionalRequirements) < 1 {
		r.Errors = append(r.Errors, "functional_requirements must have at least 1 entry")
		return
	}

	seenIDs := map[int]bool{}
	for i, fr := range doc.FunctionalRequirements {
		// Check length before regex to prevent ReDoS
		if len(fr.ID) > MaxIDLength {
			r.Errors = append(r.Errors, fmt.Sprintf("functional_requirements.%d.id exceeds maximum length of %d characters", i, MaxIDLength))
			continue
		}

		matches := frIDPattern.FindStringSubmatch(fr.ID)
		if matches == nil {
			r.Errors = append(r.Errors, fmt.Sprintf("functional_requirements.%d.id must match pattern FR-N (got %q)", i, fr.ID))
			continue
		}
		num, _ := strconv.Atoi(matches[1])
		seenIDs[num] = true

		category := strings.TrimSpace(fr.Category)
		if len(category) < MinCategoryLength {
			r.Errors = append(r.Errors, fmt.Sprintf("functional_requirements.%d.category must be at least %d characters", i, MinCategoryLength))
		}

		desc := strings.TrimSpace(fr.Description)
		if len(desc) < MinRequirementDescLength {
			r.Errors = append(r.Errors, fmt.Sprintf("functional_requirements.%d.description must be at least %d characters", i, MinRequirementDescLength))
		}

		validateEnum(r, fr.Priority, fmt.Sprintf("functional_requirements.%d.priority", i), validPriorities)

		rationale := strings.TrimSpace(fr.Rationale)
		if len(rationale) < MinRationaleLength {
			r.Errors = append(r.Errors, fmt.Sprintf("functional_requirements.%d.rationale must be at least %d characters", i, MinRationaleLength))
		}
	}

	for i := 1; i <= len(seenIDs); i++ {
		if !seenIDs[i] {
			r.Errors = append(r.Errors, fmt.Sprintf("functional_requirements IDs are not sequential: missing FR-%d (expected FR-1 through FR-%d)", i, len(seenIDs)))
			break
		}
	}
}

func validateBRSuccessCriteria(doc BusinessRequirements, r *ValidationResult) {
	if len(doc.SuccessCriteria) < 1 {
		r.Errors = append(r.Errors, "success_criteria must have at least 1 entry")
		return
	}
	if len(doc.SuccessCriteria) < 3 {
		r.Warnings = append(r.Warnings, fmt.Sprintf("recommended at least 3 success_criteria, found %d", len(doc.SuccessCriteria)))
	}
}

func validateBRTimeline(doc BusinessRequirements, r *ValidationResult) {
	if doc.Timeline == nil {
		r.Errors = append(r.Errors, "timeline is required")
		return
	}
	if strings.TrimSpace(doc.Timeline.Phase) == "" {
		r.Errors = append(r.Errors, "timeline.phase is required")
	}
	if strings.TrimSpace(doc.Timeline.Duration) == "" {
		r.Errors = append(r.Errors, "timeline.duration is required")
	}
	if len(doc.Timeline.Milestones) < 1 {
		r.Errors = append(r.Errors, "timeline.milestones must have at least 1 item")
	}
}

func validateBRAssumptions(doc BusinessRequirements, r *ValidationResult) {
	if len(doc.Assumptions) < 1 {
		r.Errors = append(r.Errors, "assumptions must have at least 1 entry")
	}
	if len(doc.Assumptions) < 3 {
		r.Warnings = append(r.Warnings, fmt.Sprintf("recommended at least 3 assumptions, found %d", len(doc.Assumptions)))
	}
}

func validateBRRisks(doc BusinessRequirements, r *ValidationResult) {
	for i, risk := range doc.Risks {
		validateEnum(r, risk.Probability, fmt.Sprintf("risks.%d.probability", i), validProbabilityImpact)
		validateEnum(r, risk.Impact, fmt.Sprintf("risks.%d.impact", i), validProbabilityImpact)
	}
	if len(doc.Risks) > 0 && len(doc.Risks) < 3 {
		r.Warnings = append(r.Warnings, fmt.Sprintf("recommended at least 3 risks, found %d", len(doc.Risks)))
	}
}
