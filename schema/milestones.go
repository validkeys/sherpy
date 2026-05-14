package schema

import (
	"fmt"
	"regexp"
	"strings"

	"gopkg.in/yaml.v3"
)

type Milestones struct {
	Version               string        `yaml:"version"`
	Project               string        `yaml:"project"`
	Generated             string        `yaml:"generated"`
	BusinessRequirements  string        `yaml:"business_requirements"`
	TechnicalRequirements string        `yaml:"technical_requirements"`
	Meta                  MSMeta        `yaml:"meta"`
	Milestones            []MSMilestone `yaml:"milestones"`
}

type MSMeta struct {
	OrderingStrategy  string `yaml:"ordering_strategy"`
	OrderingRationale string `yaml:"ordering_rationale"`
}

type MSMilestone struct {
	ID                string   `yaml:"id"`
	Name              string   `yaml:"name"`
	Description       string   `yaml:"description"`
	Dependencies      []string `yaml:"dependencies"`
	EstimatedDuration string   `yaml:"estimated_duration"`
	TasksFile         string   `yaml:"tasks_file"`
	SuccessCriteria   []string `yaml:"success_criteria"`
}

var msIDPattern = regexp.MustCompile(`^m\d+$`)
var msValidStrategies = map[string]bool{
	"multi-pr": true, "single-feature-branch": true,
	"value-first": true, "risk-first": true,
	"vertical-slice": true, "foundation-first": true,
}

func ValidateMilestones(data []byte, strict bool) (*ValidationResult, error) {
	var doc Milestones
	if err := yaml.Unmarshal(data, &doc); err != nil {
		return nil, fmt.Errorf("failed to parse YAML: %w", err)
	}

	result := &ValidationResult{}

	validateMSMetadata(doc, result)
	validateMSMeta(doc, result)
	validateMSMilestones(doc, result)

	if strict {
		result.ApplyStrict()
		result.Warnings = nil
	}

	return result, nil
}

func validateMSMetadata(doc Milestones, r *ValidationResult) {
	if strings.TrimSpace(doc.Project) == "" {
		r.Errors = append(r.Errors, "project is required")
	}
	if strings.TrimSpace(doc.Version) == "" {
		r.Errors = append(r.Errors, "version is required")
	}
	if strings.TrimSpace(doc.Generated) == "" {
		r.Errors = append(r.Errors, "generated is required")
	}
	if strings.TrimSpace(doc.BusinessRequirements) == "" {
		r.Errors = append(r.Errors, "business_requirements is required")
	}
	if strings.TrimSpace(doc.TechnicalRequirements) == "" {
		r.Errors = append(r.Errors, "technical_requirements is required")
	}
}

func validateMSMeta(doc Milestones, r *ValidationResult) {
	if !msValidStrategies[doc.Meta.OrderingStrategy] {
		r.Errors = append(r.Errors, fmt.Sprintf("meta.ordering_strategy must be a valid strategy (got %q)", doc.Meta.OrderingStrategy))
	}
	rationale := strings.TrimSpace(doc.Meta.OrderingRationale)
	if len(rationale) < 20 {
		r.Errors = append(r.Errors, fmt.Sprintf("meta.ordering_rationale must be at least 20 characters (got %d)", len(rationale)))
	}
}

func validateMSMilestones(doc Milestones, r *ValidationResult) {
	if len(doc.Milestones) < 1 {
		r.Errors = append(r.Errors, "milestones must have at least 1 entry")
		return
	}

	validIDs := map[string]bool{}
	for i, m := range doc.Milestones {
		// Check length before regex to prevent ReDoS
		if len(m.ID) > MaxIDLength {
			r.Errors = append(r.Errors, fmt.Sprintf("milestones.%d.id exceeds maximum length of %d characters", i, MaxIDLength))
		} else if !msIDPattern.MatchString(m.ID) {
			r.Errors = append(r.Errors, fmt.Sprintf("milestones.%d.id must match m[0-9]+ pattern (got %q)", i, m.ID))
		}

		expectedID := fmt.Sprintf("m%d", i)
		if m.ID != expectedID {
			r.Errors = append(r.Errors, fmt.Sprintf("milestones.%d.id must be %q for sequential ordering (got %q)", i, expectedID, m.ID))
		}

		validIDs[m.ID] = true

		if len(strings.TrimSpace(m.Name)) < 10 {
			r.Errors = append(r.Errors, fmt.Sprintf("milestones.%d.name must be at least 10 characters", i))
		}
		if len(strings.TrimSpace(m.Description)) < 50 {
			r.Errors = append(r.Errors, fmt.Sprintf("milestones.%d.description must be at least 50 characters", i))
		}
		if m.Dependencies == nil {
			r.Errors = append(r.Errors, fmt.Sprintf("milestones.%d.dependencies is required", i))
		}
		for _, dep := range m.Dependencies {
			if !validIDs[dep] {
				r.Errors = append(r.Errors, fmt.Sprintf("milestones.%d.dependencies references %q which is not a previously defined milestone", i, dep))
			}
		}
		if strings.TrimSpace(m.EstimatedDuration) == "" {
			r.Errors = append(r.Errors, fmt.Sprintf("milestones.%d.estimated_duration is required", i))
		}
		if strings.TrimSpace(m.TasksFile) == "" {
			r.Errors = append(r.Errors, fmt.Sprintf("milestones.%d.tasks_file is required", i))
		}
		if len(m.SuccessCriteria) < 1 {
			r.Errors = append(r.Errors, fmt.Sprintf("milestones.%d.success_criteria must have at least 1 entry", i))
		}
	}

	detectMSCircularDependencies(doc, r)
}

func detectMSCircularDependencies(doc Milestones, r *ValidationResult) {
	adj := map[string][]string{}
	for _, m := range doc.Milestones {
		adj[m.ID] = append(adj[m.ID], m.Dependencies...)
	}

	hasCycle, cycle := detectCircularDependencies(adj)
	if hasCycle {
		r.Errors = append(r.Errors, fmt.Sprintf("circular dependency detected in milestones: %s", strings.Join(cycle, " -> ")))
	}
}
