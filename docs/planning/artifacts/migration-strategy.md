# Migration Strategy: web-legacy to web

**Document Status:** Draft  
**Last Updated:** 2026-04-29  
**Milestone:** M0-018  
**Owner:** Frontend Team

---

## Executive Summary

This document outlines the migration strategy from the existing `@sherpy/web-legacy` package to the new `@sherpy/web` package. The migration follows a phased approach with parallel runs, gradual user transition, and a comprehensive rollback plan. The strategy prioritizes zero downtime, user choice, and safe deprecation of the legacy application.

**Key Timeline:**
- **Phase 1:** New app available at `/beta` route (2-3 weeks parallel run)
- **Phase 2:** Redirect to new app with opt-out fallback (1-2 weeks monitoring)
- **Phase 3:** Full migration, remove legacy package (after stability confirmation)

**Risk Level:** Medium - Mitigated by parallel deployment and rollback capabilities

---

## 1. Shared Dependencies

Both packages share core dependencies but with version differences. The following analysis identifies potential compatibility issues.

### 1.1 Identical Dependencies

These dependencies are used by both packages and should maintain compatibility:

```json
{
  "@radix-ui/react-slot": "^1.2.4",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "lucide-react": "^1.x (web-legacy: 1.8.0, web: 1.12.0)",
  "react": "^19.x (web-legacy: 19.0.0, web: 19.2.5)",
  "react-dom": "^19.x (web-legacy: 19.0.0, web: 19.2.5)",
  "tailwind-merge": "^3.5.0",
  "react-router-dom": "7 / ^7.14.2"
}
```

**Assessment:** ✅ Compatible - Minor version differences are non-breaking.

### 1.2 Legacy-Only Dependencies

These dependencies exist in web-legacy but NOT in the new web package:

```json
{
  "@okta/okta-auth-js": "^8.0.0",           // Auth - Removed in new app
  "@radix-ui/react-collapsible": "^1.1.12", // UI component
  "@radix-ui/react-dialog": "^1.1.15",      // UI component
  "@radix-ui/react-dropdown-menu": "^2.1.16", // UI component
  "@radix-ui/react-label": "^2.1.8",        // UI component
  "@radix-ui/react-scroll-area": "^1.2.10", // UI component
  "@radix-ui/react-tooltip": "^1.2.8",      // UI component
  "cmdk": "^1.1.1",                          // Command palette
  "next-themes": "^0.4.6",                   // Theme switching
  "prism-react-renderer": "^2.4.1",          // Code syntax highlighting
  "sonner": "^2.0.7"                         // Toast notifications
}
```

**Migration Impact:**
- **Auth:** New app uses different auth strategy (needs implementation)
- **UI Components:** New app uses alternative shadcn components or custom implementations
- **Theming:** Theme switching not yet implemented in new app
- **Code Highlighting:** Document viewer code blocks need alternative solution

### 1.3 New Package Dependencies

These dependencies are NEW in the web package:

```json
{
  "@assistant-ui/react": "^0.12.26",           // Chat UI (upgraded from 0.12.25)
  "@assistant-ui/react-markdown": "^0.12.11",  // New - Markdown in chat
  "@radix-ui/react-tabs": "^1.1.13",           // New - Tab component
  "@tanstack/react-query": "^5.100.6",         // New - Server state management
  "bunshi": "^2.2.0",                          // New - Dependency injection
  "jotai": "^2.19.1"                           // New - Client state management
}
```

**Migration Impact:**
- ✅ State management completely redesigned (Jotai + React Query)
- ✅ Chat UI uses latest @assistant-ui packages
- ⚠️ Requires data migration for any cached/persisted state

### 1.4 Shared Package Dependency

Both packages depend on `@sherpy/shared` (workspace package):

```typescript
// Shared types used in both packages:
- Document, GetProjectResponse, PipelineStatus
- CreateProjectRequest, UpdateProjectRequest
- Milestone, Task
- Project entities and DTOs
```

**Assessment:** ✅ Compatible - Shared types ensure API contract consistency.

---

## 2. Routing Migration

### 2.1 web-legacy Routes

**Existing route structure (React Router v7):**

