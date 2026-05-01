# WebSocket Testing Strategy

## Overview

This document outlines the testing strategy for WebSocket connections and streaming chat functionality in the JARVIS AI Assistant project. Our approach uses mocking to test WebSocket-dependent features without requiring real WebSocket servers, ensuring fast, reliable, and isolated tests.

## Challenges with WebSocket Testing

Testing WebSocket connections presents several unique challenges:

1. **Asynchronous Nature**: Messages arrive asynchronously, making timing and state synchronization complex
2. **Connection Lifecycle**: Open, close, error, and reconnection events must be tested
3. **Streaming Responses**: AI assistant responses stream in chunks over time
4. **Integration with @assistant-ui**: The `@assistant-ui/react` library manages WebSocket runtime state
5. **Test Isolation**: Real WebSocket connections would require a test server and could interfere with parallel tests

## Mocking Strategy

### Core Approach

We mock the WebSocket runtime at the **@assistant-ui/react integration layer** rather than mocking the raw WebSocket API. This approach:

- Tests our integration code without external dependencies
- Maintains fast test execution
- Ensures test isolation
- Allows simulation of various connection states and error scenarios

### Mock Location

The primary mock is located at:
```
packages/web/src/test/mocks/websocket-mock.ts
```

### Mock Structure

```typescript
export const createMockWebSocketRuntime = () => {
  return {
    append: vi.fn(async (message) => {
      return { id: 'mock-message-id', ...message };
    }),
    switchToNewThread: vi.fn(),
    messages: [],
    isRunning: false,
    subscribe: vi.fn(() => () => {}),
  };
};
```

## Testing Patterns

### Pattern 1: Testing Message Sending

**Purpose**: Verify that user messages are sent through the runtime correctly

**Implementation**:
```typescript
import { vi } from 'vitest';

vi.mock('@assistant-ui/react', () => ({
  useAssistantTransportRuntime: vi.fn(),
}));

it('sends user message through runtime', async () => {
  const mockRuntime = createMockWebSocketRuntime();
  mockUseAssistantTransportRuntime.mockReturnValue(mockRuntime);
  
  const { result } = renderHook(() => useChatRuntime(projectId));
  
  await act(async () => {
    await result.current.runtime.append({
      role: 'user',
      content: 'Hello',
    });
  });
  
  expect(mockRuntime.append).toHaveBeenCalledWith({
    role: 'user',
    content: 'Hello',
  });
});
```

**Key Points**:
- Mock the `@assistant-ui/react` module at the module level
- Use `renderHook` from `@testing-library/react` to test custom hooks
- Wrap async operations in `act()` to ensure state updates are flushed
- Verify the `append` method was called with correct data

### Pattern 2: Testing Streaming Responses

**Purpose**: Simulate and verify streaming AI responses

**Implementation**:
```typescript
it('handles streaming response chunks', async () => {
  const mockRuntime = {
    ...createMockWebSocketRuntime(),
    messages: [],
    isRunning: false,
  };
  
  mockUseAssistantTransportRuntime.mockReturnValue(mockRuntime);
  
  const { result } = renderHook(() => useChatRuntime(projectId));
  
  // Simulate streaming state
  act(() => {
    mockRuntime.isRunning = true;
    mockRuntime.messages = [
      { id: '1', role: 'assistant', content: 'Hello' },
    ];
  });
  
  expect(result.current.runtime.isRunning).toBe(true);
  expect(result.current.runtime.messages).toHaveLength(1);
  
  // Simulate stream completion
  act(() => {
    mockRuntime.isRunning = false;
    mockRuntime.messages = [
      { id: '1', role: 'assistant', content: 'Hello, how can I help?' },
    ];
  });
  
  expect(result.current.runtime.isRunning).toBe(false);
  expect(result.current.runtime.messages[0].content).toContain('help');
});
```

**Key Points**:
- Mutate mock runtime state to simulate streaming
- Update `isRunning` flag to reflect streaming status
- Progressively update message content to simulate chunks
- Verify component reacts correctly to state changes

### Pattern 3: Testing Connection Failures

**Purpose**: Verify error handling and user feedback when connections fail

**Implementation**:
```typescript
it('handles connection failures gracefully', async () => {
  const mockRuntime = createMockWebSocketRuntime();
  mockUseAssistantTransportRuntime.mockReturnValue(mockRuntime);
  
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  
  renderHook(() => useChatRuntime(projectId));
  
  // Get the onError handler from the runtime config
  const transportOptions = mockUseAssistantTransportRuntime.mock.calls[0][0];
  const mockError = new Error('WebSocket connection failed');
  
  act(() => {
    transportOptions.onError(mockError);
  });
  
  // Verify error handling
  expect(consoleErrorSpy).toHaveBeenCalledWith('Chat transport error:', mockError);
  
  consoleErrorSpy.mockRestore();
});
```

