package markdown

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func loadWSMarkdownFixture(t *testing.T, name string) []byte {
	t.Helper()
	path := filepath.Join("..", "testdata", "wireframe-spec", name)
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("failed to read fixture %s: %v", name, err)
	}
	return data
}

func TestConvertWireframeSpec_WithUIChanges(t *testing.T) {
	data := loadWSMarkdownFixture(t, "valid.yaml")
	output, err := ConvertWireframeSpec(data)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	assertContains(t, output, "# Wireframe Specification")
	assertContains(t, output, "**Has UI Changes:** true")
	assertContains(t, output, "## PAGE-001: Dashboard")
	assertContains(t, output, "**Route:** `/dashboard`")
	assertContains(t, output, "### Components")
	assertContains(t, output, "| ID | Name | Type | States | Description |")
	assertContains(t, output, "COMP-001")
	assertContains(t, output, "## Wireframe Files")
	assertContains(t, output, "wireframes.pen")
}

func TestConvertWireframeSpec_NoUIChanges(t *testing.T) {
	data := loadWSMarkdownFixture(t, "no-ui-changes.yaml")
	output, err := ConvertWireframeSpec(data)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	assertContains(t, output, "# Wireframe Specification")
	assertContains(t, output, "**Has UI Changes:** false")
	if strings.Contains(output, "### Components") {
		t.Error("output should not contain components section when has_ui_changes is false")
	}
	if strings.Contains(output, "## Wireframe Files") {
		t.Error("output should not contain wireframe files section when has_ui_changes is false")
	}
}
