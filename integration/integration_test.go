package integration

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

// Test data paths
var exampleFiles = []struct {
	docType  string
	filePath string
}{
	{"business-requirements", "../docs/specifications/business-requirements/example.yaml"},
	{"technical-requirements", "../docs/specifications/technical-requirements/example.yaml"},
	{"milestones", "../docs/specifications/milestones/example.yaml"},
	{"milestone-tasks", "../docs/specifications/milestone-tasks/example.yaml"},
	{"timeline", "../docs/specifications/timeline/example.yaml"},
	{"qa-test-plan", "../docs/specifications/qa-test-plan/example.yaml"},
	{"gap-analysis", "../docs/specifications/gap-analysis-worksheet/example.yaml"},
}

// TestValidateAllExamples validates all example.yaml files end-to-end
func TestValidateAllExamples(t *testing.T) {
	// Find sherpy binary
	binary := findBinary(t)

	for _, tc := range exampleFiles {
		t.Run(tc.docType, func(t *testing.T) {
			// Check file exists
			if _, err := os.Stat(tc.filePath); os.IsNotExist(err) {
				t.Skipf("Example file not found: %s", tc.filePath)
			}

			// Run validation
			cmd := exec.Command(binary, "validate", "-t", tc.docType, "-f", tc.filePath)
			output, err := cmd.CombinedOutput()
			if err != nil {
				t.Errorf("Validation failed for %s:\n%s", tc.docType, string(output))
			}

			// Check for success message
			if !strings.Contains(string(output), "✓") && !strings.Contains(string(output), "valid") {
				t.Errorf("Expected success message in output for %s, got:\n%s", tc.docType, string(output))
			}
		})
	}
}

// TestConvertAllExamples converts all example.yaml files to markdown end-to-end
func TestConvertAllExamples(t *testing.T) {
	// Find sherpy binary
	binary := findBinary(t)

	// Create temp directory for output
	tmpDir := t.TempDir()

	for _, tc := range exampleFiles {
		t.Run(tc.docType, func(t *testing.T) {
			// Check file exists
			if _, err := os.Stat(tc.filePath); os.IsNotExist(err) {
				t.Skipf("Example file not found: %s", tc.filePath)
			}

			// Run conversion to stdout
			cmd := exec.Command(binary, "to-markdown", "-t", tc.docType, "-f", tc.filePath)
			output, err := cmd.CombinedOutput()
			if err != nil {
				t.Errorf("Conversion to stdout failed for %s:\n%s", tc.docType, string(output))
			}

			// Check for markdown headers
			if !strings.Contains(string(output), "# ") {
				t.Errorf("Expected markdown headers in output for %s", tc.docType)
			}

			// Run conversion to file
			outFile := filepath.Join(tmpDir, tc.docType+".md")
			cmd = exec.Command(binary, "to-markdown", "-t", tc.docType, "-f", tc.filePath, "-o", outFile)
			output, err = cmd.CombinedOutput()
			if err != nil {
				t.Errorf("Conversion to file failed for %s:\n%s", tc.docType, string(output))
			}

			// Check file was created
			if _, err := os.Stat(outFile); os.IsNotExist(err) {
				t.Errorf("Output file not created: %s", outFile)
			}

			// Read file and check for markdown content
			content, err := os.ReadFile(outFile)
			if err != nil {
				t.Fatalf("Failed to read output file: %v", err)
			}
			if !strings.Contains(string(content), "# ") {
				t.Errorf("Expected markdown headers in file output for %s", tc.docType)
			}
		})
	}
}

// TestTypesCommand tests the types command
func TestTypesCommand(t *testing.T) {
	binary := findBinary(t)

	cmd := exec.Command(binary, "types")
	output, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("types command failed: %v\n%s", err, string(output))
	}

	// Check all document types are listed
	expectedTypes := []string{
		"business-requirements",
		"technical-requirements",
		"milestones",
		"milestone-tasks",
		"timeline",
		"qa-test-plan",
		"gap-analysis",
	}

	for _, docType := range expectedTypes {
		if !strings.Contains(string(output), docType) {
			t.Errorf("Expected %s in types output", docType)
		}
	}
}

