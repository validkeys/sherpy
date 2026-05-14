package prompt

import (
	"fmt"
	"sort"
	"strings"
	"sync"
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

func TestPromptContentNoFrontmatter(t *testing.T) {
	content, err := PromptContent("business-requirements-interview")
	if err != nil {
		t.Fatalf("Failed to get prompt content: %v", err)
	}

	// Content should NOT have frontmatter markers
	if strings.HasPrefix(content, "---\nname:") {
		t.Error("Content still contains frontmatter - should be stripped at build time")
	}

	// Content should have actual prompt text
	if len(content) < 100 {
		t.Errorf("Content suspiciously short: %d bytes", len(content))
	}
}

func TestPromptContentUnknownPrompt(t *testing.T) {
	_, err := PromptContent("nonexistent")
	if err == nil {
		t.Fatal("expected error for unknown prompt")
	}
}

func TestValidationDetectsMissingContent(t *testing.T) {
	// Simulate registry with entry that has no content
	testRegistry := map[string]Prompt{
		"existing": {Name: "existing", Description: "Exists"},
		"missing":  {Name: "missing", Description: "Missing content"},
	}

	testContent := map[string]string{
		"existing": "Some content here",
		// "missing" is not in content map
	}

	// Check for missing
	var missing []string
	for name := range testRegistry {
		if body, ok := testContent[name]; !ok {
			missing = append(missing, name)
		} else if len(body) == 0 {
			missing = append(missing, name+" (empty)")
		}
	}

	if len(missing) == 0 {
		t.Error("Expected to detect missing content")
	}

	if !contains(missing, "missing") {
		t.Errorf("Expected 'missing' in missing list, got: %v", missing)
	}
}

func TestValidationDetectsOrphanedContent(t *testing.T) {
	// Test detection of content without registry entry
	testRegistry := map[string]Prompt{
		"registered": {Name: "registered", Description: "Registered"},
	}

	testContent := map[string]string{
		"registered": "Content for registered",
		"orphaned":   "Content without registry entry",
	}

	// Check for orphaned
	var orphaned []string
	for name := range testContent {
		if _, ok := testRegistry[name]; !ok {
			orphaned = append(orphaned, name)
		}
	}

	if len(orphaned) == 0 {
		t.Error("Expected to detect orphaned content")
	}

	if !contains(orphaned, "orphaned") {
		t.Errorf("Expected 'orphaned' in orphaned list, got: %v", orphaned)
	}
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

func TestPromptContentConcurrentSafety(t *testing.T) {
	// Verify no race conditions under high concurrency
	const goroutines = 100
	const iterations = 1000

	prompts := []string{
		"business-requirements-interview",
		"technical-requirements-interview",
		"implementation-planner",
		"qa-test-plan",
	}

	var wg sync.WaitGroup
	errors := make(chan error, goroutines)

	for g := 0; g < goroutines; g++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			for i := 0; i < iterations; i++ {
				name := prompts[(id+i)%len(prompts)]
				content, err := PromptContent(name)
				if err != nil {
					errors <- fmt.Errorf("goroutine %d iteration %d: %w", id, i, err)
					return
				}
				if len(content) == 0 {
					errors <- fmt.Errorf("goroutine %d iteration %d: empty content for %s", id, i, name)
					return
				}
			}
		}(g)
	}

	wg.Wait()
	close(errors)

	for err := range errors {
		t.Error(err)
	}
}

func BenchmarkPromptContentSequential(b *testing.B) {
	prompts := []string{
		"business-requirements-interview",
		"technical-requirements-interview",
		"implementation-planner",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		name := prompts[i%len(prompts)]
		_, err := PromptContent(name)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkPromptContentConcurrent(b *testing.B) {
	prompts := []string{
		"business-requirements-interview",
		"technical-requirements-interview",
		"implementation-planner",
		"qa-test-plan",
		"delivery-timeline",
	}

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		i := 0
		for pb.Next() {
			name := prompts[i%len(prompts)]
			_, err := PromptContent(name)
			if err != nil {
				b.Error(err)
			}
			i++
		}
	})
}
