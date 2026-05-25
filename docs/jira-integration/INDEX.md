# Sherpy-to-Jira Documentation

Complete documentation for the sherpy-to-jira Jira Cloud sync tool.

## Getting Started

**Start here:** [README.md](./README.md)
- Quick start guide (5 minutes)
- Commands overview
- Common workflows
- Troubleshooting

## Documentation

### User Documentation

1. **[README.md](./README.md)** - Quick start guide and common usage patterns
   - Installation and setup
   - Basic workflow (init → setup → sync)
   - Configuration files
   - Error messages and troubleshooting

2. **[usage.md](./usage.md)** - Comprehensive usage guide
   - Detailed command reference
   - Configuration options
   - Environment variables
   - Advanced features (content hashing, dependency ordering)
   - Field mappings and conversions

### Technical Documentation

3. **[requirements.md](./requirements.md)** - Project requirements and design decisions
   - Technical approach
   - API design
   - Story points conversion tables
   - Issue type mappings
   - Error handling strategy

4. **[implementation/](./implementation/)** - Implementation details
   - [milestones.yaml](./implementation/milestones.yaml) - All milestones (M0-M5)
   - [tasks/](./implementation/tasks/) - Task breakdowns for each milestone
   - [implementation-plan-review.yaml](./implementation/implementation-plan-review.yaml) - Plan quality gates

5. **[M5-SUMMARY.md](./M5-SUMMARY.md)** - Latest milestone completion report
   - UX polish features (table view, progress indicators, error messages)
   - Test coverage and metrics
   - Breaking changes
   - Example outputs

## Quick Links

### Common Tasks

- **First time setup**: [README.md#quick-start](./README.md#quick-start)
- **Updating existing plan**: [README.md#update-existing-plan](./README.md#examples)
- **Troubleshooting auth**: [README.md#authentication-failed](./README.md#troubleshooting)
- **Understanding story points**: [README.md#story-points-conversion](./README.md#how-it-works)

### Technical Details

- **API endpoints**: [requirements.md#jira-rest-api-v3](./requirements.md)
- **Content hashing**: [usage.md#idempotent-sync](./usage.md)
- **Dependency ordering**: [requirements.md#dependency-ordering](./requirements.md)
- **Error enhancement**: [M5-SUMMARY.md#m5-003](./M5-SUMMARY.md)

## Project Status

- **Current Version**: M5 complete
- **Status**: ✅ Production ready
- **Test Coverage**: 79.4% (110 passing tests)
- **Features**: All core + polish features complete

### Milestone Summary

| Milestone | Name | Status | Deliverables |
|-----------|------|--------|--------------|
| M0 | Scaffolding & Config | ✅ Complete | CLI entry, config types, file discovery |
| M1 | Jira Client & Setup | ✅ Complete | HTTP client, auth, setup command |
| M2 | YAML Parsing & ADF | ✅ Complete | Parsers, ADF builder, story points |
| M3 | Sync Engine | ✅ Complete | Create/update logic, dependencies, links |
| M4 | Testing & Error Handling | ✅ Complete | E2E tests, error handling, edge cases |
| M5 | UX Polish | ✅ Complete | Table view, progress, enhanced errors |

## Contributing

See the main [Sherpy CLI README](../../README.md) for contribution guidelines.

## Support

For issues, questions, or feature requests:
1. Check [README.md#troubleshooting](./README.md#troubleshooting)
2. Review [usage.md](./usage.md) for detailed documentation
3. File an issue on the main Sherpy CLI repository
