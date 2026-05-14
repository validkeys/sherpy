---
id: frontmatter-strip
name: Frontmatter Stripping
category: parsing
tags: [yaml, frontmatter, markdown, parsing, strip]
created: 2026-05-14
---

# Frontmatter Stripping

## Overview

Strips YAML frontmatter (content between `---` delimiters at the start of a markdown file) and returns only the body content. Used by `sherpy prompt` to output clean skill instructions without the metadata header.

## Context

Sherpy SKILL.md files start with YAML frontmatter:
```yaml
---
name: business-requirements-interview
description: Conducts structured interviews...
user-invocable: true
---

# Business Requirements Interview
...rest of content...
```

The `sherpy prompt` command must strip the frontmatter and output only the instructional content (everything after the second `---`).

## Code Example

```go
// stripFrontmatter removes YAML frontmatter from markdown content.
// Frontmatter is the content between --- delimiters at the start of a file.
// Returns the body content with leading/trailing whitespace trimmed.
// If no valid frontmatter is found, returns the original content trimmed.
func stripFrontmatter(content string) string {
    content = strings.TrimSpace(content)

    if !strings.HasPrefix(content, "---") {
        return content
    }

    // Find the closing --- after the opening one
    // The opening --- must be on its own line
    rest := content[3:]
    if len(rest) > 0 && rest[0] != '\n' {
        return content
    }

    // Find closing delimiter
    idx := strings.Index(rest, "\n---")
    if idx == -1 {
        return content
    }

    // Verify the closing --- is followed by end-of-line or end-of-string
    after := rest[idx+4:]
    if len(after) > 0 && after[0] != '\n' && after[0] != '\r' {
        return content
    }

    body := rest[idx+4:]
    return strings.TrimSpace(body)
}
```

## What This Demonstrates

- Guard clauses for missing/invalid frontmatter (returns original content)
- Validates opening `---` is on its own line
- Validates closing `---` is on its own line
- Uses `strings.TrimSpace` for clean output
- Pure function with no side effects — easy to test

## When to Use

- When parsing SKILL.md files for `sherpy prompt` output
- When extracting body content from markdown with YAML headers
- Any time you need to separate metadata from content

## Pattern Requirements

- ✓ MUST return original content (trimmed) if no valid frontmatter found
- ✓ MUST validate both opening AND closing `---` are on their own lines
- ✓ MUST handle edge cases: no frontmatter, only opening `---`, content starting with `---` but not frontmatter
- ✓ MUST return trimmed output (no leading/trailing blank lines)
- ✓ Pure function — no I/O, no side effects, easy to unit test
- ✓ Write tests FIRST with edge cases before implementing

## Common Mistakes to Avoid

- ❌ Using regex for frontmatter detection — fragile with edge cases
- ❌ Assuming frontmatter always exists — files may not have it
- ❌ Not validating closing `---` is on its own line — could match `---text` mid-content
- ❌ Forgetting to trim whitespace — results in leading blank lines in output
- ❌ Using `strings.Split(content, "---")` — breaks if content contains `---` (e.g., horizontal rules in markdown)
