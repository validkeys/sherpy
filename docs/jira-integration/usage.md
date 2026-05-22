# Sherpy-to-Jira Usage Guide

## Overview

`sherpy-to-jira` is a CLI tool that synchronizes Sherpy planning documents (developer summary, milestones, tasks, timeline) to Jira Cloud. It creates and maintains an Epic with linked Stories (milestones) and Sub-tasks (tasks), preserving dependencies and timelines.

## Prerequisites

- Go 1.21+ (for building from source)
- Jira Cloud account with API access
- Jira API token (from https://id.atlassian.com/manage-profile/security/api-tokens)

## Installation

### Build from source

```bash
make sherpy-to-jira
```

This creates a `sherpy-to-jira` binary in the project root.

### Install globally

```bash
# Copy to PATH
sudo cp sherpy-to-jira /usr/local/bin/
```

## Quick Start

1. **Navigate to your Sherpy project**

   ```bash
   cd /path/to/your/sherpy/project
   ```

2. **Initialize Jira configuration**

   ```bash
   sherpy-to-jira init
   ```

   This discovers your Sherpy files and creates `sherpy-jira.yaml`.

3. **Set environment variables**

   ```bash
   export JIRA_EMAIL="your-email@company.com"
   export JIRA_TOKEN="your-jira-api-token"
   ```

4. **Run setup**

   ```bash
   sherpy-to-jira setup
   ```

   This creates a Jira project and discovers issue types (Epic, Story, Sub-task).

5. **Sync your plan to Jira**

   ```bash
   sherpy-to-jira sync
   ```

   Or run a dry-run first:

   ```bash
   sherpy-to-jira sync --dry-run
   ```

6. **Check sync status**

   ```bash
   sherpy-to-jira status
   ```

## Commands

### `init`

Discovers Sherpy source documents and generates `sherpy-jira.yaml` configuration.

```bash
sherpy-to-jira init
```

**What it does:**
- Looks for `developer-summary.md`, `milestones.yaml`, `tasks/`, `timeline.yaml`
- Extracts project name and generates a Jira project key
- Creates `sherpy-jira.yaml` with relative paths

**Output:** `sherpy-jira.yaml`

### `setup`

Creates a Jira project and discovers issue types.

```bash
sherpy-to-jira setup
```

**Interactive prompts:**
- Jira domain (e.g., `mycompany.atlassian.net`)
- Project key (e.g., `SHERPY`)
- Project name (e.g., `Sherpy PM Tool`)

**What it does:**
- Tests Jira API authentication
- Creates a new Jira project (or uses existing)
- Discovers Epic, Story, and Sub-task issue type IDs
- Saves global config to `~/.config/sherpy-to-jira/config.yaml`
- Updates `sherpy-jira.yaml` with project info

**Prerequisites:** `JIRA_EMAIL` and `JIRA_TOKEN` environment variables must be set.

### `sync`

Synchronizes Sherpy planning documents to Jira.

```bash
sherpy-to-jira sync [--dry-run]
```

**Options:**
- `--dry-run`: Preview changes without making API calls

**What it does:**
- Reads Sherpy files (developer summary, milestones, tasks, timeline)
- Creates Epic from developer summary
- Creates Stories for each milestone
- Creates Sub-tasks for each task (parented to milestone Stories)
- Creates "Blocks" links for dependencies
- Sets story points based on estimates
- Sets due dates from timeline
- Updates existing issues if content changed (based on content hashing)
- Skips unchanged issues (idempotent)

**Output:**
- Summary of created/updated/skipped issues
- `sherpy-jira-sync-state.yaml` (tracks Jira keys and content hashes)

### `status`

Displays a summary of the current sync state.

```bash
sherpy-to-jira status
```

**Output:**
- Project key and ID
- Epic key
- Last sync timestamp
- Count of milestones synced
- Count of tasks synced
- Count of dependency links created

## Configuration Files

### `sherpy-jira.yaml` (Project Config)

Located in your Sherpy project root. Created by `init`, updated by `setup`.

```yaml
project_key: SHERPY
project_name: Sherpy PM Tool
developer_summary: developer-summary.md
milestones: milestones.yaml
tasks_dir: tasks
timeline: timeline.yaml
sync_state: sherpy-jira-sync-state.yaml
```

**Fields:**
- `project_key`: Jira project key (e.g., `SHERPY`)
- `project_name`: Human-readable project name
- `developer_summary`: Path to developer summary markdown
- `milestones`: Path to milestones YAML
- `tasks_dir`: Path to tasks directory
- `timeline`: Path to timeline YAML (optional)
- `sync_state`: Path to sync state file

### `~/.config/sherpy-to-jira/config.yaml` (Global Config)

Created by `setup`. Stores Jira instance metadata shared across projects.

```yaml
jira:
  domain: https://mycompany.atlassian.net
  issue_types:
    epic: "10000"
    story: "10001"
    sub_task: "10002"
```

**Fields:**
- `jira.domain`: Jira Cloud URL
- `jira.issue_types.epic`: Issue type ID for Epics
- `jira.issue_types.story`: Issue type ID for Stories
- `jira.issue_types.sub_task`: Issue type ID for Sub-tasks

### `sherpy-jira-sync-state.yaml` (Sync State)

Automatically created by `sync`. Tracks which Sherpy entities have been synced to Jira.

```yaml
version: "1.0"
project_key: SHERPY
project_id: "10000"
last_sync: "2026-05-22T10:30:00Z"
epic:
  jira_key: SHERPY-1
  jira_id: "10001"
  content_hash: abc123...
milestones:
  m0:
    jira_key: SHERPY-2
    jira_id: "10002"
    content_hash: def456...
tasks:
  m0-001:
    jira_key: SHERPY-3
    jira_id: "10003"
    content_hash: ghi789...
links:
  - outward: SHERPY-3
    inward: SHERPY-2
    type: Blocks
```

**Do not edit this file manually.** It is managed by `sherpy-to-jira sync`.

## Environment Variables

### `JIRA_EMAIL` (Required)

Your Jira account email address.

```bash
export JIRA_EMAIL="you@company.com"
```

### `JIRA_TOKEN` (Required)

Your Jira API token. Generate at: https://id.atlassian.com/manage-profile/security/api-tokens

```bash
export JIRA_TOKEN="ATBBxxxxxxxxxxxxxxxxxx"
```

**Security note:** Never commit your API token to version control. Use environment variables or a secure secrets manager.

## Common Workflows

### First-time sync

```bash
cd /path/to/sherpy/project
sherpy-to-jira init
export JIRA_EMAIL="you@company.com"
export JIRA_TOKEN="your-token"
sherpy-to-jira setup
sherpy-to-jira sync --dry-run  # Preview
sherpy-to-jira sync             # Execute
sherpy-to-jira status           # Verify
```

### Incremental sync (after updating Sherpy files)

```bash
# Edit milestones.yaml or tasks/*.yaml
sherpy-to-jira sync --dry-run  # Preview changes
sherpy-to-jira sync             # Push updates
```

**Behavior:**
- Changed issues are updated
- Unchanged issues are skipped
- New milestones/tasks are created
- Dependencies are preserved

### Dry-run mode

Preview what `sync` will do without making any Jira API calls:

```bash
sherpy-to-jira sync --dry-run
```

**Output format:**
```
=== DRY RUN ===
CREATE Epic    SHERPY-?   Sherpy PM Tool
CREATE Story   SHERPY-?   M0: Project Setup (3 SP)
CREATE Sub-task SHERPY-?  Task 1: Initialize repo (1 SP) [config]
UPDATE Story   SHERPY-2   M1: Core Features (5 SP)
SKIP   Sub-task SHERPY-4  Task 2: Build API
LINK   SHERPY-3 Blocks SHERPY-2
```

### Check what's synced

```bash
sherpy-to-jira status
```

**Example output:**
```
Project: SHERPY (ID: 10000)
Epic: SHERPY-1
Last sync: 2026-05-22T10:30:00Z
Milestones synced: 3
Tasks synced: 12
Links created: 4
```

### Sync multiple Sherpy projects

Each Sherpy project has its own `sherpy-jira.yaml` and `sherpy-jira-sync-state.yaml`. The global config (`~/.config/sherpy-to-jira/config.yaml`) is shared.

```bash
cd /path/to/project-a
sherpy-to-jira init
sherpy-to-jira setup  # Creates PROJECT-A in Jira
sherpy-to-jira sync

cd /path/to/project-b
sherpy-to-jira init
sherpy-to-jira setup  # Creates PROJECT-B in Jira
sherpy-to-jira sync
```

## Issue Mapping

| Sherpy Entity       | Jira Issue Type | Parent       | Description Source         |
|---------------------|-----------------|--------------|----------------------------|
| Developer Summary   | Epic            | None         | Title + overview sections  |
| Milestone           | Story           | Epic         | name + description         |
| Task                | Sub-task        | Story        | name + description         |
| Milestone→Milestone | Blocks link     | N/A          | dependencies field         |
| Task→Task           | Blocks link     | N/A          | dependencies field         |

## Story Points

Story points are calculated from `estimate_minutes`:

- Tasks: `ceiling(estimate_minutes / 60)` (capped at 13)
- Milestones: sum of task story points

Example:
- 30 minutes → 1 SP
- 90 minutes → 2 SP
- 180 minutes → 3 SP

## Due Dates

Due dates for Stories (milestones) are set from `timeline.yaml` if present:

```yaml
workback:
  schedule:
    - milestone: m0
      end_date: "2026-06-15"
```

Maps to `duedate` field on the Story.

## Limitations

- **One Epic per project**: The tool creates one Epic per Sherpy project. All milestones are Stories under this Epic.
- **Idempotent by content hash**: Updates are detected by hashing the issue content (summary + description + story points). If you manually edit a Jira issue, the next sync may overwrite it.
- **No issue deletion**: The tool never deletes Jira issues. If you remove a milestone/task from Sherpy, the Jira issue remains.
- **Jira Cloud only**: This tool uses the Jira Cloud REST API. Jira Server/Data Center are not supported.
- **Requires unique milestone/task IDs**: Milestone IDs (e.g., `m0`) and task IDs (e.g., `m0-001`) must be unique across the project.

## Troubleshooting

### Error: "JIRA_EMAIL and JIRA_TOKEN environment variables must be set"

Set the required environment variables:

```bash
export JIRA_EMAIL="your-email@company.com"
export JIRA_TOKEN="your-api-token"
```

### Error: "failed to read sherpy-jira.yaml"

Run `sherpy-to-jira init` to create the config file.

### Error: "failed to authenticate with Jira"

- Verify your `JIRA_EMAIL` matches your Jira account email
- Verify your `JIRA_TOKEN` is valid (generate a new one if needed)
- Check that your Jira domain is correct in `~/.config/sherpy-to-jira/config.yaml`

### Error: "epic must be created before syncing milestones"

The Epic wasn't created in a previous sync. This can happen if:
- The sync was interrupted
- The Epic creation failed

**Solution:** Delete `sherpy-jira-sync-state.yaml` and re-run `sync`.

### Error: "circular dependency detected"

Your milestones or tasks have a circular dependency (A depends on B, B depends on A). Fix the dependencies in your YAML files.

### Sync creates duplicate issues

If you see duplicate issues in Jira, your `sherpy-jira-sync-state.yaml` may be out of sync. To reset:

```bash
rm sherpy-jira-sync-state.yaml
sherpy-to-jira sync
```

This will create a fresh sync (skipping existing issues based on summary matching).

## Advanced Usage

### Custom sync state location

Override the sync state path in `sherpy-jira.yaml`:

```yaml
sync_state: .sherpy/jira-sync-state.yaml
```

### Multiple Jira instances

You can maintain separate global configs per Jira instance:

```bash
# Development Jira
sherpy-to-jira setup --config ~/.config/sherpy-to-jira/dev-config.yaml

# Production Jira
sherpy-to-jira setup --config ~/.config/sherpy-to-jira/prod-config.yaml
```

Then pass `--config` to subsequent commands:

```bash
sherpy-to-jira sync --config ~/.config/sherpy-to-jira/prod-config.yaml
```

## Testing

Run the full test suite:

```bash
make test-jira
```

Run a specific test:

```bash
go test ./jira/... -run TestE2E_SyncCreatesAllIssues -v
```

## Development

Build the binary:

```bash
make sherpy-to-jira
```

Run tests:

```bash
go test ./jira/... -v
```

Run quality checks:

```bash
go vet ./jira/...
```

## Support

For issues or questions:
- File an issue: https://github.com/kydavis/sherpy/issues
- Documentation: `/workspace/docs/jira-integration/`
