package schema

import (
	"fmt"
	"regexp"
	"strings"

	"gopkg.in/yaml.v3"
)

type MilestoneTasks struct {
	Milestone         string              `yaml:"milestone"`
	Name              string              `yaml:"name"`
	Generated         string              `yaml:"generated"`
	StyleAnchorRefs   []string            `yaml:"style_anchor_refs,omitempty"`
	GlobalConstraints MTGlobalConstraints `yaml:"global_constraints"`
	QualityGates      []MTQualityGate     `yaml:"quality_gates"`
	Tasks             []MTTask            `yaml:"tasks"`
}

type MTGlobalConstraints struct {
	AllowedPatterns        []string `yaml:"allowed_patterns"`
	ForbiddenPatterns      []string `yaml:"forbidden_patterns"`
	TDDRequired            bool     `yaml:"tdd_required"`
	MaxTaskDurationMinutes int      `yaml:"max_task_duration_minutes"`
	CommitStrategy         string   `yaml:"commit_strategy"`
}

type MTQualityGate struct {
	Stage    string   `yaml:"stage"`
	Commands []string `yaml:"commands,omitempty"`
	Criteria []string `yaml:"criteria,omitempty"`
}

type MTTask struct {
	ID              string   `yaml:"id"`
	Name            string   `yaml:"name"`
	Description     string   `yaml:"description"`
	EstimateMinutes int      `yaml:"estimate_minutes"`
	Type            string   `yaml:"type"`
	Dependencies    []string `yaml:"dependencies"`
	Files           MTFiles  `yaml:"files"`
	StyleAnchorRefs []string `yaml:"style_anchor_refs,omitempty"`
	Instructions    string   `yaml:"instructions"`
}

type MTFiles struct {
	Create    []string `yaml:"create,omitempty"`
	Modify    []string `yaml:"modify,omitempty"`
	TouchOnly []string `yaml:"touch_only,omitempty"`
}

var mtMilestonePattern = regexp.MustCompile(`^m\d+$`)
var mtTaskIDPattern = regexp.MustCompile(`^m\d+-\d{3}$`)
var mtValidTaskTypes = map[string]bool{
	"code": true, "test": true, "docs": true, "config": true,
}
var mtValidGateStages = map[string]bool{
	"pre-task": true, "pre-commit": true,
	"task-completion": true, "milestone-completion": true, "pre-push": true,
}

func ValidateMilestoneTasks(data []byte, strict bool) (*ValidationResult, error) {
	var doc MilestoneTasks
	if err := yaml.Unmarshal(data, &doc); err != nil {
		return nil, fmt.Errorf("failed to parse YAML: %w", err)
	}

	result := &ValidationResult{}

	validateMTMetadata(doc, result)
	validateMTGlobalConstraints(doc, result)
	validateMTQualityGates(doc, result)
	validateMTTasks(doc, result)

	if strict {
		result.ApplyStrict()
		result.Warnings = nil
	}

	return result, nil
}

func validateMTMetadata(doc MilestoneTasks, r *ValidationResult) {
	// Check length before regex to prevent ReDoS
	if len(doc.Milestone) > MaxIDLength {
		r.Errors = append(r.Errors, fmt.Sprintf("milestone exceeds maximum length of %d characters", MaxIDLength))
	} else if !mtMilestonePattern.MatchString(doc.Milestone) {
		r.Errors = append(r.Errors, fmt.Sprintf("milestone must match m[0-9]+ pattern (got %q)", doc.Milestone))
	}
	if len(strings.TrimSpace(doc.Name)) < 10 {
		r.Errors = append(r.Errors, "name must be at least 10 characters")
	}
	if strings.TrimSpace(doc.Generated) == "" {
		r.Errors = append(r.Errors, "generated is required")
	}
}

func validateMTGlobalConstraints(doc MilestoneTasks, r *ValidationResult) {
	gc := doc.GlobalConstraints
	if len(gc.AllowedPatterns) < 1 {
		r.Errors = append(r.Errors, "global_constraints.allowed_patterns must have at least 1 entry")
	}
	if len(gc.ForbiddenPatterns) < 1 {
		r.Errors = append(r.Errors, "global_constraints.forbidden_patterns must have at least 1 entry")
	}
	if gc.MaxTaskDurationMinutes < 1 {
		r.Errors = append(r.Errors, "global_constraints.max_task_duration_minutes must be >= 1")
	}
	if strings.TrimSpace(gc.CommitStrategy) == "" {
		r.Errors = append(r.Errors, "global_constraints.commit_strategy is required")
	}
}