**Key Points**:
- Extract the error handler from runtime configuration
- Spy on `console.error` to verify error logging
- Trigger errors explicitly via the error handler
- Clean up spies after test completion

### Pattern 4: Testing Reconnection Logic

**Purpose**: Verify automatic reconnection behavior after connection loss

**Implementation**:
```typescript
it('attempts reconnection after connection loss', async () => {
  vi.useFakeTimers();
  
  const mockRuntime = createMockWebSocketRuntime();
  mockUseAssistantTransportRuntime.mockReturnValue(mockRuntime);
  
  const { result } = renderHook(() => useChatRuntime(projectId));
  
  // Simulate connection error
  const transportOptions = mockUseAssistantTransportRuntime.mock.calls[0][0];
  act(() => {
    transportOptions.onError(new Error('Connection lost'));
  });
  
  // Fast-forward time to trigger reconnection
  act(() => {
    vi.advanceTimersByTime(5000);
  });
  
  // Verify reconnection attempt (implementation-specific)
  // This depends on your reconnection strategy
  
  vi.useRealTimers();
});
```

**Key Points**:
- Use `vi.useFakeTimers()` to control time in tests
- Advance time with `vi.advanceTimersByTime()` to trigger timeouts
- Always restore real timers with `vi.useRealTimers()` after test
- Clean up timers on unmount to prevent leaks

### Pattern 5: Testing Runtime Configuration

**Purpose**: Verify WebSocket runtime is configured with correct parameters

**Implementation**:
```typescript
it('configures runtime with authentication headers', async () => {
  const mockGetAuthToken = vi.fn(() => 'test-token-123');
  vi.mock('@/lib/websocket', () => ({
    getAuthToken: mockGetAuthToken,
  }));
  
  renderHook(() => useChatRuntime(projectId));
  
  const transportOptions = mockUseAssistantTransportRuntime.mock.calls[0][0];
  const headers = await transportOptions.headers();
  
  expect(headers).toEqual({
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test-token-123',
    'X-Project-Id': projectId,
  });
});
```

**Key Points**:
- Mock authentication utilities to control token values
- Extract configuration from mock call arguments
- Verify headers, URLs, and other configuration values
- Test both authenticated and unauthenticated scenarios

## Integration with React Query

WebSocket connections handle **streaming** while React Query handles **persistence**. This separation of concerns is important for testing:

### Streaming (WebSocket)
- Real-time message delivery
- AI response streaming
- Connection state management
- Tested with mock runtimes

### Persistence (React Query)
- Message history loading
- Project state restoration
- Cache management
- Tested with MSW or fetch mocks

### Combined Testing Example

```typescript
it('integrates streaming with message persistence', async () => {
  // Mock React Query API
  const mockUseMessages = vi.fn(() => ({
    data: { messages: historicalMessages },
    isLoading: false,
  }));
  
  // Mock WebSocket runtime
  const mockRuntime = createMockWebSocketRuntime();
  mockUseAssistantTransportRuntime.mockReturnValue(mockRuntime);
  
  const { result } = renderHook(() => useChatIntegration(projectId));
  
  // Historical messages loaded via React Query
  expect(result.current.messages).toEqual(historicalMessages);
  
  // New message sent via WebSocket
  await act(async () => {
    await result.current.sendMessage('New message');
  });
  
  expect(mockRuntime.append).toHaveBeenCalled();
});
```

## Testing Component Integration

### Testing with @assistant-ui Components

When testing components that use `@assistant-ui/react` components like `Thread` or `Composer`:

```typescript
import { AssistantRuntimeProvider } from '@assistant-ui/react';

it('renders chat UI with mock runtime', () => {
  const mockRuntime = createMockWebSocketRuntime();
  
  const { getByRole } = render(
    <AssistantRuntimeProvider runtime={mockRuntime}>
      <ChatView projectId={projectId} />
    </AssistantRuntimeProvider>
  );
  
  expect(getByRole('textbox')).toBeInTheDocument();
});
```

### Testing Loading States

```typescript
it('shows loading indicator during message send', async () => {
  const mockRuntime = {
    ...createMockWebSocketRuntime(),
    isRunning: true,
  };
  
  const { getByText } = render(
    <AssistantRuntimeProvider runtime={mockRuntime}>
      <ChatView projectId={projectId} />
    </AssistantRuntimeProvider>
  );
  
  expect(getByText(/sending/i)).toBeInTheDocument();
});
```

## Best Practices

### 1. Mock at the Right Level
- **Do**: Mock `@assistant-ui/react` integration layer
- **Don't**: Mock raw WebSocket APIs or browser APIs
- **Reason**: Tests integration code, not third-party libraries

### 2. Use Test Utilities
- Always use `createTestQueryClient()` from `@/test/utils`
- Use `renderHook` for custom hooks
- Use `render` from test utils for components
- Wrap async operations in `act()`

