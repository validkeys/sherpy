package schema

import (
	"fmt"
	"regexp"
	"strings"

	"gopkg.in/yaml.v3"
)

type Timeline struct {
	Version       string        `yaml:"version"`
	Project       string        `yaml:"project"`
	Generated     string        `yaml:"generated"`
	MilestonesFile string       `yaml:"milestones_file"`
	Summary       TLSummary     `yaml:"summary"`
	Timeline      []TLEntry     `yaml:"timeline"`
	Workback      TLWorkback    `yaml:"workback"`
}

type TLSummary struct {
	TotalDevelopmentDays int    `yaml:"total_development_days"`
	TotalDeliveryDays    int    `yaml:"total_delivery_days"`
	IsLargeProject       bool   `yaml:"is_large_project"`
	MilestoneCount       int    `yaml:"milestone_count"`
	QARounds             int    `yaml:"qa_rounds"`
	QADaysPerRound       int    `yaml:"qa_days_per_round"`
	ProductionDeployDate string `yaml:"production_deploy_date"`
	DeliveryModel        string `yaml:"delivery_model"`
}

type TLEntry struct {
	ID            string   `yaml:"id"`
	Name          string   `yaml:"name"`
	Type          string   `yaml:"type"`
	StartDay      int      `yaml:"start_day"`
	CompletionDay int      `yaml:"completion_day"`
	EstimatedDays int      `yaml:"estimated_days"`
	Dependencies  []string `yaml:"dependencies,omitempty"`
}

type TLWorkback struct {
	ProductionDeployDate string           `yaml:"production_deploy_date"`
	ProjectStartDate     string           `yaml:"project_start_date"`
	Schedule             []TLScheduleItem `yaml:"schedule"`
}

type TLScheduleItem struct {
	ID             string `yaml:"id"`
	Name           string `yaml:"name"`
	Type           string `yaml:"type"`
	StartDate      string `yaml:"start_date,omitempty"`
	CompletionDate string `yaml:"completion_date,omitempty"`
	Date           string `yaml:"date,omitempty"`
}

var tlDatePattern = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)
var tlValidDeliveryModels = map[string]bool{
	"multi-pr": true, "single-feature-branch": true,
	"value-first": true, "risk-first": true,
	"vertical-slice": true, "foundation-first": true,
}
var tlMilestoneIDPattern = regexp.MustCompile(`^m\d+$`)

func ValidateTimeline(data []byte, strict bool) (*ValidationResult, error) {
	var doc Timeline
	if err := yaml.Unmarshal(data, &doc); err != nil {
		return nil, fmt.Errorf("failed to parse YAML: %w", err)
	}

	result := &ValidationResult{}

	validateTLMetadata(doc, result)
	validateTLSummary(doc, result)
	validateTLTimeline(doc, result)
	validateTLWorkback(doc, result)

	if strict {
		result.Errors = append(result.Errors, result.Warnings...)
		result.Warnings = nil
	}

	return result, nil
}

func validateTLMetadata(doc Timeline, r *ValidationResult) {
	if strings.TrimSpace(doc.Project) == "" {
		r.Errors = append(r.Errors, "project is required")
	}
	if strings.TrimSpace(doc.Version) == "" {
		r.Errors = append(r.Errors, "version is required")
	}
	if strings.TrimSpace(doc.Generated) == "" {
		r.Errors = append(r.Errors, "generated is required")
	}
	if strings.TrimSpace(doc.MilestonesFile) == "" {
		r.Errors = append(r.Errors, "milestones_file is required")
	}
}

func validateTLSummary(doc Timeline, r *ValidationResult) {
	s := doc.Summary
	if s.TotalDevelopmentDays < 1 {
		r.Errors = append(r.Errors, "summary.total_development_days must be >= 1")
	}
	if s.TotalDeliveryDays < 1 {
		r.Errors = append(r.Errors, "summary.total_delivery_days must be >= 1")
	}
	if s.TotalDeliveryDays < s.TotalDevelopmentDays {
		r.Errors = append(r.Errors, "summary.total_delivery_days must be >= total_development_days")
	}
	if s.MilestoneCount < 1 {
		r.Errors = append(r.Errors, "summary.milestone_count must be >= 1")
	}
	if s.QARounds < 1 {
		r.Errors = append(r.Errors, "summary.qa_rounds must be >= 1")
	}
	if s.QADaysPerRound < 1 {
		r.Errors = append(r.Errors, "summary.qa_days_per_round must be >= 1")
	}
	if !tlDatePattern.MatchString(s.ProductionDeployDate) {
		r.Errors = append(r.Errors, fmt.Sprintf("summary.production_deploy_date must be YYYY-MM-DD format (got %q)", s.ProductionDeployDate))
	}
	if !tlValidDeliveryModels[s.DeliveryModel] {
		r.Errors = append(r.Errors, fmt.Sprintf("summary.delivery_model must be a valid strategy (got %q)", s.DeliveryModel))
	}

	milestoneCount := 0
	for _, e := range doc.Timeline {
		if e.Type == "milestone" {
			milestoneCount++
		}
	}
	if s.MilestoneCount != milestoneCount {
		r.Errors = append(r.Errors, fmt.Sprintf("summary.milestone_count is %d but found %d milestones in timeline", s.MilestoneCount, milestoneCount))
	}

	expectedLarge := s.TotalDevelopmentDays > 30 || milestoneCount > 5
	if s.IsLargeProject != expectedLarge {
		r.Warnings = append(r.Warnings, fmt.Sprintf("summary.is_large_project is %v but should be %v (dev_days=%d, milestones=%d)", s.IsLargeProject, expectedLarge, s.TotalDevelopmentDays, milestoneCount))
	}
}

