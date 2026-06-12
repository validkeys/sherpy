package schema

import (
	"fmt"
	"regexp"
	"strings"
)

type WireframeSpec struct {
	Metadata     WSMetadata     `yaml:"metadata"`
	Pages        []WSPage       `yaml:"pages,omitempty"`
	Wireframes   []WSWireframe  `yaml:"wireframes,omitempty"`
}

type WSMetadata struct {
	ProjectName      string   `yaml:"project_name"`
	GeneratedDate    string   `yaml:"generated_date"`
	SourceDocuments  []string `yaml:"source_documents"`
	HasUIChanges     bool     `yaml:"has_ui_changes"`
	DetectionSummary string   `yaml:"detection_summary,omitempty"`
}

type WSPage struct {
	ID                 string         `yaml:"id"`
	Name               string         `yaml:"name"`
	Route              string         `yaml:"route"`
	Description        string         `yaml:"description"`
	SourceRequirement  string         `yaml:"source_requirement,omitempty"`
	Components         []WSComponent  `yaml:"components,omitempty"`
	UserFlows          []WSUserFlow   `yaml:"user_flows,omitempty"`
}

type WSComponent struct {
	ID           string            `yaml:"id"`
	Name         string            `yaml:"name"`
	Type         string            `yaml:"type"`
	Description  string            `yaml:"description,omitempty"`
	States       []string          `yaml:"states,omitempty"`
	Interactions []WSInteraction   `yaml:"interactions,omitempty"`
}

type WSInteraction struct {
	Trigger     string `yaml:"trigger"`
	Action      string `yaml:"action"`
	Destination string `yaml:"destination,omitempty"`
}

type WSUserFlow struct {
	Name  string        `yaml:"name"`
	Steps []WSFlowStep  `yaml:"steps,omitempty"`
}

type WSFlowStep struct {
	From   string `yaml:"from"`
	To     string `yaml:"to"`
	Action string `yaml:"action"`
}

type WSWireframe struct {
	PageID     string `yaml:"page_id"`
	PenFile    string `yaml:"pen_file"`
	PreviewPNG string `yaml:"preview_png,omitempty"`
	Status     string `yaml:"status"`
	Notes      string `yaml:"notes,omitempty"`
}

var wsIDPattern = regexp.MustCompile(`^(PAGE|COMP)-(\d+)$`)

var wsValidComponentTypes = map[string]bool{
	"form":       true,
	"table":      true,
	"modal":      true,
	"layout":     true,
	"navigation": true,
	"chart":      true,
	"list":       true,
	"detail":     true,
	"other":      true,
}

var wsValidWireframeStatuses = map[string]bool{
	"generated":          true,
	"pending":            true,
	"external_reference": true,
}

var wsValidStates = map[string]bool{
	"empty":   true,
	"loading": true,
	"error":   true,
	"success": true,
}

func ValidateWireframeSpec(data []byte, strict bool) (*ValidationResult, error) {
	var doc WireframeSpec
	if err := unmarshalWithBetterErrors(data, &doc, "wireframe-spec"); err != nil {
		return nil, err
	}

	result := &ValidationResult{}

	validateWSMetadata(doc.Metadata, result)

	if doc.Metadata.HasUIChanges {
		validateWSPages(doc.Pages, result)
		validateWSWireframes(doc.Wireframes, doc.Pages, result)
	} else {
		if len(doc.Pages) > 0 {
			result.Errors = append(result.Errors, "pages must be empty when has_ui_changes is false")
		}
		if len(doc.Wireframes) > 0 {
			result.Errors = append(result.Errors, "wireframes must be empty when has_ui_changes is false")
		}
	}

	if strict {
		result.ApplyStrict()
		result.Warnings = nil
	}

	return result, nil
}

func validateWSMetadata(m WSMetadata, r *ValidationResult) {
	if strings.TrimSpace(m.ProjectName) == "" {
		r.Errors = append(r.Errors, "metadata.project_name is required")
	}
	if strings.TrimSpace(m.GeneratedDate) == "" {
		r.Errors = append(r.Errors, "metadata.generated_date is required")
	}
	if len(m.SourceDocuments) == 0 {
		r.Errors = append(r.Errors, "metadata.source_documents must have at least 1 entry")
	}
	if m.HasUIChanges && strings.TrimSpace(m.DetectionSummary) == "" {
		r.Errors = append(r.Errors, "metadata.detection_summary is required when has_ui_changes is true")
	}
}

