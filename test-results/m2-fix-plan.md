# M2 Milestone - Fix Plan

**Created:** 2026-04-30  
**Priority:** HIGH - Blocking M3 progress

---

## Executive Summary

E2E testing revealed that **the M2 implementation is mostly correct**, but has configuration issues that prevent messages from displaying:

1. ✅ UI components render correctly
2. ✅ Tab switching works
3. ✅ Message submission code is correct
4. ✅ Auto-skill invocation code is correct
5. ❌ **Runtime not configured properly** (root cause)
6. ❌ **No backend server** (blocking integration tests)

**Key Insight:** This is primarily a **runtime configuration issue**, not a code logic issue.

---

## Critical Issues

### 🚨 Issue #1: Duplicate Runtime Creation
**Severity:** HIGH  
**Impact:** State inconsistency, messages not displaying  
**Files:**
- `packages/web/src/features/chat/components/chat-container.tsx:22`
- `packages/web/src/features/chat/hooks/use-chat-runtime.ts`

**Problem:**
```typescript
// ProjectPage creates runtime and provides it
const { runtime } = useChatRuntime(effectiveProjectId);
return (
  <AssistantRuntimeProvider runtime={runtime}>
    <ProjectContent projectId={effectiveProjectId} />
  </AssistantRuntimeProvider>
);

// ChatContainer creates ANOTHER runtime
export function ChatContainer({ projectId }: ChatContainerProps) {
  const { connectionState, manualRetry } = useChatRuntime(projectId); // ❌ Creates duplicate
  const runtime = useAssistantRuntime(); // ✅ Gets provider's runtime
  // Uses connectionState from duplicate, but runtime from provider
}
```

**Fix:**
1. Refactor `useChatRuntime` to return only runtime (no connection state)
2. Create separate `useConnectionState` hook
3. Remove duplicate runtime creation from ChatContainer

---

### 🚨 Issue #2: Runtime Has No Backend
**Severity:** HIGH  
**Impact:** Messages can't be processed, no AI responses  
**Files:**
- `packages/web/src/features/chat/hooks/use-chat-runtime.ts:66-85`

**Problem:**
```typescript
const runtime = useAssistantTransportRuntime({
  api: `${getWebSocketUrl()}/chat`, // ❌ Endpoint doesn't exist
  // ...
});
```

The runtime is configured for HTTP transport, but:
- No backend server is running
- Endpoint `/chat` doesn't exist
- Messages are queued but never processed
- No responses generated

**Options:**

**Option A: Start Backend Server** (Production path)
- Implement WebSocket or HTTP streaming endpoint
- Handle message processing
- Generate AI responses
- Deploy backend

**Option B: Use Mock Runtime** (Testing path)
- Create `useMockRuntime` for development
- Echo back user messages
- Simulate AI responses
- No backend needed for UI testing

**Option C: Use Local Runtime** (Demo path)
- Use `useLocalRuntime` from @assistant-ui
- Process messages client-side
- Integrate with browser-based LLM APIs
- No backend needed

**Recommendation:** Option B (Mock Runtime) for immediate testing, then Option A (Backend) for production.

---

## Fix Implementation Plan

### Phase 1: Fix Runtime Architecture (2-3 hours)

#### Task 1.1: Refactor `useChatRuntime`
**File:** `packages/web/src/features/chat/hooks/use-chat-runtime.ts`

**Changes:**
```typescript
// BEFORE: Returns both runtime and connectionState
export function useChatRuntime(projectId: string) {
  const [connectionState, setConnectionState] = useState<ConnectionState>({...});
  const runtime = useAssistantTransportRuntime({...});
  return { runtime, connectionState, manualRetry };
}

// AFTER: Returns only runtime
export function useChatRuntime(projectId: string) {
  const runtime = useAssistantTransportRuntime({
    initialState: { messages: [], isRunning: false },
    api: `${getWebSocketUrl()}/chat`,
    // ... configuration
  });
  return { runtime };
}
```

#### Task 1.2: Create `useConnectionState` Hook
**File:** `packages/web/src/features/chat/hooks/use-connection-state.ts` (NEW)