```typescript
// App.tsx - BrowserRouter with nested Routes
Route: "/"                     → InboxPage (Protected)
Route: "/login"                → LoginPage
Route: "/login/callback"       → LoginCallback (Okta OIDC)
Route: "/projects/:projectId"  → ProjectDetailPage (Protected + Suspense)
Route: "*"                     → Navigate to "/" (catch-all)
```

**Components:**
- **InboxLayout:** Main container with sidebar + project list
- **ProjectList:** Filterable/searchable list of projects
- **ProjectDetailPage:** Pipeline status, milestones, documents, chat

### 2.2 web Routes

**New route structure (React Router v7):**

```typescript
// router.tsx - createBrowserRouter with RootLayout
Route: "/"                     → HomePage
Route: "/error-boundary-demo"  → ErrorBoundaryDemoPage (testing)
Route: "*"                     → NotFoundPage (404)
```

**Current state:** Basic routing skeleton with no auth or project features.

### 2.3 Route Mapping Strategy

| Legacy Route | New Route | Status | Migration Notes |
|-------------|-----------|--------|-----------------|
| `/` (Inbox) | `/` | ⚠️ Partial | New app shows workflow sidebar, not inbox |
| `/login` | `/login` | ❌ Missing | Auth not implemented |
| `/login/callback` | `/login/callback` | ❌ Missing | Okta callback not implemented |
| `/projects/:id` | `/projects/:id` | ❌ Missing | Project detail route not defined |
| N/A | `/error-boundary-demo` | ✅ New | Testing route only |

**Gap Analysis:**
1. **Authentication routes missing** - High priority
2. **Project detail routes missing** - High priority
3. **Inbox/project list not implemented** - Medium priority (different UX)
4. **No catch-all redirect logic** - Low priority

### 2.4 URL Structure Compatibility

**Breaking Changes:**
- ✅ URLs remain the same (`/projects/:id`)
- ✅ No query parameter changes needed
- ⚠️ Login flow changes (different auth mechanism)

**Recommendation:** Maintain exact URL structure for seamless transition.

---

## 3. URL Redirection Strategy

### 3.1 Phase 1: Parallel Deployment

**Timeline:** Weeks 1-3 after M5 completion

**Infrastructure:**
```yaml
# Vite dev server configuration
web-legacy:
  port: 5173
  routes: "/*"
  
web:
  port: 5174  # Different port during beta
  routes: "/beta/*"
```

**Implementation:**
```typescript
// Proxy configuration in API server or reverse proxy
location / {
  proxy_pass http://localhost:5173;  // Legacy app
}

location /beta {
  rewrite ^/beta/(.*)$ /$1 break;
  proxy_pass http://localhost:5174;  // New app
}
```

**User Experience:**
- Default: Legacy app at root URL
- Opt-in: Beta app at `/beta` with "Try New UI" banner
- Cookie-based preference tracking

### 3.2 Phase 2: Gradual Migration

**Timeline:** Weeks 4-5 (after beta feedback)

**Default Behavior:**
```typescript
// Root route redirect logic
app.get('/', (req, res) => {
  // Check opt-out cookie
  if (req.cookies.preferLegacyUI === 'true') {
    return res.redirect('/legacy');
  }
  
  // Default to new UI
  return res.redirect('/app');
});
```

**URL Structure:**
```
/           → Redirect to /app (new UI)
/app/*      → New web package
/legacy/*   → Legacy web-legacy package (opt-out)
/beta       → Remove (consolidate to /app)
```

**Migration Banner:**
```typescript
// Show in legacy app header
<Banner variant="info">
  You're using the legacy interface.
  <Button onClick={() => switchToNewUI()}>
    Try New UI
  </Button>
</Banner>
```

### 3.3 Phase 3: Full Migration

**Timeline:** Week 6+ (after stability confirmed)

**Changes:**
1. Remove `/legacy` route entirely
2. Remove web-legacy package from build
3. Consolidate to single `/` route pointing to new app
4. Remove opt-out cookies and preference tracking

**Deprecation Notice:**
- 2-week warning banner in legacy app before removal
- Email notification to active users
- Release notes documenting transition

---

## 4. Data Migration

### 4.1 Local Storage Analysis

