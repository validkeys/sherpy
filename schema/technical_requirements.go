package schema

import (
	"fmt"
	"strings"

	"gopkg.in/yaml.v3"
)

type TechnicalRequirements struct {
	Project                   string                    `yaml:"project"`
	Version                   string                    `yaml:"version"`
	Generated                 string                    `yaml:"generated"`
	BusinessRequirementsRef   string                    `yaml:"business_requirements_ref"`
	Overview                  string                    `yaml:"overview,omitempty"`
	Architecture              TRArchitecture            `yaml:"architecture"`
	TechnologyStack           TRTechnologyStack         `yaml:"technology_stack"`
	ProjectStructure          TRProjectStructure        `yaml:"project_structure"`
	DataModel                 TRDataModel               `yaml:"data_model"`
	API                       TRAPI                     `yaml:"api"`
	Security                  TRSecurity                `yaml:"security"`
	Testing                   TRTesting                 `yaml:"testing"`
	Development               TRDevelopment             `yaml:"development"`
	Operations                TROperations              `yaml:"operations"`
	Constraints               TRConstraints             `yaml:"constraints"`
	TradeOffs                 []TRTradeOff              `yaml:"trade_offs"`
	OpenQuestions             []TROpenQuestion          `yaml:"open_questions"`
}

type TRArchitecture struct {
	Pattern      string           `yaml:"pattern"`
	Description  string           `yaml:"description"`
	Components   []TRComponent    `yaml:"components"`
}

type TRComponent struct {
	Name          string `yaml:"name"`
	Responsibility string `yaml:"responsibility"`
}

type TRTechnologyStack struct {
	Language       string `yaml:"language"`
	Runtime        string `yaml:"runtime"`
	Frameworks     []string `yaml:"frameworks"`
	PackageManager string `yaml:"package_manager"`
}

type TRProjectStructure struct {
	Type           string              `yaml:"type"`
	Layout         string              `yaml:"layout"`
	KeyDirectories []TRKeyDirectory    `yaml:"key_directories"`
}

type TRKeyDirectory struct {
	Path    string `yaml:"path"`
	Purpose string `yaml:"purpose"`
}

type TRDataModel struct {
	Strategy       string `yaml:"strategy"`
	Database       string `yaml:"database,omitempty"`
	SchemaApproach string `yaml:"schema_approach,omitempty"`
}

type TRAPI struct {
	Style       string `yaml:"style"`
	Framework   string `yaml:"framework"`
	Versioning  string `yaml:"versioning"`
}

type TRSecurity struct {
	Authentication TRAuthnMethod  `yaml:"authentication"`
	Authorization  TRAuthzModel   `yaml:"authorization"`
	Secrets        TRSecrets      `yaml:"secrets"`
	DataValidation TRDataValid    `yaml:"data_validation"`
}

type TRAuthnMethod struct {
	Method         string `yaml:"method"`
	Implementation string `yaml:"implementation,omitempty"`
}

type TRAuthzModel struct {
	Model          string `yaml:"model"`
	Implementation string `yaml:"implementation,omitempty"`
}

type TRSecrets struct {
	Storage  string `yaml:"storage"`
	Rotation string `yaml:"rotation"`
}

type TRDataValid struct {
	Input  string `yaml:"input"`
	Output string `yaml:"output"`
}

type TRTesting struct {
	Strategy string    `yaml:"strategy"`
}

type TRDevelopment struct {
	CodeQuality TRCodeQuality `yaml:"code_quality"`
}

type TRCodeQuality struct {
	Linter      string `yaml:"linter"`
	Formatter   string `yaml:"formatter"`
	TypeChecker string `yaml:"type_checker"`
}

type TROperations struct {
	Deployment TRDeployment `yaml:"deployment"`
}

type TRDeployment struct {
	Target       string `yaml:"target"`
	Environments []TREnvironment `yaml:"environments"`
}

type TREnvironment struct {
	Name   string `yaml:"name"`
	Config string `yaml:"config"`
}

type TRConstraints struct {
	Technical   []string `yaml:"technical"`
	Operational []string `yaml:"operational"`
}

