package jira

import (
	"encoding/json"
	"testing"
)

func TestADFDoc_Paragraph(t *testing.T) {
	doc := NewADFDoc()
	doc.AddParagraph("Hello world")

	jsonBytes, err := doc.ToJSON()
	if err != nil {
		t.Fatalf("ToJSON failed: %v", err)
	}

	// Parse JSON to verify structure
	var result map[string]any
	if err := json.Unmarshal(jsonBytes, &result); err != nil {
		t.Fatalf("failed to parse ADF JSON: %v", err)
	}

	// Verify root structure
	if result["version"] != float64(1) {
		t.Errorf("expected version 1, got %v", result["version"])
	}
	if result["type"] != "doc" {
		t.Errorf("expected type 'doc', got %v", result["type"])
	}

	// Verify content array
	content, ok := result["content"].([]any)
	if !ok {
		t.Fatal("expected content to be array")
	}
	if len(content) != 1 {
		t.Fatalf("expected 1 paragraph, got %d", len(content))
	}

	// Verify paragraph node
	para, ok := content[0].(map[string]any)
	if !ok {
		t.Fatal("expected paragraph to be object")
	}
	if para["type"] != "paragraph" {
		t.Errorf("expected type 'paragraph', got %v", para["type"])
	}
}

func TestADFDoc_Heading(t *testing.T) {
	doc := NewADFDoc()
	doc.AddHeading("Section Title", 2)

	jsonBytes, err := doc.ToJSON()
	if err != nil {
		t.Fatalf("ToJSON failed: %v", err)
	}

	var result map[string]any
	if err := json.Unmarshal(jsonBytes, &result); err != nil {
		t.Fatalf("failed to parse ADF JSON: %v", err)
	}

	content, ok := result["content"].([]any)
	if !ok || len(content) != 1 {
		t.Fatal("expected 1 heading in content")
	}

	heading, ok := content[0].(map[string]any)
	if !ok {
		t.Fatal("expected heading to be object")
	}

	if heading["type"] != "heading" {
		t.Errorf("expected type 'heading', got %v", heading["type"])
	}

	attrs, ok := heading["attrs"].(map[string]any)
	if !ok {
		t.Fatal("expected attrs object")
	}
	if attrs["level"] != float64(2) {
		t.Errorf("expected level 2, got %v", attrs["level"])
	}
}

func TestADFDoc_BulletList(t *testing.T) {
	doc := NewADFDoc()
	doc.AddBulletList([]string{"Item 1", "Item 2", "Item 3"})

	jsonBytes, err := doc.ToJSON()
	if err != nil {
		t.Fatalf("ToJSON failed: %v", err)
	}

	var result map[string]any
	if err := json.Unmarshal(jsonBytes, &result); err != nil {
		t.Fatalf("failed to parse ADF JSON: %v", err)
	}

	content, ok := result["content"].([]any)
	if !ok || len(content) != 1 {
		t.Fatal("expected 1 bulletList in content")
	}

	bulletList, ok := content[0].(map[string]any)
	if !ok {
		t.Fatal("expected bulletList to be object")
	}

	if bulletList["type"] != "bulletList" {
		t.Errorf("expected type 'bulletList', got %v", bulletList["type"])
	}

	listContent, ok := bulletList["content"].([]any)
	if !ok {
		t.Fatal("expected bulletList content array")
	}
	if len(listContent) != 3 {
		t.Errorf("expected 3 list items, got %d", len(listContent))
	}

	// Verify first item structure
	item, ok := listContent[0].(map[string]any)
	if !ok {
		t.Fatal("expected listItem to be object")
	}
	if item["type"] != "listItem" {
		t.Errorf("expected type 'listItem', got %v", item["type"])
	}
}

func TestADFDoc_Checklist(t *testing.T) {
	doc := NewADFDoc()
	doc.AddChecklist([]string{"Task 1", "Task 2"})

	jsonBytes, err := doc.ToJSON()
	if err != nil {
		t.Fatalf("ToJSON failed: %v", err)
	}

	var result map[string]any
	if err := json.Unmarshal(jsonBytes, &result); err != nil {
		t.Fatalf("failed to parse ADF JSON: %v", err)
	}

	content, ok := result["content"].([]any)
	if !ok || len(content) != 1 {
		t.Fatal("expected 1 taskList in content")
	}

	bulletList, ok := content[0].(map[string]any)
	if !ok {
		t.Fatal("expected bulletList to be object")
	}

	// AddChecklist uses bulletList for broader Jira compatibility
	if bulletList["type"] != "bulletList" {
		t.Errorf("expected type 'bulletList', got %v", bulletList["type"])
	}
}

func TestBuildEpicDescription(t *testing.T) {
	summary := &DeveloperSummary{
		Title:   "Test Project",
		Content: "# Test Project\n\nThis is a test.\n\n## Background\n\nSome background.\n",
	}

	jsonBytes, err := BuildEpicDescription(summary)
	if err != nil {
		t.Fatalf("BuildEpicDescription failed: %v", err)
	}

	// Verify it's valid JSON
	var result map[string]any
	if err := json.Unmarshal(jsonBytes, &result); err != nil {
		t.Fatalf("failed to parse ADF JSON: %v", err)
	}

	// Verify it has content
	content, ok := result["content"].([]any)
	if !ok {
		t.Fatal("expected content array")
	}
	if len(content) == 0 {
		t.Error("expected non-empty content")
	}
}

func TestBuildMilestoneDescription(t *testing.T) {
	milestone := &Milestone{
		ID:                "m0",
		Name:              "Foundation",
		Description:       "Set up the project foundation",
		EstimatedDuration: "1-2 days",
		SuccessCriteria:   []string{"Tests pass", "Build succeeds"},
		Dependencies:      []string{},
	}

	jsonBytes, err := BuildMilestoneDescription(milestone)
	if err != nil {
		t.Fatalf("BuildMilestoneDescription failed: %v", err)
	}

	// Verify it's valid JSON
	var result map[string]any
	if err := json.Unmarshal(jsonBytes, &result); err != nil {
		t.Fatalf("failed to parse ADF JSON: %v", err)
	}

	// Verify it has content
	content, ok := result["content"].([]any)
	if !ok {
		t.Fatal("expected content array")
	}
	if len(content) == 0 {
		t.Error("expected non-empty content")
	}
}

func TestBuildTaskDescription(t *testing.T) {
	task := &Task{
		ID:              "m0-001",
		Name:            "Setup",
		Description:     "Initialize the project",
		EstimateMinutes: 30,
		Type:            "code",
		Dependencies:    []string{},
	}

	jsonBytes, err := BuildTaskDescription(task)
	if err != nil {
		t.Fatalf("BuildTaskDescription failed: %v", err)
	}

	// Verify it's valid JSON
	var result map[string]any
	if err := json.Unmarshal(jsonBytes, &result); err != nil {
		t.Fatalf("failed to parse ADF JSON: %v", err)
	}

	// Verify it has content
	content, ok := result["content"].([]any)
	if !ok {
		t.Fatal("expected content array")
	}
	if len(content) == 0 {
		t.Error("expected non-empty content")
	}
}