func validateWSPages(pages []WSPage, r *ValidationResult) {
	if len(pages) == 0 {
		r.Errors = append(r.Errors, "pages must have at least 1 entry when has_ui_changes is true")
		return
	}

	nextPageNum := 1
	seenPageIDs := map[string]bool{}

	for i := range pages {
		p := &pages[i]

		if len(p.ID) > MaxIDLength {
			r.Errors = append(r.Errors, fmt.Sprintf("pages.%d.id exceeds maximum length of %d characters", i, MaxIDLength))
			continue
		}

		if !wsIDPattern.MatchString(p.ID) {
			r.Errors = append(r.Errors, fmt.Sprintf("pages.%d.id: invalid format %q (expected PAGE-NNN)", i, p.ID))
			continue
		}

		matches := wsIDPattern.FindStringSubmatch(p.ID)
		if matches[1] == "PAGE" {
			num := 0
			fmt.Sscanf(matches[2], "%d", &num)
			if num != nextPageNum {
				r.Errors = append(r.Errors, fmt.Sprintf("pages.%d.id: page IDs must be sequential (expected PAGE-%03d, got %s)", i, nextPageNum, p.ID))
			}
			nextPageNum++
		}

		if seenPageIDs[p.ID] {
			r.Errors = append(r.Errors, fmt.Sprintf("pages.%d.id %q is duplicated", i, p.ID))
		}
		seenPageIDs[p.ID] = true

		if strings.TrimSpace(p.Name) == "" {
			r.Errors = append(r.Errors, fmt.Sprintf("pages.%d.name is required", i))
		}
		if strings.TrimSpace(p.Route) == "" {
			r.Errors = append(r.Errors, fmt.Sprintf("pages.%d.route is required", i))
		}
		if strings.TrimSpace(p.Description) == "" {
			r.Errors = append(r.Errors, fmt.Sprintf("pages.%d.description is required", i))
		}

		validateWSComponents(p.ID, p.Components, r)

		for j := range p.UserFlows {
			if strings.TrimSpace(p.UserFlows[j].Name) == "" {
				r.Errors = append(r.Errors, fmt.Sprintf("pages.%d.user_flows.%d.name is required", i, j))
			}
		}
	}
}

func validateWSComponents(pageID string, components []WSComponent, r *ValidationResult) {
	nextCompNum := 1

	for i := range components {
		c := &components[i]

		if len(c.ID) > MaxIDLength {
			r.Errors = append(r.Errors, fmt.Sprintf("%s.components.%d.id exceeds maximum length of %d characters", pageID, i, MaxIDLength))
			continue
		}

		if !wsIDPattern.MatchString(c.ID) {
			r.Errors = append(r.Errors, fmt.Sprintf("%s.components.%d.id: invalid format %q (expected COMP-NNN)", pageID, i, c.ID))
			continue
		}

		matches := wsIDPattern.FindStringSubmatch(c.ID)
		if matches[1] == "COMP" {
			num := 0
			fmt.Sscanf(matches[2], "%d", &num)
			if num != nextCompNum {
				r.Errors = append(r.Errors, fmt.Sprintf("%s.components.%d.id: component IDs must be sequential (expected COMP-%03d, got %s)", pageID, i, nextCompNum, c.ID))
			}
			nextCompNum++
		}

		if strings.TrimSpace(c.Name) == "" {
			r.Errors = append(r.Errors, fmt.Sprintf("%s.components.%d.name is required", pageID, i))
		}
		if !wsValidComponentTypes[c.Type] {
			r.Errors = append(r.Errors, fmt.Sprintf("%s.components.%d.type must be one of form, table, modal, layout, navigation, chart, list, detail, other (got %q)", pageID, i, c.Type))
		}

		for _, s := range c.States {
			if !wsValidStates[s] {
				r.Errors = append(r.Errors, fmt.Sprintf("%s.components.%d: invalid state %q (expected empty, loading, error, or success)", pageID, i, s))
			}
		}

		for j := range c.Interactions {
			if strings.TrimSpace(c.Interactions[j].Trigger) == "" {
				r.Errors = append(r.Errors, fmt.Sprintf("%s.components.%d.interactions.%d.trigger is required", pageID, i, j))
			}
			if strings.TrimSpace(c.Interactions[j].Action) == "" {
				r.Errors = append(r.Errors, fmt.Sprintf("%s.components.%d.interactions.%d.action is required", pageID, i, j))
			}
		}
	}
}

func validateWSWireframes(wireframes []WSWireframe, pages []WSPage, r *ValidationResult) {
	if len(wireframes) == 0 {
		r.Errors = append(r.Errors, "wireframes must have at least 1 entry when has_ui_changes is true")
		return
	}

	pageIDs := map[string]bool{}
	for _, p := range pages {
		pageIDs[p.ID] = true
	}

	wiredPages := map[string]bool{}

	for i := range wireframes {
		wf := &wireframes[i]

		if !pageIDs[wf.PageID] {
			r.Errors = append(r.Errors, fmt.Sprintf("wireframes.%d.page_id %q does not match any page", i, wf.PageID))
		}
		wiredPages[wf.PageID] = true

		if strings.TrimSpace(wf.PenFile) == "" {
			r.Errors = append(r.Errors, fmt.Sprintf("wireframes.%d.pen_file is required", i))
		} else if wf.Status == "generated" && !strings.HasSuffix(wf.PenFile, ".pen") {
			r.Errors = append(r.Errors, fmt.Sprintf("wireframes.%d.pen_file must end in .pen when status is generated (got %q)", i, wf.PenFile))
		}

		if !wsValidWireframeStatuses[wf.Status] {
			r.Errors = append(r.Errors, fmt.Sprintf("wireframes.%d.status must be generated, pending, or external_reference (got %q)", i, wf.Status))
		}
	}

	for _, p := range pages {
		if !wiredPages[p.ID] {
			r.Warnings = append(r.Warnings, fmt.Sprintf("page %q has no wireframe entry", p.ID))
		}
	}
}
