package prompt

import (
	"strings"
	"testing"
)

func TestStripFrontmatterWithValidFrontmatter(t *testing.T) {
	input := "---\nname: test\n---\n# Body\nContent here."
	got := StripFrontmatter(input)
	if strings.Contains(got, "---") {
		t.Errorf("frontmatter delimiters not stripped: %q", got)
	}
	if !strings.Contains(got, "# Body") {
		t.Errorf("body content missing: %q", got)
	}
}

func TestStripFrontmatterNoFrontmatter(t *testing.T) {
	input := "# Just Content\nNo frontmatter here."
	got := StripFrontmatter(input)
	if got != input {
		t.Errorf("content without frontmatter should be unchanged, got: %q", got)
	}
}

func TestStripFrontmatterOnlyOpening(t *testing.T) {
	input := "---\nname: test\nNo closing delimiter."
	got := StripFrontmatter(input)
	if got != input {
		t.Errorf("malformed frontmatter should return original, got: %q", got)
	}
}

func TestStripFrontmatterContentStartsWithDash(t *testing.T) {
	input := "---not frontmatter---\nSome content"
	got := StripFrontmatter(input)
	if got != input {
		t.Errorf("content starting with --- but not frontmatter unchanged, got: %q", got)
	}
}

func TestStripFrontmatterEmptyBody(t *testing.T) {
	input := "---\nname: test\n---\n"
	got := StripFrontmatter(input)
	if got != "" {
		t.Errorf("expected empty string for empty body, got: %q", got)
	}
}

func TestStripFrontmatterWindowsLineEndings(t *testing.T) {
	// StripFrontmatter requires Unix line endings (\n) for frontmatter delimiters.
	// Content with \r\n after opening --- is treated as invalid frontmatter.
	input := "---\r\nname: test\r\n---\r\n# Body"
	got := StripFrontmatter(input)
	// Should return unchanged because opening --- is not followed by \n
	if got != input {
		t.Errorf("expected unchanged input for CRLF line endings, got: %q", got)
	}
}

func TestStripFrontmatterMixedLineEndings(t *testing.T) {
	// Valid frontmatter with Unix line endings, but body may contain \r
	input := "---\nname: test\n---\n# Body\r\nMore content"
	got := StripFrontmatter(input)
	if strings.Contains(got, "---") {
		t.Errorf("frontmatter delimiters not stripped: %q", got)
	}
	if !strings.Contains(got, "# Body") {
		t.Errorf("body missing: %q", got)
	}
}

func TestStripFrontmatterMultipleDashes(t *testing.T) {
	input := "---\nname: test\n---\n# Body\n---\nMore dashes in body"
	got := StripFrontmatter(input)
	if !strings.Contains(got, "More dashes in body") {
		t.Errorf("body content with --- should be preserved: %q", got)
	}
}
