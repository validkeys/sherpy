---
id: assistant-ui-integration
name: Assistant UI Integration Pattern
category: Chat
tags: [assistant-ui, chat, streaming, websocket]
created: 2026-04-28
---

## Overview

Integration pattern for @assistant-ui/react for chat functionality with streaming AI responses. Handles WebSocket connections, message state, and streaming UI automatically.

## Source Reference

**Pattern**: @assistant-ui/react
**Documentation**: https://www.assistant-ui.com/docs
**GitHub**: https://github.com/Yonom/assistant-ui

## Code Example

```typescript
// features/chat/components/chat-container.tsx

import { Thread, useAssistantRuntime } from '@assistant-ui/react';
import { useWebSocketRuntime } from '@assistant-ui/react/websocket';
import { useEffect } from 'react';

export const ChatContainer = ({ projectId }: { projectId: string }) => {
  // Create WebSocket runtime for streaming
  const runtime = useWebSocketRuntime({
    url: `/ws?token=${getAuthToken()}&projectId=${projectId}`,
    onError: (error) => {
      console.error('WebSocket error:', error);
    },
  });

  return (
    <div className="flex h-full flex-col">
      {/* Thread handles message display and streaming */}
      <Thread
        runtime={runtime}
        className="flex-1 overflow-y-auto"
        welcome={{
          message: "Let's start the sherpy workflow. I'll guide you through each step.",
        }}
        assistantAvatar={{
          src: '/logo.svg',
          alt: 'Sherpy Assistant',
        }}
        userAvatar={{
          fallback: 'U',
        }}
      />
    </div>
  );
};
```

## Custom Message Components

```typescript
// features/chat/components/custom-message.tsx

import {
  AssistantMessage,
  useMessage,
  useMessageContext,
} from '@assistant-ui/react';

export const CustomAssistantMessage = () => {
  const message = useMessage();
  const context = useMessageContext();

  return (
    <AssistantMessage.Root className="mb-4 flex gap-3">
      <AssistantMessage.Avatar className="h-8 w-8 rounded-full" />
      
      <div className="flex-1">
        <AssistantMessage.Content
          className="prose dark:prose-invert"
          components={{
            // Custom rendering for code blocks, lists, etc.
            code: ({ className, children, ...props }) => (
              <code className={cn('rounded bg-muted px-1', className)} {...props}>
                {children}
              </code>
            ),
          }}
        />
        
        {/* Show streaming indicator */}
        {message.status === 'streaming' && (
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="animate-pulse">●</span>
            Thinking...
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-2 flex gap-2">
          <AssistantMessage.Copy />
          <AssistantMessage.Reload />
        </div>
      </div>
    </AssistantMessage.Root>
  );
};
```

## Programmatic Message Sending

```typescript
// features/chat/hooks/use-chat-actions.ts

import { useAssistantRuntime } from '@assistant-ui/react';

export const useChatActions = () => {
  const runtime = useAssistantRuntime();

  const sendMessage = (content: string) => {
    runtime.append({
      role: 'user',
      content: [{ type: 'text', text: content }],
    });
  };

  const sendSystemMessage = (content: string) => {
    runtime.append({
      role: 'system',
      content: [{ type: 'text', text: content }],
    });
  };

  const clearMessages = () => {
    runtime.switchToNewThread();
  };

  return {
    sendMessage,
    sendSystemMessage,
    clearMessages,
  };
};
```

## Usage with Auto-Skill Invocation

```typescript
// features/sidebar/components/step-button.tsx

import { useChatActions } from '@/features/chat/hooks/use-chat-actions';

export const StepButton = ({ step, projectId }: Props) => {
  const { sendMessage } = useChatActions();
  const updateProject = useUpdateProject();

  const handleStepClick = async () => {
    // Update project pipeline status
    await updateProject.mutateAsync({
      projectId,
      data: { pipelineStatus: step.id },
    });

    // Auto-invoke skill via chat
    sendMessage(`Continue Sherpy Flow from Step ${step.number}: ${step.name}`);
  };

  return (
    <button onClick={handleStepClick}>
      {step.name}
    </button>
  );
};
```

## What This Demonstrates

- **Streaming UI**: Automatic handling of streaming responses
- **WebSocket Integration**: Built-in WebSocket connection management
- **Message State**: Managed message history and state
- **Custom Components**: Ability to customize message rendering
- **Programmatic Control**: Send messages and control thread from code
- **Error Handling**: Built-in error states and retry logic

## When to Use

- When building chat interfaces with AI assistants
- When you need streaming response UI
- When implementing guided workflows with chat
- When managing WebSocket connections for real-time communication

## Pattern Requirements

✓ Use `useWebSocketRuntime` or `useLocalRuntime` to create runtime
✓ Wrap chat UI with `Thread` component from @assistant-ui/react
✓ Pass `runtime` prop to Thread component
✓ Use `useAssistantRuntime()` hook to access runtime programmatically
✓ Handle WebSocket authentication in URL params or headers
✓ Customize message components by passing custom components to Thread
✓ Use `runtime.append()` to send messages programmatically
✓ Use `runtime.switchToNewThread()` to clear conversation

## Common Mistakes to Avoid

❌ Not handling WebSocket authentication (passes token in connection)
❌ Storing messages in separate state (runtime handles it)
❌ Not handling WebSocket reconnection on disconnect
❌ Trying to manually manage streaming state (runtime does this)
❌ Not customizing message components for brand consistency
❌ Forgetting to cleanup WebSocket connection on unmount
❌ Not showing loading/streaming indicators to user

## Related Anchors

- `websocket-connection-management` - Managing WebSocket lifecycle
- `feature-module-structure` - Where chat feature code belongs
- `react-query-api-layer` - Fetching chat history from API

## Test Coverage

**Chat Integration Test**:
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatContainer } from './chat-container';
import { mockWebSocket } from '@/test/mocks/websocket';

describe('ChatContainer', () => {
  it('renders chat thread', () => {
    render(<ChatContainer projectId="test-project" />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('sends message on submit', async () => {
    const user = userEvent.setup();
    const ws = mockWebSocket();
    
    render(<ChatContainer projectId="test-project" />);
    
    const input = screen.getByRole('textbox');
    await user.type(input, 'Hello{enter}');
    
    await waitFor(() => {
      expect(ws.send).toHaveBeenCalledWith(
        expect.stringContaining('Hello')
      );
    });
  });

  it('displays streaming response', async () => {
    const ws = mockWebSocket();
    render(<ChatContainer projectId="test-project" />);
    
    // Simulate streaming chunks
    ws.simulateMessage({ type: 'delta', content: 'Hello' });
    ws.simulateMessage({ type: 'delta', content: ' world' });
    
    await waitFor(() => {
      expect(screen.getByText(/Hello world/)).toBeInTheDocument();
    });
  });
});
```