**Implementation:**
```typescript
interface ConnectionState {
  isConnected: boolean;
  error: Error | null;
  isReconnecting: boolean;
}

export function useConnectionState(projectId: string) {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: true,
    error: null,
    isReconnecting: false,
  });

  // Monitor WebSocket/HTTP connection health
  // Handle reconnection logic
  // NO runtime creation

  const manualRetry = useCallback(() => {
    setConnectionState((prev) => ({ ...prev, isReconnecting: true }));
    // Trigger reconnection
  }, []);

  return { connectionState, manualRetry };
}
```

#### Task 1.3: Update `ChatContainer`
**File:** `packages/web/src/features/chat/components/chat-container.tsx`

**Changes:**
```typescript
// BEFORE
export function ChatContainer({ projectId }: ChatContainerProps) {
  const { connectionState, manualRetry } = useChatRuntime(projectId); // ❌
  const runtime = useAssistantRuntime();
  // ...
}

// AFTER
export function ChatContainer({ projectId }: ChatContainerProps) {
  const runtime = useAssistantRuntime(); // ✅ Single source of truth
  const { connectionState, manualRetry } = useConnectionState(projectId); // ✅
  // ...
}
```

#### Task 1.4: Update Tests
**Files:**
- `packages/web/src/features/chat/components/chat-container.test.tsx`
- `packages/web/src/features/chat/components/custom-composer.test.tsx`

**Changes:**
- Mock `useConnectionState` instead of `useChatRuntime`
- Update test assertions for new architecture

---

### Phase 2: Implement Mock Runtime (1-2 hours)

#### Task 2.1: Create Mock Runtime Hook
**File:** `packages/web/src/features/chat/hooks/use-mock-runtime.ts` (NEW)

**Implementation:**
```typescript
import { useLocalRuntime } from '@assistant-ui/react';
import { useState, useCallback } from 'react';

export function useMockRuntime(projectId: string) {
  const runtime = useLocalRuntime({
    initialMessages: [],
    maxSteps: 10,
    onNew: async (message) => {
      // Simulate AI response delay
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      // Echo back user message with mock AI response
      return {
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: `Mock AI response to: "${message.content[0].text}"\n\nProject: ${projectId}\n\nThis is a development mock. Connect to backend for real AI responses.`
          }
        ]
      };
    }
  });

  return { runtime };
}
```

#### Task 2.2: Add Development Mode Toggle
**File:** `packages/web/src/shared/pages/project.tsx`

**Changes:**
```typescript
export function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const effectiveProjectId = projectId ?? 'default-project';
  
  // Use mock runtime in development mode
  const useMock = import.meta.env.DEV && !import.meta.env.VITE_BACKEND_URL;
  const { runtime } = useMock 
    ? useMockRuntime(effectiveProjectId)
    : useChatRuntime(effectiveProjectId);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ProjectContent projectId={effectiveProjectId} />
    </AssistantRuntimeProvider>
  );
}
```

#### Task 2.3: Add Environment Variable
**File:** `.env.development` (NEW)

```bash
# Leave empty to use mock runtime
# Set to backend URL to use real backend
VITE_BACKEND_URL=

# Or for real backend:
# VITE_BACKEND_URL=http://localhost:3000
```

---

### Phase 3: Backend Integration (Deferred to Backend Team)

#### Task 3.1: Backend Requirements Document
**File:** `docs/backend/chat-api-requirements.md` (NEW)

Document requirements for backend team:
- WebSocket endpoint specification
- Message format
- Authentication flow
- Streaming protocol
- Error handling
- Skill invocation handling

#### Task 3.2: Integration Tests
Once backend is available:
- Update `use-chat-runtime` to use real endpoint
- Re-run all M2 test scenarios
- Verify WebSocket connection
- Test message streaming
- Test skill invocation

---

### Phase 4: Fix Unit Tests (1 hour)

#### Task 4.1: Update `chat-container.test.tsx`
**File:** `packages/web/src/features/chat/components/chat-container.test.tsx`

