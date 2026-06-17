package spec

import (
	"fmt"
	"sort"
	"strings"
	"sync"
	"testing"
)

func TestRegisteredSpecsSorted(t *testing.T) {
	specs := RegisteredSpecs()
	if len(specs) == 0 {
		t.Fatal("expected at least one registered spec")
	}

	names := make([]string, len(specs))
	for i, s := range specs {
		names[i] = s.Name
	}

	if !sort.StringsAreSorted(names) {
		t.Errorf("specs not sorted: %v", names)
	}
}

func TestResolveSpecFound(t *testing.T) {
	_, err := ResolveSpec("business-requirements")
	if err != nil {
		t.Errorf("expected to resolve known spec, got: %v", err)
	}
}

func TestResolveSpecNotFound(t *testing.T) {
	_, err := ResolveSpec("nonexistent-spec")
	if err == nil {
		t.Fatal("expected error for unknown spec")
	}
	if !strings.Contains(err.Error(), "unknown document type") {
		t.Errorf("expected 'unknown document type' error, got: %v", err)
	}
}

func TestRegisteredSpecsContainsAll(t *testing.T) {
	specs := RegisteredSpecs()
	names := make(map[string]bool)
	for _, s := range specs {
		names[s.Name] = true
	}

	expected := []string{
		"business-requirements",
		"technical-requirements",
		"milestones",
		"milestone-tasks",
		"timeline",
		"qa-test-plan",
		"gap-analysis",
	}

	for _, name := range expected {
		if !names[name] {
			t.Errorf("missing expected spec: %s", name)
		}
	}
}

func TestSpecContentReturnsNonEmpty(t *testing.T) {
	content, err := SpecContent("business-requirements")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(content) < 100 {
		t.Errorf("spec content suspiciously short (%d chars)", len(content))
	}
}

func TestSpecContentHasMarkdownHeader(t *testing.T) {
	content, err := SpecContent("milestones")
	if err != nil {
		t.Fatalf("Failed to get spec content: %v", err)
	}

	if !strings.HasPrefix(content, "# ") {
		t.Errorf("expected spec content to start with a markdown header")
	}

	if len(content) < 100 {
		t.Errorf("Content suspiciously short: %d bytes", len(content))
	}
}

func TestSpecContentUnknownSpec(t *testing.T) {
	_, err := SpecContent("nonexistent")
	if err == nil {
		t.Fatal("expected error for unknown spec")
	}
}

func TestSpecContentAllTypes(t *testing.T) {
	specs := RegisteredSpecs()
	for _, s := range specs {
		t.Run(s.Name, func(t *testing.T) {
			content, err := SpecContent(s.Name)
			if err != nil {
				t.Fatalf("unexpected error for %s: %v", s.Name, err)
			}
			if len(content) < 100 {
				t.Errorf("content for %s suspiciously short (%d bytes)", s.Name, len(content))
			}
		})
	}
}

func TestValidationDetectsMissingContent(t *testing.T) {
	testRegistry := map[string]Spec{
		"existing": {Name: "existing", Description: "Exists"},
		"missing":  {Name: "missing", Description: "Missing content"},
	}

	testContent := map[string]string{
		"existing": "Some content here",
	}

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
	testRegistry := map[string]Spec{
		"registered": {Name: "registered", Description: "Registered"},
	}

	testContent := map[string]string{
		"registered": "Content for registered",
		"orphaned":   "Content without registry entry",
	}

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

func TestSpecContentConcurrentSafety(t *testing.T) {
	const goroutines = 100
	const iterations = 1000

	specs := []string{
		"business-requirements",
		"technical-requirements",
		"milestones",
		"qa-test-plan",
	}

	var wg sync.WaitGroup
	errors := make(chan error, goroutines)

	for g := 0; g < goroutines; g++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			for i := 0; i < iterations; i++ {
				name := specs[(id+i)%len(specs)]
				content, err := SpecContent(name)
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

func BenchmarkSpecContentSequential(b *testing.B) {
	specs := []string{
		"business-requirements",
		"technical-requirements",
		"milestones",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		name := specs[i%len(specs)]
		_, err := SpecContent(name)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkSpecContentConcurrent(b *testing.B) {
	specs := []string{
		"business-requirements",
		"technical-requirements",
		"milestones",
		"qa-test-plan",
		"timeline",
	}

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		i := 0
		for pb.Next() {
			name := specs[i%len(specs)]
			_, err := SpecContent(name)
			if err != nil {
				b.Error(err)
			}
			i++
		}
	})
}