**web-legacy storage usage:**

```typescript
// Okta auth tokens (via @okta/okta-auth-js)
Key: "okta-token-storage"
Type: sessionStorage
Content: {
  accessToken: JWT,
  idToken: JWT,
  refreshToken?: JWT
}
Action: ❌ DO NOT migrate - New auth mechanism
```

**web storage usage:**
```typescript
// No localStorage/sessionStorage detected in codebase
// State management via Jotai (in-memory atoms)
// Server state via React Query (cache)
Action: ✅ No migration needed
```

### 4.2 Session State Migration

**Legacy session state:**
- **Authentication:** Okta session via sessionStorage
- **Project filters:** In-memory React state (FilterContext)
- **Selected project:** URL parameter (`:projectId`)
- **Document selection:** Component-local state

**New app session state:**
- **Authentication:** TBD (no auth implemented yet)
- **Workflow step:** Jotai atom (in-memory)
- **Sidebar state:** Jotai atom (in-memory)
- **Selected project:** N/A (different UX model)

**Migration Strategy:**
```typescript
// No automatic state migration needed
// User starts fresh session in new app
// Project context preserved via URL if applicable
```

### 4.3 Cache Migration

**Legacy cache (SuspenseCache):**
```typescript
// packages/web-legacy/src/lib/suspense-cache.ts
const projectCache = new SuspenseCache<GetProjectResponse>({
  maxSize: 50,
  ttl: 5 * 60 * 1000  // 5 minutes
});
```

**New app cache (React Query):**
```typescript
// @tanstack/react-query with default settings
// Automatic garbage collection
// No persistent cache
```

**Action:** ❌ No migration - Cache is ephemeral by design

### 4.4 User Preferences

| Preference | Legacy Storage | New Storage | Migration Strategy |
|-----------|---------------|-------------|-------------------|
| Theme (dark/light) | localStorage via next-themes | ❌ Not implemented | Detect system preference |
| Filters | In-memory state | N/A | User reapplies |
| Selected document | Component state | N/A | Default to first doc |
| Auth session | Okta sessionStorage | TBD | New login required |

**Recommendation:** Implement theme persistence in new app before Phase 2.

---

## 5. Feature Parity Checklist

### 5.1 Authentication & Authorization

| Feature | Legacy | New | Status | Priority |
|---------|--------|-----|--------|----------|
| Okta OIDC login | ✅ | ❌ | Missing | **P0** |
| Login page | ✅ | ❌ | Missing | **P0** |
| Callback handler | ✅ | ❌ | Missing | **P0** |
| Protected routes | ✅ | ❌ | Missing | **P0** |
| JWT token refresh | ✅ | ❌ | Missing | **P1** |
| Logout flow | ✅ | ❌ | Missing | **P1** |
| Dev mode bypass | ✅ | ❌ | Missing | **P2** |

### 5.2 Project Management

| Feature | Legacy | New | Status | Priority |
|---------|--------|-----|--------|----------|
| Project list (inbox) | ✅ | ❌ | Different UX | **P0** |
| Create new project | ✅ | ❌ | Missing | **P0** |
| Search/filter projects | ✅ | ❌ | Missing | **P1** |
| Project detail view | ✅ | ❌ | Missing | **P0** |
| Pipeline status viz | ✅ | ❌ | Missing | **P0** |
| Update project | ✅ | ❌ | Missing | **P1** |
| Real-time updates | ✅ | ❌ | Missing | **P1** |

### 5.3 Document Management

| Feature | Legacy | New | Status | Priority |
|---------|--------|-----|--------|----------|
| Document list | ✅ | ❌ | Missing | **P0** |
| Document viewer | ✅ | ❌ | Missing | **P0** |
| YAML syntax highlighting | ✅ | ❌ | Missing | **P1** |
| Markdown rendering | ✅ | ❌ | Missing | **P1** |
| PDF export | ✅ | ❌ | Missing | **P2** |
| Document versioning | ❌ | ❌ | Future | **P3** |

### 5.4 Chat Interface

