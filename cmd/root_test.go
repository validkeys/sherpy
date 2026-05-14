package cmd

import (
	"bytes"
	"os"
	"path/filepath"
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

// Security Tests

func TestValidatePathTraversal(t *testing.T) {
	tests := []struct {
		name    string
		path    string
		wantErr bool
	}{
		{
			name:    "normal relative path",
			path:    "test.yaml",
			wantErr: false,
		},
		{
			name:    "normal absolute path",
			path:    "/tmp/test.yaml",
			wantErr: false,
		},
		{
			name:    "path with parent directory (one level allowed)",
			path:    "../test.yaml",
			wantErr: false, // One level of ".." is allowed
		},
		{
			name:    "path with multiple parent directories",
			path:    "../../etc/passwd",
			wantErr: true,
		},
		{
			name:    "absolute path with traversal (cleans to valid path)",
			path:    "/tmp/../etc/passwd",
			wantErr: false, // filepath.Clean resolves this to /etc/passwd, which has no ".."
		},
		{
			name:    "subdirectory path",
			path:    "subdir/test.yaml",
			wantErr: false,
		},
		{
			name:    "current directory reference",
			path:    "./test.yaml",
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validatePath(tt.path)
			if tt.wantErr && err == nil {
				t.Errorf("expected error for path %q, got none", tt.path)
			}
			if !tt.wantErr && err != nil {
				t.Errorf("unexpected error for path %q: %v", tt.path, err)
			}
		})
	}
}

func TestReadFileWithLimit(t *testing.T) {
	tmpDir := t.TempDir()

	// Create a small valid file
	smallFile := filepath.Join(tmpDir, "small.yaml")
	smallContent := []byte("project: test\nversion: 1.0\n")
	if err := os.WriteFile(smallFile, smallContent, 0600); err != nil {
		t.Fatalf("failed to create small test file: %v", err)
	}

	// Test reading small file succeeds
	t.Run("small file succeeds", func(t *testing.T) {
		data, err := readFileWithLimit(smallFile)
		if err != nil {
			t.Errorf("unexpected error reading small file: %v", err)
		}
		if string(data) != string(smallContent) {
			t.Errorf("content mismatch: got %q, want %q", data, smallContent)
		}
	})

	// Create a file that's exactly at the limit
	limitFile := filepath.Join(tmpDir, "limit.yaml")
	limitContent := make([]byte, MaxFileSize)
	if err := os.WriteFile(limitFile, limitContent, 0600); err != nil {
		t.Fatalf("failed to create limit test file: %v", err)
	}

	t.Run("file at size limit succeeds", func(t *testing.T) {
		data, err := readFileWithLimit(limitFile)
		if err != nil {
			t.Errorf("unexpected error reading file at limit: %v", err)
		}
		if len(data) != MaxFileSize {
			t.Errorf("length mismatch: got %d, want %d", len(data), MaxFileSize)
		}
	})

	// Create a file that's over the limit
	largeFile := filepath.Join(tmpDir, "large.yaml")
	largeContent := make([]byte, MaxFileSize+1)
	if err := os.WriteFile(largeFile, largeContent, 0600); err != nil {
		t.Fatalf("failed to create large test file: %v", err)
	}

	t.Run("file over size limit fails", func(t *testing.T) {
		_, err := readFileWithLimit(largeFile)
		if err == nil {
			t.Error("expected error for file over size limit, got none")
		}
		if !strings.Contains(err.Error(), "file too large") {
			t.Errorf("expected 'file too large' error, got: %v", err)
		}
	})

	// Test path traversal is blocked (2+ levels of ..)
	t.Run("path traversal blocked", func(t *testing.T) {
		// Create a path with 2+ levels of parent directory traversal
		traversalPath := "../../etc/passwd"
		_, err := readFileWithLimit(traversalPath)
		if err == nil {
			t.Error("expected error for path traversal, got none")
		}
		if !strings.Contains(err.Error(), "path traversal") {
			t.Errorf("expected 'path traversal' error, got: %v", err)
		}
	})

	// Test nonexistent file
	t.Run("nonexistent file fails", func(t *testing.T) {
		_, err := readFileWithLimit(filepath.Join(tmpDir, "nonexistent.yaml"))
		if err == nil {
			t.Error("expected error for nonexistent file, got none")
		}
	})
}

func TestValidateCommandPathTraversalProtection(t *testing.T) {
	buf := new(bytes.Buffer)
	root := NewRootCmd()
	root.SetOut(buf)
	root.SetErr(buf)
	root.SetArgs([]string{"validate", "-t", "business-requirements", "-f", "../../../etc/passwd"})

	err := root.Execute()
	if err == nil {
		t.Fatal("expected error for path traversal attempt")
	}
	if !strings.Contains(err.Error(), "path traversal") {
		t.Errorf("expected 'path traversal' error, got: %v", err)
	}
}

