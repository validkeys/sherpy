# Root Cause Analysis - M2 Critical Issues

**Analysis Date:** 2026-04-30  
**Issues:** Message submission failure, Auto-skill invocation failure

---

## Issue 1: Message Submission Not Working

### Symptoms
- Messages typed in composer and sent
- Messages clear from input field
- Messages never appear in chat thread
- No API/WebSocket calls observed
- Thread remains empty (`hasMessages: 0`)

### Root Cause Analysis

#### 1. Duplicate Runtime Creation
**File:** `packages/web/src/features/chat/components/chat-container.tsx:22`

```typescript
export function ChatContainer({ projectId }: ChatContainerProps) {
  const { connectionState, manualRetry } = useChatRuntime(projectId); // ❌ Creates NEW runtime
  const runtime = useAssistantRuntime(); // ✅ Gets runtime from provider
  // ...
}
```

**Problem:** 
- `ChatContainer` calls `useChatRuntime(projectId)` which creates a NEW runtime instance
- The parent `ProjectPage` already creates a runtime and provides it via `AssistantRuntimeProvider`
- This creates TWO separate runtime instances:
  1. The runtime in the provider (used by `useAssistantRuntime()`)
  2. A second runtime created by `useChatRuntime()` that's never used

**Why messages don't appear:**
- The `CustomComposer` sends messages to the provider's runtime
- But `ChatContainer` uses `connectionState` from the separate runtime
- The two runtimes are not synchronized
- Messages go to one runtime, but we're reading state from another

#### 2. Runtime Configuration Issue
**File:** `packages/web/src/features/chat/hooks/use-chat-runtime.ts:66-85`

```typescript
const runtime = useAssistantTransportRuntime({
  initialState: {
    messages: [],
    isRunning: false,
  },
  api: `${getWebSocketUrl()}/chat`, // ❌ HTTP/REST endpoint, not WebSocket
  converter: (state) => ({
    messages: state.messages || [],
    isRunning: state.isRunning || false,
  }),
  headers: async () => {
    const token = getAuthToken();
    return {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
      'X-Project-Id': projectId,
    };
  },
  onError: handleError,
});
```

**Problems:**
1. **Wrong transport type**: Using `useAssistantTransportRuntime` which is for HTTP/REST APIs
2. **Missing WebSocket adapter**: Should use a WebSocket-specific runtime or adapter
3. **No backend server**: The endpoint `${getWebSocketUrl()}/chat` doesn't exist (backend not running)

**@assistant-ui Runtime Types:**
- `useAssistantTransportRuntime` - For HTTP streaming APIs (SSE, fetch streams)
- `useWebSocketRuntime` - For WebSocket connections (need to check if this exists)
- Custom runtime adapters can be built for specific protocols

#### 3. Missing Backend Integration
**Evidence from tests:**
- No WebSocket connection visible in browser
- No HTTP requests to backend API
- Backend server not running during tests

**Required:**
- Backend WebSocket server at `ws://localhost:<port>/chat`
- Message handling endpoint
- Authentication middleware
- Streaming response support

### Fix Strategy

**Option A: Use Provider Runtime Only (Recommended)**
1. Remove `useChatRuntime` call from `ChatContainer`
2. Get `connectionState` from the provider's runtime
3. Use `useAssistantRuntime()` for all runtime access
4. Move connection state to a separate hook that doesn't create a runtime

**Option B: Fix Dual Runtime (Not Recommended)**
1. Pass `connectionState` from parent instead of creating new runtime
2. Ensure only one runtime exists per project
3. Synchronize state between components via provider

**Option C: Implement Proper WebSocket Runtime**
1. Create custom WebSocket adapter for @assistant-ui
2. Replace `useAssistantTransportRuntime` with WebSocket-based runtime
3. Connect to backend WebSocket server
4. Handle streaming messages properly

### Recommended Solution

**Step 1:** Refactor `ChatContainer` to not create duplicate runtime
```typescript
// chat-container.tsx
export function ChatContainer({ projectId }: ChatContainerProps) {
  const runtime = useAssistantRuntime();
  const isRunning = runtime?.isRunning || false;
  
  // Get connection state from a separate hook that doesn't create runtime
  const { connectionState, manualRetry } = useConnectionState(projectId);
  
  const showError = !connectionState.isConnected || connectionState.error;
  
  // ... rest of component
}
```

