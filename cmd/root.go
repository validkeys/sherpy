package cmd

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/kydavis/sherpy/markdown"
	"github.com/kydavis/sherpy/schema"
	"github.com/spf13/cobra"
)

const MaxFileSize = 10 * 1024 * 1024 // 10MB

// validatePath checks for path traversal attacks
// It allows one level of parent directory traversal (e.g., ../docs) but blocks excessive traversal
func validatePath(path string) error {
	// Clean the path to normalize it
	cleaned := filepath.Clean(path)

	// Count how many ".." segments remain after cleaning
	// One level up is OK (for accessing sibling directories), more is suspicious
	parts := strings.Split(cleaned, string(filepath.Separator))
	parentCount := 0
	for _, part := range parts {
		if part == ".." {
			parentCount++
		}
	}

	// Allow up to 1 level of parent directory traversal
	// Block 2+ levels (e.g., ../../etc/passwd)
	if parentCount > 1 {
		return fmt.Errorf("path traversal detected: %s", path)
	}

	// Convert to absolute path for additional validation
	_, err := filepath.Abs(cleaned)
	if err != nil {
		return fmt.Errorf("invalid path: %w", err)
	}

	return nil
}

// readFileWithLimit reads a file with size validation and path checking
func readFileWithLimit(filename string) ([]byte, error) {
	// Validate path first
	if err := validatePath(filename); err != nil {
		return nil, err
	}

	// Check size before reading
	info, err := os.Stat(filename)
	if err != nil {
		return nil, fmt.Errorf("failed to stat file: %w", err)
	}

	if info.Size() > MaxFileSize {
		return nil, fmt.Errorf("file too large: %d bytes (max %d)", info.Size(), MaxFileSize)
	}

	// Size is OK, read the file
	data, err := os.ReadFile(filename)
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}

	return data, nil
}

func NewRootCmd() *cobra.Command {
	root := &cobra.Command{
		Use:   "sherpy",
		Short: "Structured Requirements & Planning CLI",
	}

	root.AddCommand(newValidateCmd())
	root.AddCommand(newToMarkdownCmd())
	root.AddCommand(newTypesCmd())

	return root
}

func newTypesCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "types",
		Short: "List supported document types",
		RunE: func(cmd *cobra.Command, args []string) error {
			return runTypes(cmd.OutOrStdout())
		},
	}
}

func runTypes(w io.Writer) error {
	types := schema.RegisteredTypes()
	fmt.Fprintf(w, "%-25s %s\n", "TYPE", "FILE PATTERN")
	for _, t := range types {
		pattern, _ := schema.FilePattern(t)
		fmt.Fprintf(w, "%-25s %s\n", t, pattern)
	}
	return nil
}

func newValidateCmd() *cobra.Command {
	var (
		typeName string
		file     string
		strict   bool
		verbose  bool
	)

	cmd := &cobra.Command{
		Use:   "validate -t <type> -f <file.yaml>",
		Short: "Validate a YAML document against its schema",
		RunE: func(cmd *cobra.Command, args []string) error {
			if typeName == "" {
				return fmt.Errorf("type is required: use -t <type>")
			}
			if file == "" {
				return fmt.Errorf("file is required: use -f <file.yaml>")
			}
			return runValidate(cmd.OutOrStdout(), typeName, file, strict, verbose)
		},
	}

	cmd.Flags().StringVarP(&typeName, "type", "t", "", "document type (required)")
	cmd.Flags().StringVarP(&file, "file", "f", "", "YAML file to validate (required)")
	cmd.Flags().BoolVar(&strict, "strict", false, "treat warnings as errors")
	cmd.Flags().BoolVarP(&verbose, "verbose", "v", false, "show detailed output")

	return cmd
}

func runValidate(w io.Writer, typeName, filename string, strict, verbose bool) error {
	validator, err := schema.ResolveValidator(typeName)
	if err != nil {
		return err
	}

	data, err := readFileWithLimit(filename)
	if err != nil {
		return err
	}

	result, err := validator(data, strict)
	if err != nil {
		return err
	}

	output := schema.FormatResult(typeName, filename, result, strict)
	fmt.Fprintln(w, output)

	if !result.Valid() || (strict && len(result.Warnings) > 0) {
		return fmt.Errorf("validation failed")
	}

	return nil
}

func newToMarkdownCmd() *cobra.Command {
	var (
		typeName string
		file     string
		output   string
	)

	cmd := &cobra.Command{
		Use:   "to-markdown -t <type> -f <file.yaml>",
		Short: "Convert a YAML document to Markdown",
		RunE: func(cmd *cobra.Command, args []string) error {
			if typeName == "" {
				return fmt.Errorf("type is required: use -t <type>")
			}
			if file == "" {
				return fmt.Errorf("file is required: use -f <file.yaml>")
			}
			return runToMarkdown(cmd.OutOrStdout(), typeName, file, output)
		},
	}

	cmd.Flags().StringVarP(&typeName, "type", "t", "", "document type (required)")
	cmd.Flags().StringVarP(&file, "file", "f", "", "YAML file to convert (required)")
	cmd.Flags().StringVarP(&output, "output", "o", "", "output file (default: stdout)")

	return cmd
}

func Execute() {
	root := NewRootCmd()
	if err := root.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		// Check error type for specific exit codes
		if strings.Contains(err.Error(), "validation failed") {
			os.Exit(1)
		}
		os.Exit(2)
	}
}

func runToMarkdown(w io.Writer, typeName, filename, output string) error {
	converter, err := markdown.ResolveConverter(typeName)
	if err != nil {
		return err
	}

	data, err := readFileWithLimit(filename)
	if err != nil {
		return err
	}

	md, err := converter(data)
	if err != nil {
		return fmt.Errorf("conversion failed: %w", err)
	}

	if output != "" {
		// Validate output path
		if err := validatePath(output); err != nil {
			return err
		}
		if err := os.WriteFile(output, []byte(md), 0600); err != nil {
			return fmt.Errorf("failed to write output file %q: %w", output, err)
		}
		return nil
	}

	fmt.Fprint(w, md)
	return nil
}
