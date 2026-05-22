package jira

import (
	"encoding/json"
	"fmt"
	"strings"
)

// ADFNode represents a node in the Atlassian Document Format tree.
type ADFNode struct {
	Type    string         `json:"type"`
	Content []ADFNode      `json:"content,omitempty"`
	Text    string         `json:"text,omitempty"`
	Marks   []ADFMark      `json:"marks,omitempty"`
	Attrs   map[string]any `json:"attrs,omitempty"`
}

// ADFMark represents text formatting in ADF.
type ADFMark struct {
	Type string `json:"type"`
}

// ADFDoc represents the root ADF document.
type ADFDoc struct {
	Version int       `json:"version"`
	Type    string    `json:"type"`
	Content []ADFNode `json:"content"`
}

// NewADFDoc creates a new ADF document.
func NewADFDoc() *ADFDoc {
	return &ADFDoc{
		Version: 1,
		Type:    "doc",
		Content: []ADFNode{},
	}
}

// AddParagraph adds a paragraph node with the given text.
func (doc *ADFDoc) AddParagraph(text string) {
	para := ADFNode{
		Type: "paragraph",
		Content: []ADFNode{
			{
				Type: "text",
				Text: text,
			},
		},
	}
	doc.Content = append(doc.Content, para)
}

// AddHeading adds a heading node with the given text and level.
func (doc *ADFDoc) AddHeading(text string, level int) {
	heading := ADFNode{
		Type: "heading",
		Attrs: map[string]any{
			"level": level,
		},
		Content: []ADFNode{
			{
				Type: "text",
				Text: text,
			},
		},
	}
	doc.Content = append(doc.Content, heading)
}

// AddBulletList adds a bullet list with the given items.
func (doc *ADFDoc) AddBulletList(items []string) {
	listItems := make([]ADFNode, 0, len(items))
	for _, item := range items {
		listItem := ADFNode{
			Type: "listItem",
			Content: []ADFNode{
				{
					Type: "paragraph",
					Content: []ADFNode{
						{
							Type: "text",
							Text: item,
						},
					},
				},
			},
		}
		listItems = append(listItems, listItem)
	}

	bulletList := ADFNode{
		Type:    "bulletList",
		Content: listItems,
	}
	doc.Content = append(doc.Content, bulletList)
}

// AddChecklist adds a task list (checklist) with the given items.
func (doc *ADFDoc) AddChecklist(items []string) {
	taskItems := make([]ADFNode, 0, len(items))
	for _, item := range items {
		taskItem := ADFNode{
			Type: "taskItem",
			Attrs: map[string]any{
				"state": "TODO",
			},
			Content: []ADFNode{
				{
					Type: "text",
					Text: item,
				},
			},
		}
		taskItems = append(taskItems, taskItem)
	}

	taskList := ADFNode{
		Type:    "taskList",
		Attrs:   map[string]any{"localId": "checklist"},
		Content: taskItems,
	}
	doc.Content = append(doc.Content, taskList)
}

// AddHorizontalRule adds a horizontal rule (divider).
func (doc *ADFDoc) AddHorizontalRule() {
	rule := ADFNode{
		Type: "rule",
	}
	doc.Content = append(doc.Content, rule)
}

// AddBoldParagraph adds a paragraph with a bold label followed by text.
// Example: "**Risk:** Low" becomes a paragraph with bold "Risk:" and normal "Low"
func (doc *ADFDoc) AddBoldParagraph(label, text string) {
	para := ADFNode{
		Type: "paragraph",
		Content: []ADFNode{
			{
				Type: "text",
				Text: label,
				Marks: []ADFMark{
					{Type: "strong"},
				},
			},
			{
				Type: "text",
				Text: " " + text,
			},
		},
	}
	doc.Content = append(doc.Content, para)
}

// ToJSON serializes the ADF document to JSON.
func (doc *ADFDoc) ToJSON() ([]byte, error) {
	return json.Marshal(doc)
}