func validateMTQualityGates(doc MilestoneTasks, r *ValidationResult) {
	if len(doc.QualityGates) < 1 {
		r.Errors = append(r.Errors, "quality_gates must have at least 1 entry")
		return
	}
	for i, g := range doc.QualityGates {
		if !mtValidGateStages[g.Stage] {
			r.Errors = append(r.Errors, fmt.Sprintf("quality_gates.%d.stage must be a valid stage (got %q)", i, g.Stage))
		}
		if len(g.Commands) < 1 && len(g.Criteria) < 1 {
			r.Errors = append(r.Errors, fmt.Sprintf("quality_gates.%d must have at least one command or criterion", i))
		}
	}
}

func validateMTTasks(doc MilestoneTasks, r *ValidationResult) {
	if len(doc.Tasks) < 1 {
		r.Errors = append(r.Errors, "tasks must have at least 1 entry")
		return
	}

	validTaskIDs := map[string]bool{}
	for i, t := range doc.Tasks {
		// Check length before regex to prevent ReDoS
		if len(t.ID) > MaxIDLength {
			r.Errors = append(r.Errors, fmt.Sprintf("tasks.%d.id exceeds maximum length of %d characters", i, MaxIDLength))
		} else if !mtTaskIDPattern.MatchString(t.ID) {
			r.Errors = append(r.Errors, fmt.Sprintf("tasks.%d.id must match mN-NNN pattern (got %q)", i, t.ID))
		}

		expectedPrefix := doc.Milestone + "-"
		if t.ID != "" && strings.HasPrefix(t.ID, expectedPrefix) {
			seq := i + 1
			expectedID := fmt.Sprintf("%s%03d", expectedPrefix, seq)
			if t.ID != expectedID {
				r.Errors = append(r.Errors, fmt.Sprintf("tasks.%d.id must be %q for sequential ordering (got %q)", i, expectedID, t.ID))
			}
		}

		validTaskIDs[t.ID] = true

		if len(strings.TrimSpace(t.Name)) < 10 {
			r.Errors = append(r.Errors, fmt.Sprintf("tasks.%d.name must be at least 10 characters", i))
		}
		if len(strings.TrimSpace(t.Description)) < 50 {
			r.Errors = append(r.Errors, fmt.Sprintf("tasks.%d.description must be at least 50 characters", i))
		}
		if t.EstimateMinutes < 1 {
			r.Errors = append(r.Errors, fmt.Sprintf("tasks.%d.estimate_minutes must be >= 1", i))
		} else if t.EstimateMinutes > doc.GlobalConstraints.MaxTaskDurationMinutes {
			r.Errors = append(r.Errors, fmt.Sprintf("tasks.%d.estimate_minutes (%d) exceeds max_task_duration_minutes (%d)", i, t.EstimateMinutes, doc.GlobalConstraints.MaxTaskDurationMinutes))
		}
		if !mtValidTaskTypes[t.Type] {
			r.Errors = append(r.Errors, fmt.Sprintf("tasks.%d.type must be code, test, docs, or config (got %q)", i, t.Type))
		}
		for _, dep := range t.Dependencies {
			if !validTaskIDs[dep] {
				r.Errors = append(r.Errors, fmt.Sprintf("tasks.%d.dependencies references %q which is not a previously defined task", i, dep))
			}
		}
		if len(t.Files.Create) < 1 && len(t.Files.Modify) < 1 && len(t.Files.TouchOnly) < 1 {
			r.Errors = append(r.Errors, fmt.Sprintf("tasks.%d.files must have at least one of create, modify, or touch_only", i))
		}
		if len(strings.TrimSpace(t.Instructions)) < 100 {
			r.Errors = append(r.Errors, fmt.Sprintf("tasks.%d.instructions must be at least 100 characters", i))
		}
	}

	detectMTCircularDependencies(doc, r)
}

func detectMTCircularDependencies(doc MilestoneTasks, r *ValidationResult) {
	adj := map[string][]string{}
	for _, t := range doc.Tasks {
		adj[t.ID] = append(adj[t.ID], t.Dependencies...)
	}

	hasCycle, cycle := detectCircularDependencies(adj)
	if hasCycle {
		r.Errors = append(r.Errors, fmt.Sprintf("circular dependency detected in tasks: %s", strings.Join(cycle, " -> ")))
	}
}
