package schema

import (
	"testing"
)

func TestRegistryListsAllTypes(t *testing.T) {
	types := RegisteredTypes()
	expected := []string{
		"business-requirements",
		"technical-requirements",
		"milestones",
		"milestone-tasks",
		"timeline",
		"qa-test-plan",
		"gap-analysis",
	}

	if len(types) != len(expected) {
		t.Fatalf("expected %d types, got %d", len(expected), len(types))
	}

	for _, e := range expected {
		found := false
		for _, typ := range types {
			if typ == e {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("expected type %q not found in registry", e)
		}
	}
}

func TestRegistryReturnsFilePattern(t *testing.T) {
	tests := []struct {
		typeName string
		pattern  string
	}{
		{"business-requirements", "business-requirements.yaml"},
		{"technical-requirements", "technical-requirements.yaml"},
		{"milestones", "milestones.yaml"},
		{"milestone-tasks", "milestone-m*.tasks.yaml"},
		{"timeline", "timeline.yaml"},
		{"qa-test-plan", "qa-test-plan.yaml"},
		{"gap-analysis", "gap-analysis-worksheet.yaml"},
	}

	for _, tt := range tests {
		pattern, ok := FilePattern(tt.typeName)
		if !ok {
			t.Errorf("FilePattern(%q) returned false", tt.typeName)
			continue
		}
		if pattern != tt.pattern {
			t.Errorf("FilePattern(%q) = %q, want %q", tt.typeName, pattern, tt.pattern)
		}
	}
}

func TestRegistryFilePatternUnknown(t *testing.T) {
	_, ok := FilePattern("unknown-type")
	if ok {
		t.Error("expected false for unknown type")
	}
}

func TestRegistryResolveTypeByName(t *testing.T) {
	tests := []struct {
		typeName string
		ok       bool
	}{
		{"business-requirements", true},
		{"technical-requirements", true},
		{"milestones", true},
		{"milestone-tasks", true},
		{"timeline", true},
		{"qa-test-plan", true},
		{"gap-analysis", true},
		{"unknown", false},
		{"", false},
	}

	for _, tt := range tests {
		_, err := ResolveValidator(tt.typeName)
		if tt.ok && err != nil {
			t.Errorf("ResolveValidator(%q) returned error: %v", tt.typeName, err)
		}
		if !tt.ok && err == nil {
			t.Errorf("ResolveValidator(%q) expected error, got nil", tt.typeName)
		}
	}
}

func TestRegistryResolveTypeByFilename(t *testing.T) {
	tests := []struct {
		filename string
		want     string
		ok       bool
	}{
		{"business-requirements.yaml", "business-requirements", true},
		{"technical-requirements.yaml", "technical-requirements", true},
		{"milestones.yaml", "milestones", true},
		{"milestone-m0.tasks.yaml", "milestone-tasks", true},
		{"milestone-m3.tasks.yaml", "milestone-tasks", true},
		{"timeline.yaml", "timeline", true},
		{"qa-test-plan.yaml", "qa-test-plan", true},
		{"gap-analysis-worksheet.yaml", "gap-analysis", true},
		{"random.yaml", "", false},
		{"", "", false},
	}

	for _, tt := range tests {
		got, ok := DetectType(tt.filename)
		if ok != tt.ok {
			t.Errorf("DetectType(%q) ok = %v, want %v", tt.filename, ok, tt.ok)
		}
		if got != tt.want {
			t.Errorf("DetectType(%q) = %q, want %q", tt.filename, got, tt.want)
		}
	}
}
