# Jira Integration — Requirements & Design Specification

## Overview

A standalone Go CLI tool (`sherpy-to-jira`) that reads Sherpy planning YAML files (milestones, tasks, timeline, developer summary) and pushes them to Jira Cloud as a structured set of issues. The tool creates a Kanban software project, maps the developer summary to an Epic, milestones to Stories (parented to the Epic), and tasks to Sub-tasks (parented to their milestone's Story). It maintains a sync state file for incremental updates.

The binary lives at `cmd/sherpy-to-jira/main.go` within the sherpy Go module and uses the same dependencies (cobra, yaml.v3).

## Source Documents

| Document | Purpose | Fields Used |
|---|---|---|
| `developer-summary.md` | Project overview (top-level Epic) | `title`, `content` (full summary text) |
| `milestones.yaml` | Milestone definitions | `id`, `name`, `description`, `dependencies`, `estimated_duration`, `success_criteria`, `tasks_file` |
| `milestone-m*.tasks.yaml` | Per-milestone task breakdowns | `id`, `name`, `description`, `estimate_minutes`, `type`, `dependencies` |
| `timeline.yaml` | Calendar dates for milestones | `start_date`, `completion_date` (from `workback.schedule` entries with `type: milestone`) |

## Jira Environment

- **Edition**: Jira Cloud (`*.atlassian.net`)
- **Project template**: Software development (Kanban board)
- **Authentication**: Basic auth (email + API token via `JIRA_EMAIL` / `JIRA_TOKEN` env vars)
- **API version**: REST API v3

## Issue Type Mapping

| YAML Entity | Jira Issue Type | Parent |
|---|---|---|
| Developer Summary (`developer-summary.md`) | Epic | None (top-level) |
| Milestone (`milestones.yaml` entry) | Story | Developer Summary's Epic |
| Task (`milestone-m*.tasks.yaml` entry) | Sub-task | Parent milestone's Story |

The YAML `task.type` field (`code`, `test`, `config`, `code-review`, `docs`) is applied as a **Jira label** rather than a distinct issue type. All tasks use the Sub-task type uniformly.

Milestones receive labels in the format `milestone:{id}` (e.g., `milestone:m0`).

The Developer Summary is treated as a single Epic per Sherpy plan output. All milestone Stories are parented to this Epic, giving stakeholders a top-level view of the entire project.

## Field Mapping

### Developer Summary → Epic

| YAML Field | Jira Field | Notes |
|---|---|---|
| `title` | `summary` | Project name from developer summary (first `# ` heading) |
| `content` | `description` | Full developer summary content, converted to ADF |
| — | `labels` | `sherpy-project` label applied automatically |

The Epic has no story points. It serves as a container for all milestone Stories in the plan.

### Milestone → Story

| YAML Field | Jira Field | Notes |
|---|---|---|
| — | `parent` | Set to the Epic's Jira key |
| `name` | `summary` | Direct string |
| `description` | `description` | Converted to Atlassian Document Format (ADF) |
| `success_criteria` | `description` (appended section) | ADF block with checklist items |
| `estimated_duration` | Story points | Parsed from range string (e.g., "3-4 days" → 21 SP) |
| `id` | `labels` | `milestone:m0`, `milestone:m1`, etc. |
| `dependencies` | Issue links | "Blocks" link type |
| Timeline `completion_date` | `duedate` | From `workback.schedule` matching milestone ID |

### Task → Sub-task

| YAML Field | Jira Field | Notes |
|---|---|---|
| `name` | `summary` | Direct string |
| `description` | `description` | Converted to ADF |
| `estimate_minutes` | Story points | Converted to Fibonacci SP |
| `type` | `labels` | Direct label (e.g., `code`, `test`) |
| `dependencies` | Issue links | "Blocks" link type between sub-tasks |

### Story Point Conversion

**Tasks**: `estimate_minutes / 60` rounded to the nearest Fibonacci number (1, 2, 3, 5, 8, 13).

Conversion table:

| estimate_minutes | Story Points |
|---|---|
| 0–30 | 1 |
| 31–60 | 1 |
| 61–90 | 2 |
| 91–120 | 2 |
| 121–180 | 3 |
| 181–240 | 5 |
| 241–360 | 5 |
| 361–480 | 8 |
| 481+ | 13 |

**Milestones**: Parse `estimated_duration` string. For ranges (e.g., "3-4 days"), take the midpoint. Convert days to SP at 6 productive hours/day, then round to Fibonacci.

Examples:

- "1-2 days" → 1.5 × 6 = 9h → 8 SP
- "2-3 days" → 2.5 × 6 = 15h → 13 SP
- "3-4 days" → 3.5 × 6 = 21h → 21 SP (use exact for milestones > 13)

### ADF Description Format

Milestones produce a rich ADF document with the following sections:

```
{description content}

--- 

**Deliverables:**
{from description, parsed as bullet list}

**Risk:** {risk field from description}

**Success Criteria:**
☐ {criterion 1}
☐ {criterion 2}
...

**Dependencies:** {dependency milestone IDs}
```

Tasks produce a simpler ADF document:

```
{description content}

---

**Constraints:**
{from instructions, key points as bullet list}

**Success Criteria:**
☐ {criterion 1}
☐ {criterion 2}
...
```

## Dependency Linking

Task and milestone `dependencies` arrays are translated to Jira issue links using the **"Blocks"** link type:

- The dependent issue is the **outward** issue ("Blocks")
- The dependency issue is the **inward** issue ("is blocked by")

Example: If `m0-003` depends on `[m0-001, m0-002]`, two links are created:
- `m0-003` Blocks `m0-001` → outward: m0-003, inward: m0-001, type: "Blocks"
- `m0-003` Blocks `m0-002` → outward: m0-003, inward: m0-002, type: "Blocks"

## Configuration

### Global Config (`~/.config/sherpy-to-jira/config.yaml`)

Auto-discovered at the standard XDG path. Overridable with `--global-config` flag. Created by the `setup` command. Stores Jira instance metadata that is shared across all projects.

```yaml
jira:
  domain: "mycompany.atlassian.net"
  issue_types:
    epic: "10000"
    story: "10001"
    sub_task: "10002"
```

Fields:
- `domain`: Jira Cloud domain (e.g., `mycompany.atlassian.net`)
- `issue_types`: Discovered issue type IDs from `GET /rest/api/3/issue/createmeta`. Stored globally because they are per-Jira-instance, not per-project.

### Authentication (Environment Variables Only)

```
JIRA_EMAIL=user@example.com
JIRA_TOKEN=abc123def456...
```

The tool reads credentials exclusively from environment variables. No secrets are stored in config files. Both variables are required for `setup` and `sync` commands. If either is missing, the tool exits immediately with a clear error message.

### Project-Local Config (`sherpy-jira.yaml`)

Located in the current working directory. Created by `init` (file paths) and updated by `setup` (project key/name). Points the tool at the sherpy source documents for this project.

```yaml
project_key: "SHERPY"
project_name: "Sherpy PM"
developer_summary: "docs/plan/002-pm/developer-summary.md"
milestones: "docs/plan/002-pm/implementation/milestones.yaml"
tasks_dir: "docs/plan/002-pm/implementation/tasks"
timeline: "docs/plan/002-pm/timeline.yaml"
sync_state: "sherpy-jira-sync-state.yaml"
```

Fields:
- `project_key`: Jira project key (e.g., `SHERPY`). Set during `setup`.
- `project_name`: Jira project display name (e.g., `Sherpy PM`). Set during `setup`.
- `developer_summary`: Relative path to the developer summary markdown file.
- `milestones`: Relative path to `milestones.yaml`.
- `tasks_dir`: Relative path to directory containing `milestone-m*.tasks.yaml` files.
- `timeline`: Relative path to `timeline.yaml`. Optional — if missing or the file doesn't exist, `duedate` is not set on Stories.
- `sync_state`: Relative path for the sync state file. Defaults to `sherpy-jira-sync-state.yaml`.

### Sync State File (`sherpy-jira-sync-state.yaml`)

Stored alongside `sherpy-jira.yaml` by default. This file is the source of truth for which YAML entities have been pushed to Jira. It maps YAML IDs to Jira issue keys and numeric IDs plus content hashes.

```yaml
version: "1.0.0"
project_key: SHERPY
project_id: "10001"
last_sync: "2026-05-21T10:00:00Z"
epic:
  jira_key: SHERPY-1
  jira_id: "10099"
  content_hash: "sha256:abc123..."
milestones:
  m0:
    jira_key: SHERPY-2
    jira_id: "10100"
    content_hash: "sha256:def456..."
  m1:
    jira_key: SHERPY-6
    jira_id: "10105"
    content_hash: "sha256:ghi789..."
tasks:
  m0-001:
    jira_key: SHERPY-3
    jira_id: "10101"
    content_hash: "sha256:jkl012..."
  m0-002:
    jira_key: SHERPY-4
    jira_id: "10102"
    content_hash: "sha256:mno345..."
links:
  - outward: SHERPY-4
    inward: SHERPY-3
    type: Blocks
```

The sync state is updated after every successful push operation. It is used to determine whether to create (POST) or update (PUT) each issue.

## CLI Commands

### `sherpy-to-jira init`

Discovers sherpy source documents in the current working directory and generates `sherpy-jira.yaml`. Does not touch Jira.

File discovery strategy (convention-first, recursive fallback):
1. Look in common sherpy directory conventions: `docs/**/milestones.yaml`, `docs/**/developer-summary.md`, `docs/**/tasks/milestone-m*.tasks.yaml`, `docs/**/timeline.yaml`
2. If not found via convention, recursively walk CWD matching exact filenames

Steps:
1. Search for `developer-summary.md` (file named `developer-summary.md`)
2. Search for `milestones.yaml` (file matching the milestones schema)
3. Search for `milestone-m*.tasks.yaml` files (glob pattern in a directory)
4. Search for `timeline.yaml` (optional — warn if not found, proceed without it)
5. Resolve all paths relative to CWD
6. Write `sherpy-jira.yaml` with discovered paths
7. Print summary of discovered files and any warnings

### `sherpy-to-jira setup`

Interactive CLI that creates the Jira project and discovers issue type IDs. Requires `sherpy-jira.yaml` to exist (run `init` first).

Steps:
1. Load `sherpy-jira.yaml` (fail if not found with instructions to run `init`)
2. Load global config (or use `~/.config/sherpy-to-jira/config.yaml` default)
3. Verify `JIRA_EMAIL` and `JIRA_TOKEN` env vars are set
4. Prompt for project key (e.g., `SHERPY`)
5. Prompt for project name (e.g., `Sherpy PM`)
6. Call `GET /rest/api/3/myself` to discover the lead account ID
7. Create a Jira Software project using the Kanban template via `POST /rest/api/3/project`
   - If project already exists, use existing and warn user
8. Call `GET /rest/api/3/issue/createmeta?projectKeys=<key>&expand=projects.issuetypes` to discover Epic, Story, and Sub-task issue type IDs
9. Write global config with domain and discovered issue type IDs
10. Update `sherpy-jira.yaml` with `project_key` and `project_name`
11. Exit with success or descriptive error

### `sherpy-to-jira sync`

Reads sherpy source documents and pushes to Jira. Creates missing issues, updates changed issues, skips unchanged issues.

Steps:
1. Load `sherpy-jira.yaml` (fail if not found)
2. Load global config (fail if not found with instructions to run `setup`)
3. Verify `JIRA_EMAIL` and `JIRA_TOKEN` env vars are set
4. Load `developer-summary.md`, `milestones.yaml`, all `milestone-m*.tasks.yaml` files
5. Load `timeline.yaml` if path is configured and file exists
6. Load sync state file (if exists)
7. If the Epic is not in sync state:
   - Create an Epic issue via `POST /rest/api/3/issue` using the developer summary content
   - Record the returned key and ID in sync state
8. If the Epic is already in sync state:
   - Compute a content hash of the developer summary
   - If changed, update the Epic via `PUT /rest/api/3/issue/{key}`
9. For each milestone (in dependency order):
   - If not in sync state: create a Story with `parent: { key: <epic_jira_key> }`
   - If in sync state: compute content hash, update if changed
   - Apply `duedate` from timeline `workback.schedule` if available
10. For each task (in dependency order within each milestone):
    - If not in sync state: create a Sub-task with `parent: { key: <milestone_jira_key> }`
    - If in sync state: compute content hash, update if changed
11. Resolve all dependency links:
    - For each task/milestone with `dependencies`, create Blocks links via `POST /rest/api/3/issueLink`
    - Skip links that already exist (track in sync state)
12. Save updated sync state file
13. Print summary of created/updated/skipped issues

### `sherpy-to-jira sync --dry-run`

Perform all the same analysis but output a plan of API calls without executing them. Useful for previewing changes.

Output format:

```
CREATE Epic SHERPY-? "Wealth Platform Q3 Overhaul"
  CREATE Story SHERPY-? "m0: Monorepo Scaffolding & Tooling" (8 SP)
    CREATE Sub-task SHERPY-? "m0-001: Initialize pnpm workspace" (1 SP) [code]
    CREATE Sub-task SHERPY-? "m0-002: Configure TypeScript strict mode" (1 SP) [config]
    ...
    LINK m0-003 Blocks m0-001
    LINK m0-003 Blocks m0-002
  UPDATE Story SHERPY-1 "m1: Shared Types & Database Schema" (13 SP)
    ...
TOTAL: 1 Epic, 5 Stories, 43 Sub-tasks, 38 links
```

### `sherpy-to-jira status`

Read sync state file and print a summary:

```
Project: SHERPY (ID: 10001)
Epic: SHERPY-1 "Wealth Platform Q3 Overhaul"
Last sync: 2026-05-21T10:00:00Z
Milestones synced: 9/9
Tasks synced: 43/43
Links created: 38
```

If no sync state file exists, print "No sync state found. Run `sherpy-to-jira sync` to push issues."

## Jira REST API Operations

### Project Creation

```
POST /rest/api/3/project
Content-Type: application/json

{
  "key": "SHERPY",
  "name": "Sherpy PM",
  "projectTypeKey": "software",
  "projectTemplateKey": "com.pyxis.greenhopper.jira:gh-kanban-template",
  "leadAccountId": "<discovered from /rest/api/3/myself>",
  "assigneeType": "PROJECT_LEAD"
}
```

### Issue Type Discovery

```
GET /rest/api/3/issue/createmeta?projectKeys=SHERPY&expand=projects.issuetypes
```

Parse response to find the `name: "Epic"`, `name: "Story"`, and `name: "Sub-task"` issue types, record their IDs.

### Create Developer Summary (Epic)

```
POST /rest/api/3/issue
Content-Type: application/json

{
  "fields": {
    "project": { "key": "SHERPY" },
    "issuetype": { "id": "<epic_type_id>" },
    "summary": "Wealth Platform Q3 Overhaul",
    "description": { <ADF document from developer summary> },
    "labels": ["sherpy-project"]
  }
}
```

Response: `{ "id": "10099", "key": "SHERPY-1", ... }`

### Create Milestone (Story)

```
POST /rest/api/3/issue
Content-Type: application/json

{
  "fields": {
    "project": { "key": "SHERPY" },
    "issuetype": { "id": "<story_type_id>" },
    "parent": { "key": "SHERPY-1" },
    "summary": "m0: Monorepo Scaffolding & Tooling",
    "description": { <ADF document> },
    "labels": ["milestone:m0"],
    "duedate": "2026-02-19"
  }
}
```

Response: `{ "id": "10100", "key": "SHERPY-2", ... }`

### Create Task (Sub-task)

```
POST /rest/api/3/issue
Content-Type: application/json

{
  "fields": {
    "project": { "key": "SHERPY" },
    "issuetype": { "id": "<sub_task_type_id>" },
    "parent": { "key": "SHERPY-2" },
    "summary": "m0-001: Initialize pnpm workspace with package structure",
    "description": { <ADF document> },
    "labels": ["code"]
  }
}
```

Note: The `parent` key is the milestone's Story key (e.g., `SHERPY-2`), not the Epic key. Sub-tasks are parented to their milestone's Story.

### Update Issue

```
PUT /rest/api/3/issue/{issueKey}
Content-Type: application/json

{
  "fields": {
    "summary": "Updated summary",
    "description": { <updated ADF> },
    "labels": ["code", "config"]
  }
}
```

### Create Dependency Link

```
POST /rest/api/3/issueLink
Content-Type: application/json

{
  "type": { "name": "Blocks" },
  "inwardIssue": { "key": "SHERPY-2" },
  "outwardIssue": { "key": "SHERPY-4" }
}
```

This means SHERPY-4 is blocked by SHERPY-2.

## Sync Logic

### Content Hashing

Each entity gets a SHA-256 hash of its serialized content (selected fields). The hash is stored in the sync state. On sync, if the hash matches, the issue is skipped. If it differs, the issue is updated.

Fields included in hash:
- Developer Summary: `title`, full file content
- Milestones: `name`, `description`, `estimated_duration`, `success_criteria`, `dependencies`
- Tasks: `name`, `description`, `estimate_minutes`, `type`, `dependencies`

### Ordering

Issues are created in the following order:

1. Epic (developer summary) — always created first
2. Milestones with no dependencies first
3. Then milestones whose dependencies are already synced
4. Within each milestone, tasks with no dependencies first
5. Then tasks whose dependencies are already synced

This ensures that when a Blocks link is created, both issues already exist in Jira.

### Idempotency

- Creating an issue that already exists (has a key in sync state) is skipped
- Updating an issue with identical content hash is skipped
- Creating a link that already exists returns success per Jira API (no error)
- Running sync multiple times produces the same end state

### Timeline Date Application

The `workback.schedule` section of `timeline.yaml` contains `start_date` and `completion_date` for each entry. For entries with `type: milestone`, the `completion_date` is used as the Jira `duedate` field on the corresponding Story.

If no `timeline.yaml` path is configured, the file doesn't exist, or no workback section is present, `duedate` is not set.

### Scope Exclusion

The following timeline entries are excluded from Jira issue creation:
- All `post-*` entries (QA rounds, PR review, merge, deployment, signoff)
- Entries with `type: delivery` or `type: deploy`

Only entries with `type: milestone` are synced.

## Error Handling

### Rate Limiting

Jira Cloud enforces rate limits. The tool must:

1. Respect the `Retry-After` response header
2. Implement exponential backoff starting at 1 second, max 30 seconds
3. Limit concurrent requests to 5 per second

### Partial Failures

If a batch of issues encounters errors:

1. Log the error with the YAML ID and Jira API response
2. Continue processing remaining issues
3. Print a summary of successes and failures at the end
4. Only update sync state for successfully created/updated issues

### Common Error Scenarios

| Scenario | Handling |
|---|---|
| Project already exists | Use existing project, warn user |
| Issue type not found | Error with instructions to configure manually |
| Invalid API token | Fail immediately with clear auth error |
| Network timeout | Retry up to 3 times with backoff |
| Issue key collision | Update existing issue instead of creating |
| Missing parent for sub-task | Create parent first, then retry sub-task |

## Future Considerations (Out of Scope for MVP)

- **Pull sync**: Read Jira status changes back into YAML files
- **Webhook listener**: Auto-sync when Jira issues change
- **Sprint management**: Map timeline phases to Jira sprints
- **Assignee mapping**: Map YAML people to Jira users
- **Comment sync**: Push YAML instructions as Jira comments
- **Custom fields**: Support project-specific custom field mapping
- `sherpy-to-jira diff`: Show what would change without writing to YAML or Jira
- `sherpy-to-jira unlink`: Remove Jira issues created by the tool