| Feature | Legacy | New | Status | Priority |
|---------|--------|-----|--------|----------|
| Chat panel | ✅ | ⚠️ | Partial (UI only) | **P0** |
| @assistant-ui integration | ✅ | ✅ | Complete | **P0** |
| WebSocket streaming | ✅ | ❌ | Missing | **P0** |
| Message history | ✅ | ❌ | Missing | **P0** |
| Skill invocation | ✅ | ❌ | Missing | **P1** |
| Auto-skill on step click | ❌ | ⚠️ | Planned (M2) | **P1** |

### 5.5 Milestones & Tasks

| Feature | Legacy | New | Status | Priority |
|---------|--------|-----|--------|----------|
| Milestone list | ✅ | ❌ | Missing | **P0** |
| Milestone cards | ✅ | ❌ | Missing | **P1** |
| Task list | ✅ | ❌ | Missing | **P1** |
| Task status updates | ✅ | ❌ | Missing | **P1** |
| Task dependencies | ❌ | ❌ | Future | **P3** |

### 5.6 UI Components

| Feature | Legacy | New | Status | Priority |
|---------|--------|-----|--------|----------|
| Sidebar navigation | ✅ | ✅ | Complete | **P0** |
| Command palette | ✅ | ❌ | Missing | **P2** |
| Theme toggle | ✅ | ❌ | Missing | **P2** |
| Toast notifications | ✅ | ❌ | Missing | **P1** |
| Error boundaries | ✅ | ✅ | Complete | **P0** |
| Loading skeletons | ✅ | ❌ | Missing | **P1** |
| Health indicator | ✅ | ❌ | Missing | **P2** |

### 5.7 API Integration

| Feature | Legacy | New | Status | Priority |
|---------|--------|-----|--------|----------|
| Projects API | ✅ | ❌ | Missing | **P0** |
| Documents API | ✅ | ❌ | Missing | **P0** |
| Chat API | ✅ | ❌ | Missing | **P0** |
| Milestones API | ✅ | ❌ | Missing | **P1** |
| Tasks API | ✅ | ❌ | Missing | **P1** |
| WebSocket events | ✅ | ❌ | Missing | **P0** |
| Auth token injection | ✅ | ❌ | Missing | **P0** |

### 5.8 Testing

| Feature | Legacy | New | Status | Priority |
|---------|--------|-----|--------|----------|
| Unit tests | ✅ | ⚠️ | Partial | **P1** |
| Component tests | ✅ | ⚠️ | Partial | **P1** |
| Integration tests | ✅ | ❌ | Missing | **P2** |
| E2E tests | ❌ | ❌ | Future | **P3** |

### 5.9 Performance

| Feature | Legacy | New | Status | Priority |
|---------|--------|-----|--------|----------|
| Code splitting | ✅ | ✅ | Complete | **P0** |
| Bundle size monitoring | ❌ | ✅ | Better in new | **P1** |
| Performance budgets | ❌ | ✅ | New feature | **P1** |
| React 19 Suspense | ✅ | ✅ | Both support | **P0** |
| Lazy loading | ✅ | ⚠️ | Partial | **P1** |

**Summary:**
- **Critical (P0):** 20 features missing or incomplete
- **High (P1):** 15 features missing
- **Medium (P2):** 6 features missing
- **Low (P3):** 3 features (future work)

---

## 6. Rollback Plan

### 6.1 Rollback Triggers

**Automatic rollback conditions:**
1. ❌ Error rate > 5% for 5 minutes
2. ❌ API response time > 2s (p95) for 10 minutes
3. ❌ Client-side crash rate > 2%
4. ❌ Authentication failure rate > 10%

**Manual rollback conditions:**
1. Critical bug reports from > 3 users
2. Data integrity issues detected
3. Security vulnerability discovered
4. Business stakeholder decision

### 6.2 Phase 1 Rollback (Beta)

**Scenario:** Beta app has critical issues

**Action:**
```bash
# 1. Remove /beta route from proxy config
# 2. Display notice in beta app
# 3. Update docs to mark beta as "temporarily unavailable"
```

**Impact:** ✅ Minimal - Users continue with legacy app, beta testers notified

**Recovery Time:** < 5 minutes

### 6.3 Phase 2 Rollback (Gradual Migration)

**Scenario:** New app set as default, but has issues