**Changes:**
```typescript
// Mock the hooks
vi.mock('@assistant-ui/react', () => ({
  useAssistantRuntime: vi.fn(() => ({
    isRunning: false,
    append: vi.fn(),
  })),
  ThreadPrimitive: {
    Root: ({ children }) => <div>{children}</div>,
    Viewport: ({ children }) => <div>{children}</div>,
    Messages: ({ children }) => <div>{children()}</div>,
    ViewportFooter: ({ children }) => <div>{children}</div>,
  },
  MessagePrimitive: {
    Root: ({ children }) => <div>{children}</div>,
    Parts: () => <div>Message content</div>,
  },
  ComposerPrimitive: {
    Root: ({ children }) => <div>{children}</div>,
    Input: () => <input />,
    Send: ({ children }) => <button>{children}</button>,
  },
  useAuiState: vi.fn(() => ({ thread: { isEmpty: true }, message: { role: 'user' } })),
  AuiIf: ({ condition, children }) => {
    const state = { thread: { isEmpty: true } };
    return condition(state) ? children : null;
  },
}));

vi.mock('@/features/chat/hooks/use-connection-state', () => ({
  useConnectionState: vi.fn(() => ({
    connectionState: {
      isConnected: true,
      error: null,
      isReconnecting: false,
    },
    manualRetry: vi.fn(),
  })),
}));
```

#### Task 4.2: Update `custom-composer.test.tsx`
**File:** `packages/web/src/features/chat/components/custom-composer.test.tsx`

**Changes:**
- Update mocks to use primitives
- Test ComposerPrimitive.Input and ComposerPrimitive.Send
- Mock runtime.append calls

---

## Testing Strategy

### Unit Tests
```bash
# Run after Phase 1 and Phase 4
npm run test
```

**Expected:**
- All chat component tests pass
- No errors about missing mock components
- Coverage maintained or improved

### E2E Tests (with Mock Runtime)
```bash
# Run after Phase 2
npm run dev
# Use agent-browser to re-run M2 test scenarios
```

**Expected:**
- ✅ M2-TEST-001: Tabbed interface (already passing)
- ✅ M2-TEST-002: Chat UI rendering (should now work)
- ⚠️ M2-TEST-003: WebSocket connection (mock only, not real WS)
- ✅ M2-TEST-004: Auto-skill invocation (should now work with mock)
- ✅ M2-TEST-005: Streaming responses (mock streaming)
- ✅ M2-TEST-006: Loading states (should work)
- ✅ M2-TEST-007: Hybrid chat mode (should work with mock)
- ⚠️ M2-TEST-008: WebSocket error handling (partial - mock errors)
- ✅ M2-TEST-009: Complete workflow (should work with mock)
- ✅ M2-TEST-010: UI layout (already passing)

### Integration Tests (with Backend)
```bash
# Run after Phase 3 (backend implementation)
VITE_BACKEND_URL=http://localhost:3000 npm run dev
# Re-run all M2 test scenarios
```

**Expected:**
- All 10 test scenarios pass
- Real WebSocket connection
- Real AI responses
- Real skill invocation

---

## Success Criteria

### Phase 1 Complete:
- [x] Code analysis done
- [ ] `useChatRuntime` refactored
- [ ] `useConnectionState` hook created
- [ ] `ChatContainer` updated
- [ ] Unit tests updated and passing
- [ ] No duplicate runtime creation

### Phase 2 Complete:
- [ ] Mock runtime implemented
- [ ] Development mode toggle added
- [ ] E2E tests pass with mock
- [ ] Messages display in UI
- [ ] Skill invocation works
- [ ] Welcome message correct

### Phase 3 Complete:
- [ ] Backend requirements documented
- [ ] Backend endpoint implemented
- [ ] Integration tests pass
- [ ] Real WebSocket connection works
- [ ] Real AI responses stream

### Phase 4 Complete:
- [ ] All unit tests pass
- [ ] Test coverage maintained
- [ ] Mocks correctly configured
- [ ] No deprecated API usage

---

## Timeline Estimate

| Phase | Tasks | Duration | Blocker? |
|-------|-------|----------|----------|
| Phase 1 | Refactor runtime architecture | 2-3 hours | No |
| Phase 2 | Implement mock runtime | 1-2 hours | No |
| Phase 3 | Backend integration | TBD | YES - External team |
| Phase 4 | Fix unit tests | 1 hour | No |

**Total Frontend Work:** 4-6 hours  
**Backend Work:** TBD (separate team/timeline)

---

## Risks and Mitigations

### Risk 1: @assistant-ui API Changes
**Probability:** Low  
**Impact:** Medium

**Mitigation:**
- Verify API against v0.12.27 documentation
- Add integration tests for @assistant-ui exports
- Pin version in package.json

### Risk 2: Mock Runtime Not Realistic Enough
**Probability:** Medium  
**Impact:** Low

