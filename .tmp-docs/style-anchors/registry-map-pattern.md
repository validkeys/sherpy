---
id: registry-map-pattern
name: Registry Map Pattern
category: architecture
tags: [registry, map, resolver, lookup, sort]
created: 2026-05-14
---

# Registry Map Pattern

## Overview

A typed map registry with public lookup functions and sorted iteration. Used throughout Sherpy for schema validators (`schema/registry.go`), markdown converters (`markdown/converter.go`), and the new prompt registry (`prompt/registry.go`).

## Source Reference

- `schema/registry.go:20-31` — validator registry with pattern strings
- `markdown/converter.go:14-22` — converter registry

## Code Example

```go
// Define the registry as a package-level map with an anonymous struct value type
var registry = map[string]struct {
    pattern   string
    validator ValidatorFunc
}{
    "business-requirements":  {pattern: "business-requirements.yaml", validator: ValidateBusinessRequirements},
    "technical-requirements": {pattern: "technical-requirements.yaml", validator: ValidateTechnicalRequirements},
    "milestones":             {pattern: "milestones.yaml", validator: ValidateMilestones},
}

// RegisteredTypes returns sorted keys for deterministic output
func RegisteredTypes() []string {
    types := make([]string, 0, len(registry))
    for k := range registry {
        types = append(types, k)
    }
    sort.Strings(types)
    return types
}

// ResolveValidator looks up by name, returns typed error if missing
func ResolveValidator(typeName string) (ValidatorFunc, error) {
    entry, ok := registry[typeName]
    if !ok {
        return nil, fmt.Errorf("unknown document type: %q", typeName)
    }
    return entry.validator, nil
}
```

## What This Demonstrates

- Package-level map with anonymous struct values for type-safe lookups
- Sorted iteration for deterministic CLI output
- Quoted `%q` format in error messages for clear diagnostics
- `make` with `len(registry)` cap to avoid reallocation

## When to Use

- When adding a new registry (validators, converters, prompts, etc.)
- When you need named lookups with typed return values
- When CLI output must list entries in alphabetical order

## Pattern Requirements

- ✓ Registry MUST use `map[string]struct{...}` for type-safe value fields
- ✓ `Registered*()` functions MUST return sorted keys
- ✓ `Resolve*()` functions MUST return `fmt.Errorf("unknown ... %q", name)` when not found
- ✓ Pre-allocate slices with `make([]string, 0, len(map))`
- ✓ Sort imports: `fmt`, `sort`, then project packages

## Common Mistakes to Avoid

- ❌ Using `map[string]interface{}` — loses type safety
- ❌ Returning unsorted map keys — breaks test determinism
- ❌ Using `%s` instead of `%q` in "unknown type" errors — harder to debug whitespace issues
- ❌ Forgetting to register new entries when adding a type
