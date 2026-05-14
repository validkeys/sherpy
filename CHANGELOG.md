# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- New `sherpy prompt` command for outputting skill instructions to stdout
- `sherpy prompt --list` flag to list all available prompts
- `sherpy prompt -t <type>` flag to output specific prompt content
- Embedded prompt content in binary via go:generate (12 pipeline skills)
- New skill: `sherpy-cli-planner` for orchestrating planning workflow via CLI
- Token-efficient planning workflow: 80K tokens vs 720K (90% reduction)
- Integration tests for prompt command functionality
- Comprehensive test suite for frontmatter stripping
- Build-time filtering of non-pipeline skills

### Changed
- Updated Makefile with `generate` target for go:generate workflow
- Updated README.md with prompt command usage examples
- Updated USAGE.md with token efficiency rationale and calculation
- Extracted `stripFrontmatter` to shared utility in `prompt/frontmatter.go`
- Improved test output by filtering orphaned prompt warnings

### Fixed
- Removed accidentally committed sherpy binary from repository (6.3MB)
- Eliminated code duplication in prompt package
- Fixed orphaned prompt warnings in test output
- Updated repository references from kydavis/sherpy to validkeys/sherpy

### Technical Details
- **Prompt Registry:** 12 pipeline step prompts (gap-analysis through executive-summary)
- **Build Process:** go:generate embeds skills at build time
- **Security:** Frontmatter stripped at build time (not runtime)
- **Testing:** 18 new tests across unit and integration layers

## [0.1.0] - 2025-XX-XX (Previous Release)

### Added
- Initial release with validate, to-markdown, and types commands
- Schema validation for 7 document types
- Markdown conversion functionality
- Integration tests for CLI commands

[Unreleased]: https://github.com/validkeys/sherpy/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/validkeys/sherpy/releases/tag/v0.1.0