func TestToMarkdownCommand(t *testing.T) {
	tests := []struct {
		name       string
		args       []string
		wantOutput string
		wantErr    bool
	}{
		{
			name:       "success with stdout",
			args:       []string{"to-markdown", "-t", "business-requirements", "-f", "../docs/specifications/business-requirements/example.yaml"},
			wantOutput: "# Business Requirements",
			wantErr:    false,
		},
		{
			name:    "missing type flag",
			args:    []string{"to-markdown", "-f", "test.yaml"},
			wantErr: true,
		},
		{
			name:    "missing file flag",
			args:    []string{"to-markdown", "-t", "business-requirements"},
			wantErr: true,
		},
		{
			name:    "invalid type",
			args:    []string{"to-markdown", "-t", "invalid-type", "-f", "test.yaml"},
			wantErr: true,
		},
		{
			name:    "file not found",
			args:    []string{"to-markdown", "-t", "business-requirements", "-f", "nonexistent.yaml"},
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

			if tt.wantErr {
				if err == nil {
					t.Errorf("expected error, got none")
				}
				return
			}

			if err != nil {
				t.Errorf("unexpected error: %v", err)
			}

			output := buf.String()
			if !strings.Contains(output, tt.wantOutput) {
				t.Errorf("output missing expected content %q\nGot: %s", tt.wantOutput, output)
			}
		})
	}
}

func TestToMarkdownWithOutputFile(t *testing.T) {
	tmpDir := t.TempDir()
	outputFile := filepath.Join(tmpDir, "output.md")

	cmd := NewRootCmd()
	cmd.SetArgs([]string{
		"to-markdown",
		"-t", "business-requirements",
		"-f", "../docs/specifications/business-requirements/example.yaml",
		"-o", outputFile,
	})

	err := cmd.Execute()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Verify file was created
	info, err := os.Stat(outputFile)
	if os.IsNotExist(err) {
		t.Fatal("output file was not created")
	}

	// Verify file permissions (0600)
	if info.Mode().Perm() != 0600 {
		t.Errorf("expected permissions 0600, got %o", info.Mode().Perm())
	}

	// Verify file content
	content, err := os.ReadFile(outputFile)
	if err != nil {
		t.Fatalf("failed to read output file: %v", err)
	}

	if !strings.Contains(string(content), "# Business Requirements") {
		t.Errorf("output file missing expected header")
	}
}

func TestToMarkdownPathTraversal(t *testing.T) {
	// Try to write to a path with excessive traversal (3 levels up)
	outputFile := "../../../malicious.md"

	cmd := NewRootCmd()
	buf := new(bytes.Buffer)
	cmd.SetOut(buf)
	cmd.SetErr(buf)
	cmd.SetArgs([]string{
		"to-markdown",
		"-t", "business-requirements",
		"-f", "../docs/specifications/business-requirements/example.yaml",
		"-o", outputFile,
	})

	err := cmd.Execute()
	if err == nil {
		t.Fatal("expected error for output path traversal")
	}
	if !strings.Contains(err.Error(), "path traversal") {
		t.Errorf("expected 'path traversal' error, got: %v", err)
	}
}

func TestToMarkdownAllTypes(t *testing.T) {
	types := []struct {
		name string
		path string
	}{
		{"business-requirements", "../docs/specifications/business-requirements/example.yaml"},
		{"technical-requirements", "../docs/specifications/technical-requirements/example.yaml"},
		{"milestones", "../docs/specifications/milestones/example.yaml"},
		{"timeline", "../docs/specifications/timeline/example.yaml"},
		{"qa-test-plan", "../docs/specifications/qa-test-plan/example.yaml"},
	}

	for _, docType := range types {
		t.Run(docType.name, func(t *testing.T) {
			cmd := NewRootCmd()
			buf := new(bytes.Buffer)
			cmd.SetOut(buf)
			cmd.SetErr(buf)
			cmd.SetArgs([]string{"to-markdown", "-t", docType.name, "-f", docType.path})

			err := cmd.Execute()
			if err != nil {
				t.Errorf("failed to convert %s: %v", docType.name, err)
			}

			output := buf.String()
			if len(output) < 100 {
				t.Errorf("output suspiciously short (%d bytes)", len(output))
			}
		})
	}
}

func TestErrorMessageContext(t *testing.T) {
	tmpDir := t.TempDir()
	outputFile := filepath.Join(tmpDir, "readonly", "output.md")

	cmd := NewRootCmd()
	buf := new(bytes.Buffer)
	cmd.SetOut(buf)
	cmd.SetErr(buf)
	cmd.SetArgs([]string{
		"to-markdown",
		"-t", "business-requirements",
		"-f", "../docs/specifications/business-requirements/example.yaml",
		"-o", outputFile,
	})

	err := cmd.Execute()
	if err == nil {
		t.Skip("expected permission error (may not occur in all environments)")
	}

	// Error should contain the filename for context
	if !strings.Contains(err.Error(), "failed to write") && !strings.Contains(err.Error(), outputFile) {
		t.Errorf("error missing context about output file: %v", err)
	}
}
