package cmd

import (
	"bytes"
	"strings"
	"testing"
)

func TestTypesCommand(t *testing.T) {
	buf := new(bytes.Buffer)
	root := NewRootCmd()
	root.SetOut(buf)
	root.SetArgs([]string{"types"})

	err := root.Execute()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	out := buf.String()
	expectedTypes := []string{
		"business-requirements",
		"technical-requirements",
		"milestones",
		"milestone-tasks",
		"timeline",
		"qa-test-plan",
		"gap-analysis",
	}

	for _, et := range expectedTypes {
		if !strings.Contains(out, et) {
			t.Errorf("expected type %q in output, got:\n%s", et, out)
		}
	}
}

func TestValidateCommandMissingFile(t *testing.T) {
	buf := new(bytes.Buffer)
	root := NewRootCmd()
	root.SetOut(buf)
	root.SetArgs([]string{"validate", "-t", "business-requirements", "-f", "nonexistent.yaml"})

	err := root.Execute()
	if err == nil {
		t.Fatal("expected error for nonexistent file")
	}
}

func TestValidateCommandMissingType(t *testing.T) {
	buf := new(bytes.Buffer)
	root := NewRootCmd()
	root.SetOut(buf)
	root.SetArgs([]string{"validate", "-f", "some.yaml"})

	err := root.Execute()
	if err == nil {
		t.Fatal("expected error when -t not provided")
	}
}

func TestValidateCommandUnknownType(t *testing.T) {
	buf := new(bytes.Buffer)
	root := NewRootCmd()
	root.SetOut(buf)
	root.SetArgs([]string{"validate", "-t", "unknown", "-f", "some.yaml"})

	err := root.Execute()
	if err == nil {
		t.Fatal("expected error for unknown type")
	}
	if !strings.Contains(err.Error(), "unknown document type") {
		t.Errorf("expected 'unknown document type' error, got: %v", err)
	}
}