### 3. Clean Up Resources
```typescript
afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});
```

### 4. Test Realistic Scenarios
- Test the happy path (successful message send)
- Test network failures
- Test timeout scenarios
- Test reconnection attempts
- Test with and without authentication

### 5. Avoid Test Flakiness
- Use fake timers instead of real delays
- Use `waitFor` for async assertions
- Clear mocks between tests
- Don't rely on global state

### 6. Isolate Tests
- Each test should set up its own mocks
- Don't share mocks between tests
- Use `beforeEach` to reset state
- Clean up in `afterEach`

## Common Pitfalls

### Pitfall 1: Not Wrapping Async Operations in `act()`
```typescript
// ❌ Bad
await result.current.sendMessage('test');

// ✅ Good
await act(async () => {
  await result.current.sendMessage('test');
});
```

### Pitfall 2: Forgetting to Mock Dependencies
```typescript
// ❌ Bad - WebSocket utilities not mocked
renderHook(() => useChatRuntime(projectId));

// ✅ Good - All dependencies mocked
vi.mock('@/lib/websocket', () => ({
  getWebSocketUrl: vi.fn(() => 'ws://test'),
}));
renderHook(() => useChatRuntime(projectId));
```

### Pitfall 3: Not Cleaning Up Timers
```typescript
// ❌ Bad - Timers leak into other tests
it('test with timers', () => {
  vi.useFakeTimers();
  // test code
});

// ✅ Good - Timers cleaned up
it('test with timers', () => {
  vi.useFakeTimers();
  // test code
  vi.useRealTimers();
});
```

### Pitfall 4: Testing Implementation Details
```typescript
// ❌ Bad - Testing internal state
expect(hook.internalState.websocketConnection).toBeTruthy();

// ✅ Good - Testing observable behavior
expect(screen.getByText('Connected')).toBeInTheDocument();
```

## Example Test Suite Structure

```typescript
describe('useChatRuntime', () => {
  let mockRuntime: any;
  let mockUseAssistantTransportRuntime: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRuntime = createMockWebSocketRuntime();
    mockUseAssistantTransportRuntime.mockReturnValue(mockRuntime);
  });

  describe('initialization', () => {
    it('creates runtime with correct configuration', () => {
      // test
    });
  });

  describe('message sending', () => {
    it('sends messages through runtime', async () => {
      // test
    });

    it('handles send errors', async () => {
      // test
    });
  });

  describe('connection management', () => {
    it('handles connection errors', () => {
      // test
    });

    it('attempts reconnection', () => {
      // test
    });
  });

  describe('state updates', () => {
    it('updates on new messages', () => {
      // test
    });

    it('updates on streaming start/stop', () => {
      // test
    });
  });
});
```

## Tools and Libraries

### Required Dependencies
- `vitest` - Test runner
- `@testing-library/react` - React component testing
- `@testing-library/react-hooks` - Hook testing utilities (deprecated, use renderHook from @testing-library/react)
- `@testing-library/user-event` - User interaction simulation

### Mock Configuration
Mocks are configured in:
- `packages/web/src/test/mocks/websocket-mock.ts` - WebSocket runtime mocks
- Test files using `vi.mock()` for module-level mocking

### Test Utilities
Located at `packages/web/src/test/utils.tsx`:
- `createTestQueryClient()` - Creates isolated React Query client
- `render()` - Custom render with providers

## Running Tests

```bash
# Run all tests
cd packages/web && pnpm test --run

# Run specific test file
pnpm test --run websocket-mock.test.ts

# Run with coverage
pnpm test --run --coverage

# Watch mode for development
pnpm test
```

## Future Enhancements

### Potential Improvements
1. **WebSocket Mock Server**: For more realistic integration tests, consider `mock-socket` library
2. **E2E Tests**: Use Playwright or Cypress to test real WebSocket connections
3. **Performance Testing**: Add tests for message throughput and latency
4. **Load Testing**: Simulate multiple concurrent connections
5. **Network Condition Simulation**: Test with throttled or unstable connections

### Migration Path
If we decide to use a real WebSocket mock server:

1. Install `mock-socket` package
2. Create server setup in test configuration
3. Update tests to connect to mock server
4. Keep current mocks for unit tests, use mock server for integration tests

## Conclusion

This testing strategy provides a robust foundation for testing WebSocket functionality without the complexity of real WebSocket servers. By mocking at the integration layer, we maintain fast, reliable, and isolated tests while still verifying that our code correctly integrates with the @assistant-ui runtime.

Key takeaways:
- Mock at the @assistant-ui integration layer
- Test observable behavior, not implementation details
- Use fake timers for time-dependent tests
- Clean up resources in afterEach
- Separate concerns: WebSocket for streaming, React Query for persistence

For questions or improvements to this strategy, please discuss with the team or update this document.
