package schema

import (
	"os"
	"path/filepath"
	"testing"
)

func loadWSFixture(t *testing.T, name string) []byte {
	t.Helper()
	path := filepath.Join("..", "testdata", "wireframe-spec", name)
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("failed to read fixture %s: %v", name, err)
	}
	return data
}

func TestValidateWireframeSpec_Valid(t *testing.T) {
	data := loadWSFixture(t, "valid.yaml")
	result, err := ValidateWireframeSpec(data, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !result.Valid() {
		t.Errorf("expected valid result, got errors: %v", result.Errors)
	}
}

func TestValidateWireframeSpec_NoUIChanges(t *testing.T) {
	data := loadWSFixture(t, "no-ui-changes.yaml")
	result, err := ValidateWireframeSpec(data, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !result.Valid() {
		t.Errorf("expected valid result for no-ui-changes, got errors: %v", result.Errors)
	}
}

func TestValidateWireframeSpec_MissingPages(t *testing.T) {
	data := loadWSFixture(t, "invalid-missing-pages.yaml")
	result, err := ValidateWireframeSpec(data, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Valid() {
		t.Error("expected validation errors for missing pages with has_ui_changes=true")
	}
	found := false
	for _, e := range result.Errors {
		if contains(e, "pages must have at least 1 entry") {
			found = true
		}
	}
	if !found {
		t.Errorf("expected 'pages must have at least 1 entry' error, got: %v", result.Errors)
	}
}

func TestValidateWireframeSpec_BadIDs(t *testing.T) {
	data := loadWSFixture(t, "invalid-bad-ids.yaml")
	result, err := ValidateWireframeSpec(data, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Valid() {
		t.Error("expected validation errors for non-sequential IDs")
	}
	foundPageErr := false
	for _, e := range result.Errors {
		if contains(e, "sequential") {
			foundPageErr = true
		}
	}
	if !foundPageErr {
		t.Errorf("expected sequential ID error, got: %v", result.Errors)
	}
}

func TestValidateWireframeSpec_EmptyMetadata(t *testing.T) {
	data := []byte(`metadata:
  project_name: ""
  generated_date: ""
  source_documents: []
  has_ui_changes: false
`)
	result, err := ValidateWireframeSpec(data, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Valid() {
		t.Error("expected validation errors for empty metadata")
	}
}

func TestValidateWireframeSpec_HasUIButPagesWhenFalse(t *testing.T) {
	data := []byte(`metadata:
  project_name: "Test"
  generated_date: "2025-01-01"
  source_documents:
    - "req.yaml"
  has_ui_changes: false
pages:
  - id: PAGE-001
    name: "Dashboard"
    route: "/dashboard"
    description: "Main page"
`)
	result, err := ValidateWireframeSpec(data, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Valid() {
		t.Error("expected error: pages must be empty when has_ui_changes is false")
	}
	found := false
	for _, e := range result.Errors {
		if contains(e, "pages must be empty when has_ui_changes is false") {
			found = true
		}
	}
	if !found {
		t.Errorf("expected 'pages must be empty' error, got: %v", result.Errors)
	}
}