**Action:**
```bash
# 1. Update redirect logic to default to legacy
app.get('/', (req, res) => {
  res.redirect('/legacy');  // Flip default
});

# 2. Display banner in new app
<Banner variant="warning">
  We've detected issues with the new UI. 
  You've been redirected to the legacy interface.
</Banner>

# 3. Investigate and fix issues before re-enabling
```

**Impact:** ⚠️ Moderate - Users see redirect, may cause confusion

**Recovery Time:** < 15 minutes

### 6.4 Phase 3 Rollback (Full Migration)

**Scenario:** Legacy app removed, but new app has critical regression

**Action:**
```bash
# Emergency rollback procedure:

# 1. Redeploy previous version from git
git checkout <last-stable-commit>
pnpm install
pnpm --filter @sherpy/web-legacy build
pnpm --filter @sherpy/api restart

# 2. Update routing to restore legacy app
# 3. Notify users via email + in-app banner
# 4. Schedule emergency maintenance window
```

**Impact:** ⚠️ High - Requires code deployment, potential downtime

**Recovery Time:** 30-60 minutes

**Prevention:**
- Maintain git tag of last stable legacy version
- Keep legacy dependencies in lockfile for 3 months post-migration
- Document rollback procedure in runbook
- Test rollback procedure monthly

### 6.5 Data Rollback Strategy

**Data at Risk:**
- ❌ **None** - Both apps share same backend/database
- ✅ Only frontend state (in-memory, no persistence)

**Action:** No data rollback needed - frontend rollback is sufficient

### 6.6 Monitoring & Alerts

**Key Metrics:**
```yaml
- name: frontend_error_rate
  threshold: 5%
  window: 5m
  action: page_oncall

- name: api_latency_p95
  threshold: 2s
  window: 10m
  action: alert_team

- name: client_crash_rate
  threshold: 2%
  window: 5m
  action: page_oncall

- name: auth_failure_rate
  threshold: 10%
  window: 5m
  action: page_oncall
```

**Dashboards:**
1. Frontend Health (error rate, crash rate, load time)
2. API Performance (latency, throughput, error rate)
3. User Engagement (DAU, session duration, feature adoption)
4. Migration Progress (% users on new vs legacy)

---

## 7. Deprecation Timeline

### 7.1 Phased Deprecation Schedule

```
┌─────────────────────────────────────────────────────────────────┐
│                     Migration Timeline                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Week 1-3: PHASE 1 - Beta Deployment                             │
│   ├─ Deploy new app to /beta route                              │
│   ├─ Enable beta opt-in banner in legacy app                    │
│   ├─ Collect feedback and fix issues                            │
│   └─ Success: < 5 critical bugs, positive feedback              │
│                                                                  │
│ Week 4-5: PHASE 2 - Gradual Migration                           │
│   ├─ Set new app as default (with opt-out)                      │
│   ├─ Move legacy app to /legacy route                           │
│   ├─ Monitor migration metrics                                  │
│   └─ Success: > 80% users on new app, error rate < 2%           │
│                                                                  │
│ Week 6: PHASE 3 - Stabilization                                 │
│   ├─ Monitor new app stability                                  │
│   ├─- Remove opt-out option (new app only)                      │
│   └─ Success: 7 days error-free operation                       │
│                                                                  │
│ Week 7: Deprecation Notice                                      │
│   ├─ Announce legacy app removal date                           │
│   ├─ Email notification to all users                            │
│   └─ Update release notes and docs                              │
│                                                                  │
│ Week 8: Package Removal                                         │
│   ├─ Remove web-legacy from monorepo                            │
│   ├─ Archive legacy code in git history                         │
│   ├─ Update CI/CD to remove legacy builds                       │
│   └─ Clean up dependencies                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Communication Plan

**Stakeholders to Notify:**
1. **End Users:** Email + in-app banner
2. **Product Team:** Slack announcement + meeting
3. **Development Team:** Git commit + PR comments
4. **QA Team:** Test plan update
5. **DevOps Team:** Deployment runbook update

**Message Templates:**

**Phase 1 Announcement (Beta):**
```
Subject: Try Our New UI (Beta)

Hi [User],

