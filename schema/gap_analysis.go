package schema

import (
	"fmt"
	"regexp"
	"strings"
)

type GapAnalysis struct {
	Metadata   GAMetadata   `yaml:"metadata"`
	Categories []GACategory `yaml:"categories"`
}

type GAMetadata struct {
	SourceDocument string `yaml:"source_document"`
	GeneratedDate  string `yaml:"generated_date"`
	Status         string `yaml:"status"`
	TotalGaps      int    `yaml:"total_gaps"`
	Version        string `yaml:"version"`
}

type GACategory struct {
	Name string  `yaml:"name"`
	Gaps []GAGap `yaml:"gaps"`
}

type GAGap struct {
	ID          int      `yaml:"id"`
	Requirement string   `yaml:"requirement"`
	Question    string   `yaml:"question"`
	Answer      *string  `yaml:"answer"`
	Priority    string   `yaml:"priority"`
	Tags        []string `yaml:"tags,omitempty"`
}

var gaValidStatuses = map[string]bool{
	"awaiting_review": true,
	"in_progress":     true,
	"completed":       true,
}
var gaValidPriorities = map[string]bool{
	"critical": true,
	"high":     true,
	"medium":   true,
	"low":      true,
}
var gaValidCategories = map[string]bool{
	"problem_and_goals":             true,
	"personas_and_users":            true,
	"scope":                         true,
	"functional_requirements":       true,
	"non_functional_requirements":   true,
	"success_criteria":              true,
	"assumptions":                   true,
	"constraints":                   true,
	"dependencies_and_integrations": true,
	"risks":                         true,
}
var gaVersionPattern = regexp.MustCompile(`^\d+\.\d+$`)

func ValidateGapAnalysis(data []byte, strict bool) (*ValidationResult, error) {
	var doc GapAnalysis
	if err := unmarshalWithBetterErrors(data, &doc, "gap-analysis"); err != nil {
		return nil, err
	}

	result := &ValidationResult{}

	validateGAMetadata(doc, result)
	validateGACategories(doc, result)

	if strict {
		result.ApplyStrict()
		result.Warnings = nil
	}

	return result, nil
}

func validateGAMetadata(doc GapAnalysis, r *ValidationResult) {
	if strings.TrimSpace(doc.Metadata.SourceDocument) == "" {
		r.Errors = append(r.Errors, "metadata.source_document is required")
	}
	if strings.TrimSpace(doc.Metadata.GeneratedDate) == "" {
		r.Errors = append(r.Errors, "metadata.generated_date is required")
	}
	if !gaValidStatuses[doc.Metadata.Status] {
		r.Errors = append(r.Errors, fmt.Sprintf("metadata.status must be awaiting_review, in_progress, or completed (got %q)", doc.Metadata.Status))
	}
	if doc.Metadata.TotalGaps < 1 {
		r.Errors = append(r.Errors, "metadata.total_gaps must be >= 1")
	}
	if !gaVersionPattern.MatchString(doc.Metadata.Version) {
		r.Errors = append(r.Errors, fmt.Sprintf("metadata.version must be X.Y format (got %q)", doc.Metadata.Version))
	}
}

func validateGACategories(doc GapAnalysis, r *ValidationResult) {
	if len(doc.Categories) < 1 {
		r.Errors = append(r.Errors, "categories must have at least 1 entry")
		return
	}

	seenNames := map[string]bool{}
	actualTotal := 0
	nextGlobalID := 1
	for i, cat := range doc.Categories {
		name := strings.TrimSpace(cat.Name)
		if !gaValidCategories[name] {
			r.Errors = append(r.Errors, fmt.Sprintf("categories.%d.name %q is not a standard category", i, name))
		}
		if seenNames[name] {
			r.Errors = append(r.Errors, fmt.Sprintf("categories.%d.name %q is duplicated", i, name))
		}
		seenNames[name] = true

		if len(cat.Gaps) < 1 {
			r.Errors = append(r.Errors, fmt.Sprintf("categories.%d.gaps must have at least 1 entry", i))
			continue
		}

		for j, gap := range cat.Gaps {
			if gap.ID != nextGlobalID {
				r.Errors = append(r.Errors, fmt.Sprintf("categories.%d.gaps.%d.id must be %d (sequential, got %d)", i, j, nextGlobalID, gap.ID))
			}
			nextGlobalID++
			if strings.TrimSpace(gap.Question) == "" {
				r.Errors = append(r.Errors, fmt.Sprintf("categories.%d.gaps.%d.question is required", i, j))
			}
			if !gaValidPriorities[gap.Priority] {
				r.Errors = append(r.Errors, fmt.Sprintf("categories.%d.gaps.%d.priority must be critical, high, medium, or low (got %q)", i, j, gap.Priority))
			}
			if gap.Answer != nil && strings.TrimSpace(*gap.Answer) == "" {
				r.Errors = append(r.Errors, fmt.Sprintf("categories.%d.gaps.%d.answer must be null or non-empty", i, j))
			}
			actualTotal++
		}
	}

	if doc.Metadata.TotalGaps != actualTotal {
		r.Errors = append(r.Errors, fmt.Sprintf("metadata.total_gaps is %d but actual gap count is %d", doc.Metadata.TotalGaps, actualTotal))
	}
}