type TRTradeOff struct {
	Decision     string `yaml:"decision"`
	Rationale    string `yaml:"rationale"`
	Alternative  string `yaml:"alternative"`
	Consequence  string `yaml:"consequence"`
}

type TROpenQuestion struct {
	Question      string   `yaml:"question"`
	Options       []string `yaml:"options"`
	Impact        string   `yaml:"impact"`
}

func ValidateTechnicalRequirements(data []byte, strict bool) (*ValidationResult, error) {
	var doc TechnicalRequirements
	if err := yaml.Unmarshal(data, &doc); err != nil {
		return nil, fmt.Errorf("failed to parse YAML: %w", err)
	}

	result := &ValidationResult{}

	validateTRMetadata(doc, result)
	validateTRArchitecture(doc, result)
	validateTRTechStack(doc, result)
	validateTRProjectStructure(doc, result)
	validateTRDataModel(doc, result)
	validateTRAPI(doc, result)
	validateTRSecurity(doc, result)
	validateTRTesting(doc, result)
	validateTRDevelopment(doc, result)
	validateTROperations(doc, result)
	validateTRConstraints(doc, result)
	validateTRTradeOffs(doc, result)
	validateTROpenQuestions(doc, result)

	if strict {
		result.Errors = append(result.Errors, result.Warnings...)
		result.Warnings = nil
	}

	return result, nil
}

func validateTRMetadata(doc TechnicalRequirements, r *ValidationResult) {
	if strings.TrimSpace(doc.Project) == "" {
		r.Errors = append(r.Errors, "project is required")
	}
	if strings.TrimSpace(doc.Version) == "" {
		r.Errors = append(r.Errors, "version is required")
	}
	if strings.TrimSpace(doc.Generated) == "" {
		r.Errors = append(r.Errors, "generated is required")
	}
	if strings.TrimSpace(doc.BusinessRequirementsRef) == "" {
		r.Errors = append(r.Errors, "business_requirements_ref is required")
	}
}

func validateTRArchitecture(doc TechnicalRequirements, r *ValidationResult) {
	if strings.TrimSpace(doc.Architecture.Pattern) == "" {
		r.Errors = append(r.Errors, "architecture.pattern is required")
	}
	if strings.TrimSpace(doc.Architecture.Description) == "" {
		r.Errors = append(r.Errors, "architecture.description is required")
	}
	if len(doc.Architecture.Components) < 1 {
		r.Errors = append(r.Errors, "architecture.components must have at least 1 entry")
		return
	}
	seenNames := map[string]bool{}
	for i, c := range doc.Architecture.Components {
		name := strings.TrimSpace(c.Name)
		if name == "" {
			r.Errors = append(r.Errors, fmt.Sprintf("architecture.components.%d.name is required", i))
		}
		if seenNames[name] && name != "" {
			r.Errors = append(r.Errors, fmt.Sprintf("architecture.components.%d.name %q is duplicated", i, name))
		}
		seenNames[name] = true
		if strings.TrimSpace(c.Responsibility) == "" {
			r.Errors = append(r.Errors, fmt.Sprintf("architecture.components.%d.responsibility is required", i))
		}
	}
}

func validateTRTechStack(doc TechnicalRequirements, r *ValidationResult) {
	if strings.TrimSpace(doc.TechnologyStack.Language) == "" {
		r.Errors = append(r.Errors, "technology_stack.language is required")
	}
	if strings.TrimSpace(doc.TechnologyStack.Runtime) == "" {
		r.Errors = append(r.Errors, "technology_stack.runtime is required")
	}
	if len(doc.TechnologyStack.Frameworks) < 1 {
		r.Errors = append(r.Errors, "technology_stack.frameworks must have at least 1 entry")
	}
	if strings.TrimSpace(doc.TechnologyStack.PackageManager) == "" {
		r.Errors = append(r.Errors, "technology_stack.package_manager is required")
	}
}

