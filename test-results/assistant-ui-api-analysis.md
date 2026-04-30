# Assistant UI API Analysis & TDD Investigation

**Date:** 2026-04-30  
**Issue:** Application fails to load due to @assistant-ui/react API mismatch  
**Question:** Why did TDD tests pass if the integration was wrong?

---

## Executive Summary

Our M2 implementation used an **outdated/non-existent API** for @assistant-ui/react, but our tests passed because they **mocked the entire library** with the expected behavior. This is a classic case where unit tests with mocks can give false confidence when the actual integration is broken.

---

## Root Cause Analysis

### What We Implemented (M2 Code)

```typescript
// chat-container.tsx - WRONG API
import { Thread, AssistantRuntimeProvider } from '@assistant-ui/react';

<Thread 
  runtime={runtime} 
  components={{ Composer: CustomComposer }} 
/>
```

```typescript
// custom-composer.tsx - WRONG API
import { Composer } from '@assistant-ui/react';

<Composer.Root>
  <Composer.Input />
  <Composer.Send />
</Composer.Root>
```

### What Actually Exists (v0.12.27)

@assistant-ui/react exports **only primitives**, not high-level components:

```typescript
// Actual exports
export * as ThreadPrimitive from "./primitives/thread.js";
export * as ComposerPrimitive from "./primitives/composer.js";
export * as MessagePrimitive from "./primitives/message.js";
export { AssistantRuntimeProvider } from "./context/index.js";
// NO Thread component!
// NO Composer namespace!
```

### What the Official Pattern Is (from assistant-ui repository)

You must **build your own Thread component** using primitives:

```typescript
// templates/default/components/assistant-ui/thread.tsx
import { ThreadPrimitive, ComposerPrimitive } from '@assistant-ui/react';

export const Thread: FC = () => {
  return (
    <ThreadPrimitive.Root>
      <ThreadPrimitive.Viewport>
        <ThreadPrimitive.Messages>
          {() => <ThreadMessage />}
        </ThreadPrimitive.Messages>
        
        <ThreadPrimitive.ViewportFooter>
          <Composer />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
};

const Composer: FC = () => {
  return (
    <ComposerPrimitive.Root>
      <ComposerPrimitive.Input placeholder="Send a message..." />
      <ComposerPrimitive.Send>Send</ComposerPrimitive.Send>
    </ComposerPrimitive.Root>
  );
};
```

---

## Why Tests Passed: The Mock Problem

### Test Mock Structure

```typescript
// chat-container.test.tsx
vi.mock('@assistant-ui/react', () => ({
  // ❌ We mocked a component that doesn't exist!
  Thread: vi.fn(({ runtime, components }) => (
    <div data-testid="mock-thread">
      Thread component (runtime provided: {runtime ? 'yes' : 'no'})
    </div>
  )),
  
  // ❌ We mocked a namespace that doesn't exist!
  Composer: {
    Root: vi.fn(({ children }) => <div>{children}</div>),
    Input: vi.fn(({ placeholder }) => <input placeholder={placeholder} />),
    Send: vi.fn(({ children }) => <button>{children}</button>),
  },
}));
```

### The TDD Failure Mode

1. **Unit tests with mocks** test the contract between our code and the library
2. **Mocks define what we EXPECT the API to be**, not what it actually is
3. **Tests pass** as long as our code calls the mocked API correctly
4. **Integration breaks** because the real library has a different API

### What We Should Have Done

**Integration tests** or at least **one test that imports the real library**:

```typescript
// integration.test.tsx - This would have caught it!
import { ThreadPrimitive } from '@assistant-ui/react'; // Real import

it('should have ThreadPrimitive.Root', () => {
  expect(ThreadPrimitive.Root).toBeDefined();
});

it('should NOT have Thread component', () => {
  const lib = require('@assistant-ui/react');
  expect(lib.Thread).toBeUndefined(); // ✅ This would FAIL
});
```

---

## TDD Lessons Learned

### What Went Wrong

1. **Over-mocking**: We mocked the entire external library
2. **No integration layer tests**: No tests verified the real API exists
3. **Assumed API stability**: We wrote code without checking actual exports
4. **Mock-first development**: Tests shaped mocks instead of reality shaping tests

### Better TDD Approach

#### ✅ Do: Test Adapters/Wrappers

```typescript
// Create a thin wrapper that we control
// src/lib/assistant-ui/thread.tsx
export { Thread } from './thread-component';

// Test the wrapper exists
// src/lib/assistant-ui/thread.test.tsx
import { Thread } from './thread';
expect(Thread).toBeDefined();
```

#### ✅ Do: Integration Smoke Tests

```typescript
// tests/integration/assistant-ui.test.tsx
import * as AssistantUI from '@assistant-ui/react';

describe('assistant-ui integration', () => {
  it('exports required primitives', () => {
    expect(AssistantUI.ThreadPrimitive).toBeDefined();
    expect(AssistantUI.ComposerPrimitive).toBeDefined();
    expect(AssistantUI.MessagePrimitive).toBeDefined();
  });
});
```

