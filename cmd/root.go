package cmd

import (
	"fmt"
	"io"
	"os"

	"github.com/kydavis/sherpy/markdown"
	"github.com/kydavis/sherpy/schema"
	"github.com/spf13/cobra"
)

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

	data, err := os.ReadFile(filename)
	if err != nil {
		return fmt.Errorf("failed to read file: %w", err)
	}

	result, err := validator(data, strict)
	if err != nil {
		return err
	}

	output := schema.FormatResult(typeName, filename, result, strict)
	fmt.Fprintln(w, output)

	if !result.Valid() || (strict && len(result.Warnings) > 0) {
		os.Exit(1)
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
		os.Exit(1)
	}
}

func runToMarkdown(w io.Writer, typeName, filename, output string) error {
	converter, err := markdown.ResolveConverter(typeName)
	if err != nil {
		return err
	}

	data, err := os.ReadFile(filename)
	if err != nil {
		return fmt.Errorf("failed to read file: %w", err)
	}

	md, err := converter(data)
	if err != nil {
		return fmt.Errorf("conversion failed: %w", err)
	}

	if output != "" {
		return os.WriteFile(output, []byte(md), 0644)
	}

	fmt.Fprint(w, md)
	return nil
}