func validateTRProjectStructure(doc TechnicalRequirements, r *ValidationResult) {
	validTypes := map[string]bool{"monorepo": true, "multi-repo": true, "single-repo": true}
	if !validTypes[doc.ProjectStructure.Type] {
		r.Errors = append(r.Errors, fmt.Sprintf("project_structure.type must be monorepo, multi-repo, or single-repo (got %q)", doc.ProjectStructure.Type))
	}
	if strings.TrimSpace(doc.ProjectStructure.Layout) == "" {
		r.Errors = append(r.Errors, "project_structure.layout is required")
	}
	if len(doc.ProjectStructure.KeyDirectories) < 1 {
		r.Errors = append(r.Errors, "project_structure.key_directories must have at least 1 entry")
	}
}

func validateTRDataModel(doc TechnicalRequirements, r *ValidationResult) {
	if strings.TrimSpace(doc.DataModel.Strategy) == "" {
		r.Errors = append(r.Errors, "data_model.strategy is required")
	}
}

func validateTRAPI(doc TechnicalRequirements, r *ValidationResult) {
	if strings.TrimSpace(doc.API.Style) == "" {
		r.Errors = append(r.Errors, "api.style is required")
	}
	if strings.TrimSpace(doc.API.Framework) == "" {
		r.Errors = append(r.Errors, "api.framework is required")
	}
}

func validateTRSecurity(doc TechnicalRequirements, r *ValidationResult) {
	if strings.TrimSpace(doc.Security.Authentication.Method) == "" {
		r.Errors = append(r.Errors, "security.authentication.method is required")
	}
	if strings.TrimSpace(doc.Security.Authorization.Model) == "" {
		r.Errors = append(r.Errors, "security.authorization.model is required")
	}
	if strings.TrimSpace(doc.Security.Secrets.Storage) == "" {
		r.Errors = append(r.Errors, "secrets.storage is required")
	}
}

func validateTRTesting(doc TechnicalRequirements, r *ValidationResult) {
	if strings.TrimSpace(doc.Testing.Strategy) == "" {
		r.Errors = append(r.Errors, "testing.strategy is required")
	}
}

func validateTRDevelopment(doc TechnicalRequirements, r *ValidationResult) {
	if strings.TrimSpace(doc.Development.CodeQuality.Linter) == "" {
		r.Errors = append(r.Errors, "development.code_quality.linter is required")
	}
	if strings.TrimSpace(doc.Development.CodeQuality.Formatter) == "" {
		r.Errors = append(r.Errors, "development.code_quality.formatter is required")
	}
}

func validateTROperations(doc TechnicalRequirements, r *ValidationResult) {
	if strings.TrimSpace(doc.Operations.Deployment.Target) == "" {
		r.Errors = append(r.Errors, "operations.deployment.target is required")
	}
	if len(doc.Operations.Deployment.Environments) < 1 {
		r.Errors = append(r.Errors, "operations.deployment.environments must have at least 1 entry")
	}
}

func validateTRConstraints(doc TechnicalRequirements, r *ValidationResult) {
	if len(doc.Constraints.Technical) < 1 {
		r.Errors = append(r.Errors, "constraints.technical must have at least 1 entry")
	}
	if len(doc.Constraints.Operational) < 1 {
		r.Errors = append(r.Errors, "constraints.operational must have at least 1 entry")
	}
}

func validateTRTradeOffs(doc TechnicalRequirements, r *ValidationResult) {
	if len(doc.TradeOffs) < 1 {
		r.Warnings = append(r.Warnings, "trade_offs should have at least 1 entry")
		return
	}
	for i, t := range doc.TradeOffs {
		if strings.TrimSpace(t.Decision) == "" {
			r.Errors = append(r.Errors, fmt.Sprintf("trade_offs.%d.decision is required", i))
		}
		if strings.TrimSpace(t.Rationale) == "" {
			r.Errors = append(r.Errors, fmt.Sprintf("trade_offs.%d.rationale is required", i))
		}
	}
}

func validateTROpenQuestions(doc TechnicalRequirements, r *ValidationResult) {
	for i, q := range doc.OpenQuestions {
		if strings.TrimSpace(q.Question) == "" {
			r.Errors = append(r.Errors, fmt.Sprintf("open_questions.%d.question is required", i))
		}
		if len(q.Options) < 1 {
			r.Errors = append(r.Errors, fmt.Sprintf("open_questions.%d.options must have at least 1 entry", i))
		}
	}
}
