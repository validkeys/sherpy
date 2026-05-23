# Sherpy-to-Jira

Sync your Sherpy planning documents to Jira Cloud automatically.

## What It Does

Converts Sherpy YAML plans into Jira issues:
- **Developer Summary** → Epic
- **Milestones** → Stories (parented to Epic)
- **Tasks** → Sub-tasks (parented to Stories)
- **Dependencies** → "Blocks" links
- **Timeline** → Due dates
- **Estimates** → Story points (Fibonacci scale)

## Quick Start

### 1. Build the Tool

```bash
make sherpy-to-jira
```

This creates a `sherpy-to-jira` binary in the project root.

### 2. Set Credentials

Get your Jira API token from https://id.atlassian.com/manage-profile/security/api-tokens

```bash
export JIRA_EMAIL="your-email@company.com"
export JIRA_TOKEN="your-jira-api-token"
```

### 3. Navigate to Your Sherpy Project

```bash
cd /path/to/your/sherpy/project
```

Your project should have:
- `developer-summary.md`
- `milestones.yaml`
- `tasks/milestone-m*.tasks.yaml`
- `timeline.yaml` (optional)

### 4. Initialize Configuration

```bash
sherpy-to-jira init
```

Creates `sherpy-jira.yaml` in your project directory.

### 5. Setup Jira Project

```bash
sherpy-to-jira setup
```

This will:
- Test your credentials
- Prompt for project key (e.g., "SHERPY")
- Prompt for project name (e.g., "Sherpy PM Tool")
- Create the Jira project
- Discover issue type IDs
- Save configuration to `~/.config/sherpy-to-jira/config.yaml`

### 6. Sync to Jira

Preview changes first:

```bash
sherpy-to-jira sync --dry-run
```

Output shows a table of planned changes:
```
=== DRY RUN - Planned Changes ===

OPERATION  TYPE       KEY         SP   SUMMARY
--------------------------------------------------------------------------------
CREATE     Epic       SHERPY-?    -    Sherpy-to-Jira Integration
CREATE     Story      SHERPY-?    5      M1: Jira Client & Setup
CREATE     Sub-task   SHERPY-?    2        Implement HTTP client [code]
UPDATE     Sub-task   SHERPY-10   1        Add retry logic [code]
```

Push changes to Jira:

```bash
sherpy-to-jira sync
```

Shows progress:
```
Creating Epic...
Creating Story 1/4...
Creating Story 2/4...
Creating Sub-task 1/12...
...
```

### 7. Check Status

```bash
sherpy-to-jira status
```

Shows sync state summary.

## How It Works

### Idempotent Sync
Running `sync` multiple times is safe. It uses content hashing to detect changes:
- **CREATE** - New milestones/tasks
- **UPDATE** - Changed content
- **SKIP** - Unchanged issues

State tracked in `sherpy-jira-sync-state.yaml`.

### Story Points Conversion

Estimates convert to Fibonacci story points:

| Estimate | Story Points |
|----------|--------------|
| 0-30 min | 1 |
| 31-60 min | 2 |
| 61-120 min | 3 |
| 121-240 min | 5 |
| 241+ min | 8 |

For milestones (in days):

| Duration | Story Points |
|----------|--------------|
| < 1 day | 1 |
| 1-2 days | 3 |
| 3-5 days | 5 |
| 6-10 days | 8 |
| 11-20 days | 13 |
| 21+ days | 21 |

### Dependency Links

Dependencies in `milestones.yaml` and task files create "Blocks" links in Jira.

Example:
```yaml
dependencies: [m0]  # This milestone blocks m0
```

Creates: `SHERPY-2 blocks SHERPY-1`

### Issue Hierarchy

```
Epic (Project)
├── Story (Milestone 0)
│   ├── Sub-task (Task 001)
│   └── Sub-task (Task 002)
└── Story (Milestone 1)
    └── Sub-task (Task 001)
```

## Commands

### `init`
Discovers Sherpy files and generates `sherpy-jira.yaml`.

```bash
sherpy-to-jira init
```

