package prompt

import "strings"

// StripFrontmatter removes YAML frontmatter (---\n...\n---) from the
// beginning of content. Used by both runtime prompt loading and build-time
// skill embedding to ensure consistent frontmatter handling.
//
// Returns the content unchanged if no valid frontmatter is found.
func StripFrontmatter(content string) string {
	content = strings.TrimSpace(content)

	if !strings.HasPrefix(content, "---") {
		return content
	}

	rest := content[3:]
	if len(rest) > 0 && rest[0] != '\n' {
		return content
	}

	idx := strings.Index(rest, "\n---")
	if idx == -1 {
		return content
	}

	after := rest[idx+4:]
	if len(after) > 0 && after[0] != '\n' && after[0] != '\r' {
		return content
	}

	body := rest[idx+4:]
	return strings.TrimSpace(body)
}