func validateTLTimeline(doc Timeline, r *ValidationResult) {
	if len(doc.Timeline) < 1 {
		r.Errors = append(r.Errors, "timeline must have at least 1 entry")
		return
	}

	completionDays := map[string]int{}
	for i, e := range doc.Timeline {
		if strings.TrimSpace(e.ID) == "" {
			r.Errors = append(r.Errors, fmt.Sprintf("timeline.%d.id is required", i))
		}
		if strings.TrimSpace(e.Name) == "" {
			r.Errors = append(r.Errors, fmt.Sprintf("timeline.%d.name is required", i))
		}
		if e.Type != "milestone" && e.Type != "delivery" {
			r.Errors = append(r.Errors, fmt.Sprintf("timeline.%d.type must be milestone or delivery (got %q)", i, e.Type))
		}
		if e.StartDay < 0 {
			r.Errors = append(r.Errors, fmt.Sprintf("timeline.%d.start_day must be >= 0", i))
		}
		if e.CompletionDay < e.StartDay {
			r.Errors = append(r.Errors, fmt.Sprintf("timeline.%d.completion_day (%d) must be >= start_day (%d)", i, e.CompletionDay, e.StartDay))
		}
		if e.EstimatedDays < 0 {
			r.Errors = append(r.Errors, fmt.Sprintf("timeline.%d.estimated_days must be >= 0", i))
		}

		if e.Type == "milestone" {
			if !tlMilestoneIDPattern.MatchString(e.ID) {
				r.Errors = append(r.Errors, fmt.Sprintf("timeline.%d.id must match m[0-9]+ for milestones (got %q)", i, e.ID))
			}
			if e.CompletionDay != e.StartDay+e.EstimatedDays {
				r.Errors = append(r.Errors, fmt.Sprintf("timeline.%d.completion_day (%d) must equal start_day (%d) + estimated_days (%d)", i, e.CompletionDay, e.StartDay, e.EstimatedDays))
			}
		}

		completionDays[e.ID] = e.CompletionDay
	}
}

func validateTLWorkback(doc Timeline, r *ValidationResult) {
	w := doc.Workback
	if !tlDatePattern.MatchString(w.ProductionDeployDate) {
		r.Errors = append(r.Errors, "workback.production_deploy_date must be YYYY-MM-DD format")
	}
	if !tlDatePattern.MatchString(w.ProjectStartDate) {
		r.Errors = append(r.Errors, "workback.project_start_date must be YYYY-MM-DD format")
	}
	if w.ProductionDeployDate != doc.Summary.ProductionDeployDate {
		r.Errors = append(r.Errors, "workback.production_deploy_date must match summary.production_deploy_date")
	}
	if len(w.Schedule) < 1 {
		r.Errors = append(r.Errors, "workback.schedule must have at least 1 entry")
		return
	}

	timelineIDs := map[string]bool{}
	for _, e := range doc.Timeline {
		timelineIDs[e.ID] = true
	}

	for i, s := range w.Schedule {
		if strings.TrimSpace(s.ID) == "" {
			r.Errors = append(r.Errors, fmt.Sprintf("workback.schedule.%d.id is required", i))
		}
		if strings.TrimSpace(s.Name) == "" {
			r.Errors = append(r.Errors, fmt.Sprintf("workback.schedule.%d.name is required", i))
		}
		if s.Type != "milestone" && s.Type != "delivery" && s.Type != "deploy" {
			r.Errors = append(r.Errors, fmt.Sprintf("workback.schedule.%d.type must be milestone, delivery, or deploy (got %q)", i, s.Type))
		}

		if s.Type == "deploy" {
			if s.Date == "" {
				r.Errors = append(r.Errors, fmt.Sprintf("workback.schedule.%d.date is required for deploy type", i))
			}
		} else {
			if s.StartDate == "" {
				r.Errors = append(r.Errors, fmt.Sprintf("workback.schedule.%d.start_date is required", i))
			}
			if s.CompletionDate == "" {
				r.Errors = append(r.Errors, fmt.Sprintf("workback.schedule.%d.completion_date is required", i))
			}
		}

		if s.Type != "deploy" && !timelineIDs[s.ID] {
			r.Errors = append(r.Errors, fmt.Sprintf("workback.schedule.%d.id %q not found in timeline", i, s.ID))
		}
	}
}
