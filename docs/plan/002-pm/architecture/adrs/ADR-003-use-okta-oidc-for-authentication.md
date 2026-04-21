# ADR-003: Use Okta OIDC for authentication

**Status:** Accepted
**Date:** 2026-04-20
**Source:** technical-requirements.yaml (security, trade_offs)

## Context

The system must authenticate users in both local mode (CLI spawns browser) and cloud mode (deployed web app). The organization has an existing Okta tenant. A decision is needed between requiring authentication from day one or deferring it with a localhost-only trust boundary for local mode.

## Decision

We will use Okta OIDC with a Single Page Application (SPA) configuration using PKCE flow from day one. The browser handles the OAuth redirect (no client secret). The API validates JWTs on every request via Okta's public JWKS endpoint. The same Okta application and auth flow works identically in local and cloud modes.

## Alternatives Considered

| Option | Reason not chosen |
|--------|-------------------|
| No authentication (localhost-only trust boundary) | Delays cloud-readiness; would require retrofitting auth later; loses SSO and future RBAC benefits |

## Consequences

### Positive
- Cloud-ready from day one — same auth flow in local and cloud modes
- SSO with existing org — no separate credentials to manage
- Future RBAC via Okta groups (admin, scheduler, viewer)
- Standard PKCE flow — no client secret exposed in browser

### Negative / Trade-offs
- Adds complexity to local development — browser login step required even when running locally
- Requires Okta application setup and configuration before development can proceed

### Risks
- Low reversibility — auth is foundational and touches every API endpoint
- Okta availability affects local development (mitigated by token caching)