We're excited to announce the beta release of our redesigned 
Sherpy UI! The new interface offers:

- Improved performance and responsiveness
- Modern, intuitive design
- Enhanced workflow navigation

Try it now at [domain]/beta and share your feedback.

Your current workflow remains unchanged - the beta is optional.

Feedback: [feedback-form-url]
```

**Phase 2 Announcement (Migration):**
```
Subject: Important: New Sherpy UI Now Default

Hi [User],

Starting today, our new Sherpy UI is the default experience.

What's changing:
- You'll be redirected to the new interface by default
- Your projects and data remain unchanged
- You can temporarily switch back via the "Use Legacy UI" button

Need help? Check our migration guide: [docs-url]
Have issues? Report them: [support-url]
```

**Phase 3 Announcement (Deprecation):**
```
Subject: Legacy Sherpy UI Removal - Action Required

Hi [User],

The legacy Sherpy interface will be removed on [DATE] after 
a successful 6-week migration period.

What you need to do:
- ✅ Nothing! You're already using the new interface
- 📚 Review our updated docs: [docs-url]
- 🐛 Report any issues before [DATE]: [support-url]

The legacy interface will no longer be accessible after [DATE].
```

### 7.3 Code Removal Checklist

**Pre-removal validation:**
- [ ] Verify > 95% users on new app for 7+ days
- [ ] Confirm zero critical bugs in new app
- [ ] Obtain stakeholder sign-off
- [ ] Create git tag for last legacy version: `v1.0.0-legacy-final`
- [ ] Archive legacy documentation

**Removal steps:**
```bash
# 1. Remove package from monorepo
git rm -rf packages/web-legacy/

# 2. Update workspace configuration
# Remove from pnpm-workspace.yaml

# 3. Remove from CI/CD
# Edit .github/workflows to remove web-legacy builds

# 4. Clean up references
grep -r "web-legacy" . --exclude-dir=node_modules
grep -r "@sherpy/web-legacy" . --exclude-dir=node_modules

# 5. Update proxy/routing config
# Remove /legacy routes from server.ts or nginx config

# 6. Commit and tag
git add .
git commit -m "chore: remove deprecated web-legacy package"
git tag v2.0.0-legacy-removed
git push origin main --tags
```

**Post-removal cleanup:**
```bash
# Clean up Docker volumes (if any)
docker volume rm sherpy-web-legacy-node-modules

# Update sandbox.yaml
# Remove web-legacy port forwarding (if exists)