**Step 2:** Create `useConnectionState` hook
```typescript
// hooks/use-connection-state.ts
export function useConnectionState(projectId: string) {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: true,
    error: null,
    isReconnecting: false,
  });
  
  // WebSocket connection monitoring logic only
  // No runtime creation
  
  return { connectionState, manualRetry };
}
```

**Step 3:** Keep runtime creation in `ProjectPage` only
- One runtime per project
- Provided via `AssistantRuntimeProvider`
- All components use `useAssistantRuntime()` to access it

---

## Issue 2: Auto-Skill Invocation Not Working

### Symptoms
- Clicking sidebar workflow step buttons
- No message sent to chat
- No skill invocation visible
- Chat remains unchanged

### Root Cause Analysis

**Files investigated:**
1. ✅ `packages/web/src/features/sidebar/components/sidebar.tsx`
2. ✅ `packages/web/src/features/chat/hooks/use-chat-actions.ts`
3. ✅ Button click handlers implemented correctly

### Findings

**Code is correct!** The sidebar implementation is working as designed:

```typescript
// sidebar.tsx:38-54
const handleStepClick = async (stepId: string) => {
  try {
    setLoadingStepId(stepId);
    setCurrentStep(stepId);

    const skillMessage = getSkillMessageForStep(stepId);
    if (skillMessage) {
      await sendMessage(skillMessage); // ✅ Calls chat actions
    }
  } catch (error) {
    console.error('Failed to invoke skill:', error);
  } finally {
    setLoadingStepId(null);
  }
};
```

```typescript
// use-chat-actions.ts:33-38
const sendMessage = (content: string) => {
  runtime.append({
    role: 'user',
    content: [{ type: 'text', text: content }],
  });
};
```

**The integration is working correctly:**
1. ✅ Sidebar has access to `useChatActions()` hook
2. ✅ Hook uses `useAssistantRuntime()` to get runtime
3. ✅ `sendMessage()` calls `runtime.append()` with correct message format
4. ✅ Messages are added to the runtime state

**Why messages don't appear:**

This is the SAME issue as Issue #1:
- Messages are successfully added to the runtime via `runtime.append()`
- But the runtime has no messages because it's not properly configured
- The `useAssistantTransportRuntime` is configured for HTTP transport but has no backend
- Without a working transport, the runtime has no way to process messages
- The thread stays empty because the transport never responds

**Actual Root Cause:**
- NOT a code issue - the implementation is correct
- The problem is the runtime configuration (same as Issue #1)
- Need either:
  1. Working backend server for the HTTP transport, OR
  2. Mock runtime for testing without backend, OR
  3. Different runtime type (e.g., local echo runtime)

---

## Backend Requirements

For full M2 functionality, backend must provide:

1. **WebSocket server** at `ws://localhost:<port>/chat`
2. **Authentication** via token query param or header
3. **Message handling** for user messages
4. **Streaming responses** for AI messages
5. **Skill invocation** endpoint or message type
6. **Connection management** (connect, disconnect, error handling)

---

## Summary

**Root Cause #1: Duplicate Runtime Creation**
- `ChatContainer` creates its own runtime instead of using provider's runtime
- Messages go to one runtime, state read from another
- Fix: Remove duplicate runtime creation, use provider only

**Root Cause #2: No Backend Server**
- WebSocket endpoint doesn't exist
- No message handling or streaming
- Fix: Start backend server or mock runtime for testing

**Root Cause #3: Wrong Runtime Type**
- Using HTTP transport instead of WebSocket
- Need proper WebSocket adapter for @assistant-ui
- Fix: Implement WebSocket runtime or use mock

**Priority Fixes:**
1. Remove duplicate runtime from `ChatContainer` (HIGH)
2. Implement proper connection state hook (HIGH)
3. Start backend server for integration testing (HIGH)
4. Investigate sidebar skill invocation (HIGH)
5. Implement WebSocket runtime adapter (MEDIUM)