#### ✅ Do: Mock Only Your Code

```typescript
// Test chat-container by mocking OUR wrapper, not the library
vi.mock('@/components/assistant-ui/thread', () => ({
  Thread: vi.fn(() => <div>Mock Thread</div>)
}));
```

#### ❌ Don't: Mock External Libraries Directly

```typescript
// BAD: Mocking external API creates false confidence
vi.mock('@assistant-ui/react', () => ({ ... }));
```

---

## The Correct Implementation Pattern

### 1. Runtime Provider (Already Correct)

```typescript
// MyRuntimeProvider.tsx
import { AssistantRuntimeProvider, useAssistantTransportRuntime } from '@assistant-ui/react';

export function MyRuntimeProvider({ children }) {
  const runtime = useAssistantTransportRuntime({
    api: '/api/chat',
    // ... config
  });
  
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
```

### 2. Build Custom Thread Component

```typescript
// src/shared/components/assistant-ui/thread.tsx
import { ThreadPrimitive, ComposerPrimitive } from '@assistant-ui/react';

export function Thread() {
  return (
    <ThreadPrimitive.Root className="flex h-full flex-col">
      <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto">
        <ThreadPrimitive.Messages>
          {() => <Message />}
        </ThreadPrimitive.Messages>
        
        <ThreadPrimitive.ViewportFooter>
          <CustomComposer />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}
```

### 3. Use Primitives for Composer

```typescript
// src/features/chat/components/custom-composer.tsx
import { ComposerPrimitive } from '@assistant-ui/react';

export function CustomComposer() {
  return (
    <ComposerPrimitive.Root className="flex gap-2 border rounded-lg p-2">
      <ComposerPrimitive.Input 
        placeholder="Answer the question or ask your own..."
        className="flex-1"
      />
      <ComposerPrimitive.Send className="px-4 py-2">
        Send
      </ComposerPrimitive.Send>
    </ComposerPrimitive.Root>
  );
}
```

### 4. Build Message Components

```typescript
// message.tsx
import { MessagePrimitive } from '@assistant-ui/react';

function Message() {
  const role = useAuiState((s) => s.message.role);
  
  if (role === 'user') return <UserMessage />;
  return <AssistantMessage />;
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root>
      <MessagePrimitive.Parts>
        {({ part }) => {
          if (part.type === 'text') return <MarkdownText />;
          if (part.type === 'tool-call') return <ToolUI {...part} />;
          return null;
        }}
      </MessagePrimitive.Parts>
    </MessagePrimitive.Root>
  );
}
```

---

## Fix Action Plan

### Phase 1: Create Base Thread Component ✅
- [ ] Create `src/shared/components/assistant-ui/thread.tsx`
- [ ] Implement using ThreadPrimitive, MessagePrimitive, ComposerPrimitive
- [ ] Copy patterns from assistant-ui templates/default

### Phase 2: Update Custom Composer ✅
- [x] Fix `custom-composer.tsx` to use ComposerPrimitive (DONE)
- [ ] Test composer renders correctly

### Phase 3: Update Chat Container ✅
- [ ] Replace Thread import with our custom Thread component
- [ ] Remove `components` prop (no longer needed)
- [ ] Verify AssistantRuntimeProvider still works

### Phase 4: Fix Tests 🔴
- [ ] Remove mocks for @assistant-ui/react exports that don't exist
- [ ] Add integration test that imports real library
- [ ] Update mocks to match primitive-based API
- [ ] Add smoke tests for actual API surface

### Phase 5: Verify E2E ✅
- [ ] Run dev server
- [ ] Test all 10 M2 scenarios
- [ ] Document results

---

## Prevention Strategy

### Going Forward

1. **Check actual exports before writing code**
   ```bash
   cat node_modules/@assistant-ui/react/dist/index.d.ts | grep "export"
   ```

2. **Add library integration tests**
   ```typescript
   // tests/integration/external-apis.test.ts
   import * as AssistantUI from '@assistant-ui/react';
   
   test('assistant-ui exports', () => {
     expect(AssistantUI.ThreadPrimitive).toBeDefined();
   });
   ```

3. **Document external API dependencies**
   ```yaml
   # docs/external-apis.yaml
   assistant-ui:
     version: "^0.12.26"
     exports_used:
       - ThreadPrimitive
       - ComposerPrimitive
       - MessagePrimitive
       - AssistantRuntimeProvider
     docs: https://www.assistant-ui.com/docs
   ```

4. **Test against real library periodically**
   - Run E2E tests as part of CI
   - Manual QA checks before milestone completion
   - Consider contract testing for critical external APIs

---

## Conclusion

**Root Cause**: We implemented against a non-existent API  
**Why Tests Passed**: We mocked the non-existent API perfectly  
**Lesson**: Mocks test our code, not reality - need integration tests  
**Fix**: Build custom Thread component using actual Primitive-based API  
**Prevention**: Test real library exports, reduce mocking of external dependencies
