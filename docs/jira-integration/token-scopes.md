# Jira API Token Scopes for sherpy-to-jira

## Overview

`sherpy-to-jira` authenticates with Jira Cloud using **HTTP Basic Auth** (`email:token`) against the Jira REST API v3. Atlassian offers two types of API tokens:

- **Classic API token** (no scopes) — inherits the full permissions of the user account. Works with direct domain URLs (`https://<domain>/rest/api/3/...`).
- **Scoped API token** — restricts access to specific operations. Requires the `api.atlassian.com/ex/jira/{cloudId}` URL pattern.

The current CLI uses direct domain URLs, so it works with either token type. Atlassian recommends using scoped tokens for improved security.

## API Operations Performed

| # | Operation | Endpoint | Method | CLI Command |
|---|-----------|----------|--------|-------------|
| 1 | Get current user | `/rest/api/3/myself` | GET | `setup` |
| 2 | Create project | `/rest/api/3/project` | POST | `setup` |
| 3 | Get issue type metadata | `/rest/api/3/issue/createmeta` | GET | `setup` |
| 4 | Create Epic | `/rest/api/3/issue` | POST | `sync` |
| 5 | Update Epic | `/rest/api/3/issue/{key}` | PUT | `sync` |
| 6 | Create Story (milestone) | `/rest/api/3/issue` | POST | `sync` |
| 7 | Update Story (milestone) | `/rest/api/3/issue/{key}` | PUT | `sync` |
| 8 | Create Sub-task (task) | `/rest/api/3/issue` | POST | `sync` |
| 9 | Update Sub-task (task) | `/rest/api/3/issue/{key}` | PUT | `sync` |
| 10 | Create issue link | `/rest/api/3/issueLink` | POST | `sync` |

## Required Classic Scopes (Recommended)

Classic scopes are the recommended approach per Atlassian documentation. These four scopes cover all operations:

| Scope | Description | Used By |
|-------|-------------|---------|
| `read:jira-user` | View user profiles | `setup` — Get current user (`GET /myself`) |
| `read:jira-work` | View Jira issue data | `setup` — Get issue type metadata (`GET /issue/createmeta`) |
| `write:jira-work` | Create and manage issues | `sync` — Create/update issues (`POST/PUT /issue`), create links (`POST /issueLink`) |
| `manage:jira-configuration` | Manage Jira global settings | `setup` — Create project (`POST /project`) |

## Required Granular Scopes (Alternative)

If classic scopes are unavailable, use these granular scopes:

| Scope | Description | Used By |
|-------|-------------|---------|
| `read:user:jira` | View users | `setup` — Get current user |
| `read:project:jira` | View projects | `setup` — Get issue type metadata |
| `read:issue-type:jira` | View issue types | `setup` — Get issue type metadata |
| `read:issue-meta:jira` | View issue metadata | `setup` — Get issue create metadata |
| `read:issue:jira` | View issues | `sync` — Read existing issues during update |
| `write:issue:jira` | Create and update issues | `sync` — Create/update Epics, Stories, Sub-tasks |
| `write:issue-link:jira` | Create and update issue links | `sync` — Create "Blocks" dependency links |
| `write:project:jira` | Create and update projects | `setup` — Create Jira project |

## Required Jira Project Permissions

Scopes grant API access, but the authenticated user must also have the following Jira project permissions:

| Permission | Purpose | Required By |
|------------|---------|-------------|
| Browse Projects | Read project data and issue types | `setup`, `sync` |
| Create Issues | Create Epics, Stories, and Sub-tasks | `sync` |
| Edit Issues | Update existing issues | `sync` |
| Link Issues | Create issue-to-issue links | `sync` |
| Administer Projects | Create new projects | `setup` |

The `setup` command creates a project with the authenticated user as project lead, so the user must have the **Create new projects** global permission (typically available to Jira Administrators or site admins).

## Token Creation

### Classic token (no scopes)

1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Select **Create API token**
3. Name it (e.g., `sherpy-to-jira`)
4. Set expiration (1–365 days)
5. Copy the token

### Scoped token

1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Select **Create API token with scopes**
3. Name it (e.g., `sherpy-to-jira-scoped`)
4. Set expiration (1–365 days)
5. Select **Jira** as the app
6. Select the scopes listed in the "Required Classic Scopes" table above
7. Copy the token

**Note:** Scoped tokens require calling the API via `https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3/...` instead of the direct domain URL. The current CLI uses direct domain URLs, so a code change would be needed to use scoped tokens. See `jira/client.go` for the HTTP client implementation.

## Environment Variables

```bash
export JIRA_EMAIL="your-email@company.com"
export JIRA_TOKEN="your-api-token"
```

Never commit `JIRA_TOKEN` to version control. Use environment variables or a secrets manager.

## Scope-to-Operation Matrix

| Operation | Classic Scope | Granular Scopes |
|-----------|---------------|-----------------|
| `GET /myself` | `read:jira-user` | `read:user:jira` |
| `POST /project` | `manage:jira-configuration` | `write:project:jira` |
| `GET /issue/createmeta` | `read:jira-work` | `read:issue-meta:jira`, `read:project:jira`, `read:issue-type:jira` |
| `POST /issue` | `write:jira-work` | `write:issue:jira` |
| `PUT /issue/{key}` | `write:jira-work` | `write:issue:jira` |
| `POST /issueLink` | `write:jira-work` | `write:issue-link:jira` |

## References

- [Jira scopes for OAuth 2.0 and Forge apps](https://developer.atlassian.com/cloud/jira/platform/scopes-for-oauth-2-3LO-and-forge-apps/)
- [Manage API tokens for your Atlassian account](https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/)
- [Basic auth for REST APIs](https://developer.atlassian.com/cloud/jira/platform/basic-auth-for-rest-apis/)
- [Jira Cloud REST API v3](https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/)