// BuildEpicDescription converts a DeveloperSummary markdown content to ADF.
func BuildEpicDescription(summary *DeveloperSummary) ([]byte, error) {
	doc := NewADFDoc()
	lines := strings.Split(summary.Content, "\n")

	i := 0
	for i < len(lines) {
		line := lines[i]
		trimmed := strings.TrimSpace(line)

		// Skip empty lines
		if trimmed == "" {
			i++
			continue
		}

		// H1 heading (# )
		if text, found := strings.CutPrefix(line, "# "); found {
			doc.AddHeading(text, 1)
			i++
			continue
		}

		// H2 heading (## )
		if text, found := strings.CutPrefix(line, "## "); found {
			doc.AddHeading(text, 2)
			i++
			continue
		}

		// H3 heading (### )
		if text, found := strings.CutPrefix(line, "### "); found {
			doc.AddHeading(text, 3)
			i++
			continue
		}

		// Horizontal rule (--- or ***)
		if trimmed == "---" || trimmed == "***" {
			doc.AddHorizontalRule()
			i++
			continue
		}

		// Bullet list (collect consecutive items)
		if strings.HasPrefix(trimmed, "- ") && !strings.HasPrefix(trimmed, "- [ ]") && !strings.HasPrefix(trimmed, "- [x]") {
			items := []string{}
			for i < len(lines) {
				currentLine := strings.TrimSpace(lines[i])
				if strings.HasPrefix(currentLine, "- ") && !strings.HasPrefix(currentLine, "- [ ]") && !strings.HasPrefix(currentLine, "- [x]") {
					item := strings.TrimPrefix(currentLine, "- ")
					items = append(items, item)
					i++
				} else {
					break
				}
			}
			doc.AddBulletList(items)
			continue
		}

		// Checklist items (- [ ] or - [x])
		if strings.HasPrefix(trimmed, "- [ ]") || strings.HasPrefix(trimmed, "- [x]") {
			items := []string{}
			for i < len(lines) {
				currentLine := strings.TrimSpace(lines[i])
				if strings.HasPrefix(currentLine, "- [ ]") {
					item := strings.TrimPrefix(currentLine, "- [ ] ")
					items = append(items, item)
					i++
				} else if strings.HasPrefix(currentLine, "- [x]") {
					item := strings.TrimPrefix(currentLine, "- [x] ")
					items = append(items, item)
					i++
				} else {
					break
				}
			}
			doc.AddChecklist(items)
			continue
		}

		// Bold paragraph (**Label:** text)
		if strings.Contains(trimmed, "**") && strings.Contains(trimmed, ":**") {
			// Find the label
			parts := strings.SplitN(trimmed, ":**", 2)
			if len(parts) == 2 {
				label := strings.TrimPrefix(parts[0], "**") + ":"
				text := strings.TrimSpace(parts[1])
				doc.AddBoldParagraph(label, text)
				i++
				continue
			}
		}

		// Default: plain paragraph
		doc.AddParagraph(trimmed)
		i++
	}

	return doc.ToJSON()
}

// BuildMilestoneDescription creates an ADF description for a milestone (Story).
func BuildMilestoneDescription(m *Milestone) ([]byte, error) {
	doc := NewADFDoc()

	// Add description
	if m.Description != "" {
		doc.AddParagraph(m.Description)
	}

	// Add horizontal rule separator
	doc.AddHorizontalRule()

	// Add estimated duration
	if m.EstimatedDuration != "" {
		doc.AddBoldParagraph("Estimated Duration:", m.EstimatedDuration)
	}

	// Add success criteria as checklist
	if len(m.SuccessCriteria) > 0 {
		doc.AddHeading("Success Criteria", 3)
		doc.AddChecklist(m.SuccessCriteria)
	}

	// Add dependencies
	if len(m.Dependencies) > 0 {
		doc.AddHeading("Dependencies", 3)
		doc.AddBulletList(m.Dependencies)
	}

	return doc.ToJSON()
}

// BuildTaskDescription creates an ADF description for a task (Sub-task).
func BuildTaskDescription(t *Task) ([]byte, error) {
	doc := NewADFDoc()

	// Add description
	if t.Description != "" {
		doc.AddParagraph(t.Description)
	}

	// Add horizontal rule separator
	doc.AddHorizontalRule()

	// Add task metadata
	doc.AddBoldParagraph("Type:", t.Type)
	doc.AddBoldParagraph("Estimate:", fmt.Sprintf("%d minutes", t.EstimateMinutes))

	// Add dependencies
	if len(t.Dependencies) > 0 {
		doc.AddHeading("Dependencies", 3)
		doc.AddBulletList(t.Dependencies)
	}

	return doc.ToJSON()
}
