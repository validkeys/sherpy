package prompt

import (
	"sort"
	"strings"
	"testing"
)

func TestRegisteredPromptsSorted(t *testing.T) {
	prompts := RegisteredPrompts()
	if len(prompts) == 0 {
		t.Fatal("expected at least one registered prompt")
	}

	names := make([]string, len(prompts))
	for i, p := range prompts {
		names[i] = p.Name
	}

	if !sort.StringsAreSorted(names) {
		t.Errorf("prompts not sorted: %v", names)
	}
}

func TestResolvePromptFound(t *testing.T) {
	_, err := ResolvePrompt("business-requirements-interview")
	if err != nil {
		t.Errorf("expected to resolve known prompt, got: %v", err)
	}
}

func TestResolvePromptNotFound(t *testing.T) {
	_, err := ResolvePrompt("nonexistent-prompt")
	if err == nil {
		t.Fatal("expected error for unknown prompt")
	}
	if !strings.Contains(err.Error(), "unknown prompt") {
		t.Errorf("expected 'unknown prompt' error, got: %v", err)
	}
}

func TestRegisteredPromptsContainsAllPipeline(t *testing.T) {
	prompts := RegisteredPrompts()
	names := make(map[string]bool)
	for _, p := range prompts {
		names[p.Name] = true
	}

	expected := []string{
		"gap-analysis-worksheet",
		"business-requirements-interview",
		"technical-requirements-interview",
		"style-anchors-collection",
		"implementation-planner",
		"implementation-plan-review",
		"definition-of-done",
		"architecture-decision-record",
		"delivery-timeline",
		"qa-test-plan",
		"developer-summary",
		"executive-summary",
	}

	for _, name := range expected {
		if !names[name] {
			t.Errorf("missing expected prompt: %s", name)
		}
	}
}

func TestStripFrontmatterWithValidFrontmatter(t *testing.T) {
	input := "---\nname: test\n---\n# Body\nContent here."
	got := stripFrontmatter(input)
	if strings.Contains(got, "---") {
		t.Errorf("frontmatter delimiters not stripped: %q", got)
	}
	if !strings.Contains(got, "# Body") {
		t.Errorf("body content missing: %q", got)
	}
}

func TestStripFrontmatterNoFrontmatter(t *testing.T) {
	input := "# Just Content\nNo frontmatter here."
	got := stripFrontmatter(input)
	if got != input {
		t.Errorf("content without frontmatter should be unchanged, got: %q", got)
	}
}

func TestStripFrontmatterOnlyOpening(t *testing.T) {
	input := "---\nname: test\nNo closing delimiter."
	got := stripFrontmatter(input)
	if got != input {
		t.Errorf("malformed frontmatter should return original, got: %q", got)
	}
}

func TestStripFrontmatterContentStartsWithDash(t *testing.T) {
	input := "---not frontmatter---\nSome content"
	got := stripFrontmatter(input)
	if got != input {
		t.Errorf("content that starts with --- but isn't frontmatter should be unchanged, got: %q", got)
	}
}

func TestStripFrontmatterEmptyBody(t *testing.T) {
	input := "---\nname: test\n---\n"
	got := stripFrontmatter(input)
	if got != "" {
		t.Errorf("expected empty string for empty body, got: %q", got)
	}
}

func TestPromptContentReturnsNonEmpty(t *testing.T) {
	content, err := PromptContent("business-requirements-interview")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(content) < 100 {
		t.Errorf("prompt content suspiciously short (%d chars)", len(content))
	}
	if strings.Contains(content, "---") && strings.Contains(content, "name:") {
		t.Error("frontmatter not stripped from prompt content")
	}
}

func TestPromptContentUnknownPrompt(t *testing.T) {
	_, err := PromptContent("nonexistent")
	if err == nil {
		t.Fatal("expected error for unknown prompt")
	}
}
