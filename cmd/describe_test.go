package cmd

import (
	"bytes"
	"strings"
	"testing"
)

func TestDescribeListCommand(t *testing.T) {
	buf := new(bytes.Buffer)
	root := NewRootCmd()
	root.SetOut(buf)
	root.SetErr(buf)
	root.SetArgs([]string{"describe", "--list"})

	err := root.Execute()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	out := buf.String()
	expected := []string{
		"business-requirements",
		"technical-requirements",
		"milestones",
		"milestone-tasks",
		"timeline",
		"qa-test-plan",
		"gap-analysis",
	}
	for _, name := range expected {
		if !strings.Contains(out, name) {
			t.Errorf("expected %q in output, got:\n%s", name, out)
		}
	}
}

func TestDescribeCommandSuccess(t *testing.T) {
	buf := new(bytes.Buffer)
	root := NewRootCmd()
	root.SetOut(buf)
	root.SetErr(buf)
	root.SetArgs([]string{"describe", "-t", "business-requirements"})

	err := root.Execute()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	out := buf.String()
	if len(out) < 100 {
		t.Errorf("output suspiciously short (%d bytes)", len(out))
	}
	// Spec content is raw markdown and should begin with a header
	if !strings.HasPrefix(out, "# ") {
		t.Error("expected spec output to begin with a markdown header")
	}
}

func TestDescribeCommandErrors(t *testing.T) {
	tests := []struct {
		name    string
		args    []string
		wantErr bool
	}{
		{
			name:    "missing type and no list flag",
			args:    []string{"describe"},
			wantErr: true,
		},
		{
			name:    "unknown type",
			args:    []string{"describe", "-t", "nonexistent"},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cmd := NewRootCmd()
			buf := new(bytes.Buffer)
			cmd.SetOut(buf)
			cmd.SetErr(buf)
			cmd.SetArgs(tt.args)

			err := cmd.Execute()
			if tt.wantErr && err == nil {
				t.Errorf("expected error, got none")
			}
			if !tt.wantErr && err != nil {
				t.Errorf("unexpected error: %v", err)
			}
		})
	}
}

func TestDescribeAllTypes(t *testing.T) {
	docTypes := []string{
		"business-requirements",
		"technical-requirements",
		"milestones",
		"milestone-tasks",
		"timeline",
		"qa-test-plan",
		"gap-analysis",
	}

	for _, name := range docTypes {
		t.Run(name, func(t *testing.T) {
			cmd := NewRootCmd()
			buf := new(bytes.Buffer)
			cmd.SetOut(buf)
			cmd.SetErr(buf)
			cmd.SetArgs([]string{"describe", "-t", name})

			err := cmd.Execute()
			if err != nil {
				t.Errorf("unexpected error for %s: %v", name, err)
			}

			out := buf.String()
			if len(out) < 50 {
				t.Errorf("output for %s suspiciously short (%d bytes)", name, len(out))
			}
		})
	}
}
