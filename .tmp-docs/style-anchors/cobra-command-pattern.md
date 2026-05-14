---
id: cobra-command-pattern
name: Cobra Command Pattern
category: cli
tags: [cobra, command, flags, RunE, subcommand]
created: 2026-05-14
---

# Cobra Command Pattern

## Overview

The standard pattern for adding cobra subcommands to the Sherpy CLI. Each command follows the same structure: a `new*Cmd()` constructor returning `*cobra.Command`, local flag variables declared in closure scope, and a `run*()` function separated from the command definition for testability.

## Source Reference

- `cmd/root.go:107-135` — validate command with flags
- `cmd/root.go:163-189` — to-markdown command with flags
- `cmd/root.go:87-95` — types command (simplest variant)

## Code Example

```go
// Constructor pattern: newXxxCmd returns *cobra.Command
func newValidateCmd() *cobra.Command {
    // Flags as closure variables — scoped to this command only
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
            // Validate required flags before delegating
            if typeName == "" {
                return fmt.Errorf("type is required: use -t <type>")
            }
            if file == "" {
                return fmt.Errorf("file is required: use -f <file.yaml>")
            }
            return runValidate(cmd.OutOrStdout(), typeName, file, strict, verbose)
        },
    }

    // Register flags with both long and short forms
    cmd.Flags().StringVarP(&typeName, "type", "t", "", "document type (required)")
    cmd.Flags().StringVarP(&file, "file", "f", "", "YAML file to validate (required)")
    cmd.Flags().BoolVar(&strict, "strict", false, "treat warnings as errors")
    cmd.Flags().BoolVarP(&verbose, "verbose", "v", false, "show detailed output")

    return cmd
}

// Logic function accepts io.Writer for testability
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
```

Registration in `NewRootCmd()`:
```go
func NewRootCmd() *cobra.Command {
    root := &cobra.Command{
        Use:   "sherpy",
        Short: "Structured Requirements & Planning CLI",
    }

    root.AddCommand(newValidateCmd())
    root.AddCommand(newToMarkdownCmd())
    root.AddCommand(newTypesCmd())
    root.AddCommand(newPromptCmd())  // new command added here

    return root
}
```

## What This Demonstrates

- `newXxxCmd()` constructor pattern returning `*cobra.Command`
- Flag variables declared in closure — zero global state
- Required flag validation in `RunE` with clear error messages
- `run*()` function accepts `io.Writer` for testability (not `os.Stdout` directly)
- `cmd.OutOrStdout()` passed to `run*()` so tests can capture output via `cmd.SetOut(buf)`

## When to Use

- When adding any new subcommand to the Sherpy CLI
- When the command needs typed flags with validation

## Pattern Requirements

- ✓ MUST use `newXxxCmd()` constructor — never create commands inline
- ✓ MUST register in `NewRootCmd()` via `root.AddCommand()`
- ✓ MUST validate required flags in `RunE` with `fmt.Errorf("X is required: use -<flag>")`
- ✓ MUST separate `run*()` function accepting `io.Writer` as first param
- ✓ MUST use `cmd.OutOrStdout()` to pass writer from RunE to run function
- ✓ Use `StringVarP` for flags with both long/short forms, `StringVar` for long-only
- ✓ Error messages reference the flag name: `"type is required: use -t <type>"`

## Common Mistakes to Avoid

- ❌ Writing directly to `os.Stdout` — untestable
- ❌ Using `Run` instead of `RunE` — swallows errors
- ❌ Declaring flags as package-level vars — shared across commands
- ❌ Forgetting to validate required flags — cobra doesn't enforce empty strings
- ❌ Adding flags with `PersistentFlags()` when they should be local `Flags()`