# Archive documentation
mkdir -p docs/archive/
mv packages/web-legacy/README.md docs/archive/web-legacy-README.md
```

### 7.4 Dependency Cleanup

**Remove legacy-only dependencies:**
```json
{
  "@okta/okta-auth-js": "^8.0.0",
  "cmdk": "^1.1.1",
  "next-themes": "^0.4.6",
  "prism-react-renderer": "^2.4.1",
  "sonner": "^2.0.7"
}
```

**Action:**
```bash
# After web-legacy removal
pnpm install  # Auto-removes unused deps
pnpm dedupe   # Consolidate duplicate versions
```

**Estimated savings:**
- Bundle size reduction: ~150KB (gzipped)
- node_modules size: ~30MB
- Build time reduction: ~15 seconds

---

## 8. Risk Assessment & Mitigation

### 8.1 High-Risk Areas

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Auth breaks during migration | Medium | **Critical** | Keep Okta config, implement auth first |
| Data loss during rollback | Low | **Critical** | No persistent frontend state = no risk |
| Users can't access projects | Medium | **High** | Parallel deployment, gradual rollout |
| WebSocket connection issues | Medium | **High** | Fallback to polling, connection retry logic |
| Performance regression | Low | **Medium** | Bundle budgets, performance monitoring |

### 8.2 Mitigation Strategies

**Authentication:**
- Implement Okta integration BEFORE Phase 1
- Test auth flow in staging environment
- Keep legacy auth code available for emergency rollback

**Data Integrity:**
- No schema changes during migration
- Both apps use same API endpoints
- No frontend data persistence = reduced risk

**User Experience:**
- Gradual rollout with opt-out option
- Clear communication at each phase
- Help documentation and videos

**Technical Stability:**
- Feature parity checklist completion before Phase 2
- Automated performance testing
- Error tracking and alerting (Sentry, DataDog, etc.)

### 8.3 Success Criteria

**Phase 1 (Beta) - GO/NO-GO Decision:**
- [ ] < 5 critical bugs reported
- [ ] > 50 users tested beta
- [ ] Positive feedback (> 80% satisfaction)
- [ ] No auth or data integrity issues

**Phase 2 (Migration) - GO/NO-GO Decision:**
- [ ] Auth implementation complete and tested
- [ ] Core features (P0) have parity with legacy
- [ ] Error rate < 2% for 7 days
- [ ] > 80% users adopted new app voluntarily

**Phase 3 (Deprecation) - GO/NO-GO Decision:**
- [ ] > 95% users on new app for 7+ days
- [ ] Zero critical bugs in production
- [ ] Stakeholder approval obtained
- [ ] Rollback procedure tested and documented

---

## 9. Post-Migration Checklist

### 9.1 Immediate (Week 1)
- [ ] Remove `/beta` and `/legacy` routes
- [ ] Consolidate routing to single `/` path
- [ ] Update analytics tracking (remove legacy app events)
- [ ] Remove opt-out cookies and preference logic

### 9.2 Short-term (Weeks 2-4)
- [ ] Archive legacy documentation
- [ ] Remove web-legacy from monorepo
- [ ] Clean up unused dependencies
- [ ] Update CI/CD pipelines
- [ ] Remove legacy-specific environment variables

### 9.3 Long-term (Months 2-3)
- [ ] Remove git tag protection for legacy tags (after 3 months)
- [ ] Evaluate bundle size improvements
- [ ] Document migration learnings
- [ ] Plan for next major refactor (if needed)

---

## 10. Appendix

### 10.1 Environment Variables

**Legacy app (web-legacy):**
```bash
VITE_OKTA_DOMAIN=https://example.okta.com
VITE_OKTA_CLIENT_ID=abc123
VITE_API_URL=http://localhost:3100
VITE_DEV_MODE=false
```

**New app (web):**
```bash
# TBD - No environment variables defined yet
# Likely needs:
# VITE_API_URL, VITE_WS_URL, VITE_AUTH_*
```

### 10.2 Vite Proxy Configuration

**Both apps use identical proxy config:**
```typescript
proxy: {
  "/api": {
    target: "http://localhost:3100",
    changeOrigin: true
  },
  "/ws": {
    target: "ws://localhost:3101",
    ws: true,
    changeOrigin: true
  }
}
```

**Action:** ✅ No changes needed during migration

### 10.3 Package Scripts Comparison

**web-legacy:**
```json
{
  "dev": "vite",
  "build": "vite build",
  "typecheck": "tsc --noEmit",
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest --coverage"
}
```

**web:**
```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",  // Includes tsc check
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest run --coverage",
  "lint": "eslint src --ext ts,tsx",
  "lint:fix": "eslint src --ext ts,tsx --fix",
  "format": "prettier --write 'src/**/*.{ts,tsx,css,json}'",
  "analyze": "pnpm run build && open dist/stats.html"
}
```

**Differences:**
- ✅ New app has linting/formatting scripts
- ✅ New app includes bundle analysis
- ✅ New app runs TypeScript check during build

### 10.4 Related Documentation

- [Technical Requirements](../requirements/technical-requirements.yaml)
- [Implementation Plan - M0 Tasks](../implementation/tasks/milestone-m0.tasks.yaml)
- [Backend Validation Report](./backend-validation-report.md)
- [Performance Budgets](./performance-budgets.md) (to be created)

---

## Approval & Sign-off

| Role | Name | Status | Date |
|------|------|--------|------|
| Frontend Lead | TBD | ⏳ Pending | - |
| Backend Lead | TBD | ⏳ Pending | - |
| Product Manager | TBD | ⏳ Pending | - |
| DevOps Lead | TBD | ⏳ Pending | - |

---

**Document Version:** 1.0  
**Next Review:** After M0 completion (backend validation)  
**Owner:** Frontend Team  
**Questions?** Contact: [team-email]
