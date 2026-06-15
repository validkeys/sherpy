package cmd

import (
	"bytes"
	"strings"
	"testing"
)

func TestPromptListCommand(t *testing.T) {
	buf := new(bytes.Buffer)
	root := NewRootCmd()
	root.SetOut(buf)
	root.SetErr(buf)
	root.SetArgs([]string{"prompt", "--list"})

	err := root.Execute()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	out := buf.String()
	expected := []string{
		"gap-analysis-worksheet",
		"business-requirements-interview",
		"technical-requirements-interview",
		"implementation-planner",
	}
	for _, name := range expected {
		if !strings.Contains(out, name) {
			t.Errorf("expected %q in output, got:\n%s", name, out)
		}
	}
}

func TestPromptCommandSuccess(t *testing.T) {
	buf := new(bytes.Buffer)
	root := NewRootCmd()
	root.SetOut(buf)
	root.SetErr(buf)
	root.SetArgs([]string{"prompt", "-t", "business-requirements-interview"})

	err := root.Execute()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	out := buf.String()
	if len(out) < 100 {
		t.Errorf("output suspiciously short (%d bytes)", len(out))
	}
	if strings.Contains(out, "---") && strings.Contains(out, "name:") {
		t.Error("frontmatter not stripped from output")
	}
}

func TestPromptCommandErrors(t *testing.T) {
	tests := []struct {
		name    string
		args    []string
		wantErr bool
	}{
		{
			name:    "missing type and no list flag",
			args:    []string{"prompt"},
			wantErr: true,
		},
		{
			name:    "unknown type",
			args:    []string{"prompt", "-t", "nonexistent"},
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

func TestPromptAllTypes(t *testing.T) {
	prompts := []string{
		"gap-analysis-worksheet",
		"business-requirements-interview",
		"technical-requirements-interview",
		"style-anchors-collection",
		"implementation-planner",
		"ux-wireframe-planning",
		"implementation-plan-review",
		"definition-of-done",
		"architecture-decision-record",
		"delivery-timeline",
		"qa-test-plan",
		"developer-summary",
		"executive-summary",
	}

	for _, name := range prompts {
		t.Run(name, func(t *testing.T) {
			cmd := NewRootCmd()
			buf := new(bytes.Buffer)
			cmd.SetOut(buf)
			cmd.SetErr(buf)
			cmd.SetArgs([]string{"prompt", "-t", name})

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