### `setup`
Creates Jira project and discovers issue types.

```bash
sherpy-to-jira setup
```

Interactive prompts for project key/name.

### `sync`
Pushes Sherpy documents to Jira.

```bash
sherpy-to-jira sync [--dry-run]
```

Use `--dry-run` to preview without making changes.

### `status`
Shows current sync state.

```bash
sherpy-to-jira status
```

## Configuration Files

### `sherpy-jira.yaml` (Project)
Located in your Sherpy project root.

```yaml
project_key: SHERPY
project_name: Sherpy PM Tool
developer_summary: developer-summary.md
milestones: milestones.yaml
tasks_dir: tasks
timeline: timeline.yaml
sync_state: sherpy-jira-sync-state.yaml
```

### `~/.config/sherpy-to-jira/config.yaml` (Global)
Stores Jira instance metadata.

```yaml
jira:
  domain: https://mycompany.atlassian.net
  issue_types:
    epic: "10000"
    story: "10001"
    sub_task: "10002"
```

### `sherpy-jira-sync-state.yaml` (Auto-generated)
Tracks synced issues. **Do not edit manually.**

## Error Messages

The tool provides actionable guidance for common errors:

**Auth Error (401):**
```
💡 Authentication failed. Please check:
   • JIRA_EMAIL is set to your Atlassian account email
   • JIRA_TOKEN is a valid API token from https://id.atlassian.com/manage-profile/security/api-tokens
   • Your token hasn't expired or been revoked
```

**Missing Config:**
```
💡 Local config not found. Run:
   sherpy-to-jira init
```

**Network Error:**
```
💡 Network error. Please check:
   • Your internet connection is working
   • The Jira domain in ~/.sherpy-jira-global.yaml is correct
   • Your firewall/proxy isn't blocking Jira API access
```

## Troubleshooting

### "Authentication failed"
1. Verify `JIRA_EMAIL` is your Atlassian account email
2. Create a new API token at https://id.atlassian.com/manage-profile/security/api-tokens
3. Set `JIRA_TOKEN` environment variable

### "Project not found"
1. Run `sherpy-to-jira setup` to create the project
2. Verify project key in `sherpy-jira.yaml`

### "Issue type not found"
1. Run `sherpy-to-jira setup` to refresh issue type IDs
2. Check that your Jira project supports Epic, Story, and Sub-task types

### "Rate limit exceeded"
The tool automatically retries with exponential backoff. Wait a few moments.

### "Story points field error"
Your Jira instance might use a different custom field ID. Default is `customfield_10016`.

## Examples

### Simple Workflow
```bash
# One-time setup
cd my-project
sherpy-to-jira init
sherpy-to-jira setup

# Regular workflow
sherpy-to-jira sync --dry-run  # Preview
sherpy-to-jira sync            # Execute
sherpy-to-jira status          # Verify
```

### Update Existing Plan
After editing Sherpy files:

```bash
sherpy-to-jira sync --dry-run  # See what changed
sherpy-to-jira sync            # Push updates
```

Only changed issues are updated (idempotent).

## Requirements

- Go 1.21+ (for building)
- Jira Cloud account
- Jira API token
- Sherpy planning documents

## Documentation

- **Full Usage Guide**: [usage.md](./usage.md)
- **Requirements**: [requirements.md](./requirements.md)
- **Implementation Details**: [implementation/](./implementation/)

## Features

✅ Idempotent sync (safe to run multiple times)
✅ Content hashing (only updates changed issues)
✅ Dependency ordering (respects milestone/task dependencies)
✅ Retry logic (handles rate limits and transient errors)
✅ Dry-run mode (preview changes)
✅ Progress indicators (shows sync progress)
✅ Enhanced error messages (actionable guidance)
✅ Story points conversion (time → Fibonacci)
✅ Timeline integration (due dates)
✅ Comprehensive testing (110+ tests, 79% coverage)

## Contributing

The sherpy-to-jira tool is part of the Sherpy CLI project. See the main [README](../../README.md) for contribution guidelines.

## License

Same as parent Sherpy CLI project.