**Mitigation:**
- Keep mock simple (echo responses)
- Document differences from real backend
- Switch to real backend ASAP for testing

### Risk 3: Backend Delays
**Probability:** High  
**Impact:** High

**Mitigation:**
- Use mock runtime to unblock frontend development
- Document backend API requirements clearly
- Plan M3 work that doesn't depend on chat backend

---

## Next Steps

1. **Immediate** (Today):
   - [ ] Review this fix plan with team
   - [ ] Get approval to proceed
   - [ ] Start Phase 1 implementation

2. **Short-term** (This week):
   - [ ] Complete Phases 1, 2, and 4
   - [ ] Re-run E2E tests with mock runtime
   - [ ] Document test results
   - [ ] Mark M2 as complete (with mock)

3. **Medium-term** (Next sprint):
   - [ ] Coordinate with backend team on Phase 3
   - [ ] Implement backend chat endpoint
   - [ ] Run full integration tests
   - [ ] Mark M2 as production-ready

---

## Files to Modify

### Existing Files
1. `packages/web/src/features/chat/hooks/use-chat-runtime.ts` - Simplify to return only runtime
2. `packages/web/src/features/chat/components/chat-container.tsx` - Remove duplicate runtime
3. `packages/web/src/shared/pages/project.tsx` - Add mock/real runtime toggle
4. `packages/web/src/features/chat/components/chat-container.test.tsx` - Update mocks
5. `packages/web/src/features/chat/components/custom-composer.test.tsx` - Update mocks

### New Files
1. `packages/web/src/features/chat/hooks/use-connection-state.ts` - Connection monitoring only
2. `packages/web/src/features/chat/hooks/use-mock-runtime.ts` - Mock runtime for development
3. `.env.development` - Environment configuration
4. `docs/backend/chat-api-requirements.md` - Backend API specification

---

## Appendix A: Alternative Approaches Considered

### Approach 1: Fix Current Runtime Configuration
**Pros:** Minimal code changes  
**Cons:** Still requires backend, doesn't unblock testing  
**Decision:** Not chosen - backend not ready

### Approach 2: Use Third-Party Backend
**Pros:** Faster to integrate  
**Cons:** Vendor lock-in, may not meet requirements  
**Decision:** Not chosen - custom backend needed

### Approach 3: Client-Side LLM Integration
**Pros:** No backend needed  
**Cons:** Browser performance issues, API key management  
**Decision:** Not chosen - not production-ready

### Approach 4: Mock Runtime (Chosen)
**Pros:** Unblocks development, easy to test, no backend dependency  
**Cons:** Not production-ready, must eventually integrate backend  
**Decision:** ✅ CHOSEN - Best balance of trade-offs

---

## Appendix B: Runtime Configuration Research

### @assistant-ui/react Runtime Types

**1. `useLocalRuntime`**
- Runs entirely in browser
- No backend needed
- Good for prototyping

**2. `useAssistantTransportRuntime`**
- HTTP/REST API transport
- Server-sent events (SSE) or fetch streaming
- Requires backend endpoint

**3. `useExternalStoreRuntime`**
- Custom state management
- Integrate with existing store
- Full control over message handling

**4. Custom Runtime Adapters**
- Implement `AssistantRuntime` interface
- Full customization
- Most complex

**Current Implementation:** Uses `useAssistantTransportRuntime` (Option 2)  
**Recommended for Mock:** Switch to `useLocalRuntime` (Option 1)  
**Recommended for Production:** Keep `useAssistantTransportRuntime` (Option 2)

---

## Questions for Team

1. **Priority:** Should we proceed with mock runtime or wait for backend?
2. **Backend:** Who owns the chat API backend implementation?
3. **Timeline:** What's the target date for M2 completion?
4. **M3:** Can we start M3 (Files Tab) while M2 backend is in progress?
5. **Testing:** Do we need real AI responses for M2 sign-off, or is mock sufficient?

---

## Conclusion

The M2 milestone is **90% complete** from a frontend perspective. The remaining work is primarily:
1. Fixing runtime architecture (refactoring)
2. Adding mock runtime for development
3. Waiting for backend implementation

**Recommendation:** Proceed with Phases 1, 2, and 4 immediately to unblock development and testing. Coordinate with backend team on Phase 3 timeline.