// TestValidateErrors tests that validation properly reports errors
func TestValidateErrors(t *testing.T) {
	binary := findBinary(t)

	tests := []struct {
		name        string
		args        []string
		expectError bool
	}{
		{
			name:        "missing file",
			args:        []string{"validate", "-t", "business-requirements", "-f", "nonexistent.yaml"},
			expectError: true,
		},
		{
			name:        "missing type flag",
			args:        []string{"validate", "-f", "test.yaml"},
			expectError: true,
		},
		{
			name:        "unknown type",
			args:        []string{"validate", "-t", "unknown-type", "-f", "test.yaml"},
			expectError: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			cmd := exec.Command(binary, tc.args...)
			output, err := cmd.CombinedOutput()

			if tc.expectError && err == nil {
				t.Errorf("Expected error but command succeeded:\n%s", string(output))
			}
			if !tc.expectError && err != nil {
				t.Errorf("Expected success but got error:\n%s", string(output))
			}
		})
	}
}

// TestPromptListCommand tests the prompt --list command
func TestPromptListCommand(t *testing.T) {
	binary := findBinary(t)

	cmd := exec.Command(binary, "prompt", "--list")
	output, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("prompt --list failed: %v\n%s", err, string(output))
	}

	expected := []string{
		"business-requirements-interview",
		"implementation-planner",
		"qa-test-plan",
	}
	for _, name := range expected {
		if !strings.Contains(string(output), name) {
			t.Errorf("expected %s in prompt list output", name)
		}
	}
}

// TestPromptOutputsContent tests that prompt -t outputs content
func TestPromptOutputsContent(t *testing.T) {
	binary := findBinary(t)

	cmd := exec.Command(binary, "prompt", "-t", "business-requirements-interview")
	output, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("prompt -t failed: %v\n%s", err, string(output))
	}

	if len(output) < 100 {
		t.Errorf("output suspiciously short (%d bytes)", len(output))
	}
}

// TestPromptUnknownType tests error handling for unknown prompt types
func TestPromptUnknownType(t *testing.T) {
	binary := findBinary(t)

	cmd := exec.Command(binary, "prompt", "-t", "nonexistent")
	output, err := cmd.CombinedOutput()
	if err == nil {
		t.Fatal("expected error for unknown prompt type")
	}

	if !strings.Contains(string(output), "unknown") {
		t.Errorf("expected 'unknown' in error output, got: %s", string(output))
	}
}

// TestBinaryIsFresh verifies that findBinary always builds a fresh binary
func TestBinaryIsFresh(t *testing.T) {
	// Get initial binary
	binary1 := findBinary(t)
	info1, err := os.Stat(binary1)
	if err != nil {
		t.Fatalf("Failed to stat binary: %v", err)
	}
	modTime1 := info1.ModTime()

	// Wait to ensure timestamp difference
	time.Sleep(1 * time.Second)

	// Simulate source change by touching a file
	testFile := filepath.Join("..", "cmd", "root.go")
	now := time.Now()
	if err := os.Chtimes(testFile, now, now); err != nil {
		t.Skipf("Cannot touch source file: %v", err)
	}

	// Build again
	binary2 := findBinary(t)
	info2, err := os.Stat(binary2)
	if err != nil {
		t.Fatalf("Failed to stat binary: %v", err)
	}
	modTime2 := info2.ModTime()

	// Should be newer (always rebuilds)
	if !modTime2.After(modTime1) {
		t.Errorf("Binary not rebuilt: old=%v new=%v", modTime1, modTime2)
	}
}

// findBinary builds and returns the sherpy binary for testing
func findBinary(t *testing.T) string {
	t.Helper()

	// Determine binary path based on test location
	wd, err := os.Getwd()
	if err != nil {
		t.Fatalf("Failed to get working directory: %v", err)
	}

	binary := filepath.Join(wd, "sherpy")

	// Always build fresh to ensure latest code
	buildDir := filepath.Join(wd, "..")
	cmd := exec.Command("go", "build", "-o", binary, buildDir)
	if output, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("Failed to build sherpy binary: %v\n%s", err, string(output))
	}

	// Verify binary exists and is executable
	if _, err := os.Stat(binary); err != nil {
		t.Fatalf("Binary not found after build: %v", err)
	}

	return binary
}
