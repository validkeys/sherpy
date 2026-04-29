# UI Refactor Feature Mapping

## Overview

This document maps our specific UI refactor requirements (sidebar, chat) to the bulletproof-react patterns documented in `bulletproof-react-style-anchors.md`.

## Feature: Sidebar

### Proposed Structure

```
src/features/sidebar/
├── api/
│   ├── get-user-preferences.ts      # Fetch user sidebar preferences
│   └── update-user-preferences.ts   # Save sidebar state to server
├── components/
│   ├── sidebar.tsx                  # Main sidebar container
│   ├── sidebar-header.tsx           # Logo and header section
│   ├── sidebar-nav.tsx              # Navigation menu
│   ├── sidebar-nav-item.tsx         # Individual nav items
│   ├── sidebar-footer.tsx           # User profile section
│   └── sidebar-collapse-toggle.tsx  # Toggle button component
├── hooks/
│   └── use-sidebar-shortcuts.ts     # Keyboard shortcuts for sidebar
└── stores/
    └── sidebar-store.ts             # jotai atoms for sidebar state
```

### State Management Strategy

**Client State (jotai atoms in `sidebar-store.ts`)**:
```typescript
// Immediate UI state - no server sync needed
export const sidebarCollapsedAtom = atom(false);
export const sidebarWidthAtom = atom(240);
export const sidebarHoverAtom = atom(false);
```

**Server State (react-query)**:
```typescript
// User preferences persisted to server
export const useUserPreferences = () => {
  return useQuery({
    queryKey: ['user', 'preferences', 'sidebar'],
    queryFn: getUserPreferences,
  });
};

export const useUpdatePreferences = () => {
  return useMutation({
    mutationFn: updateUserPreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'preferences'] });
    },
  });
};
```

**When to use which**:
- `sidebarCollapsedAtom` - Immediate toggle, syncs to server with debounce
- `sidebarHoverAtom` - Pure client state, never syncs
- `useUserPreferences` - Initial load and refresh from server
- `useUpdatePreferences` - Persist sidebar state changes

### Component Patterns

**Sidebar.tsx** (follows `discussions-list.tsx` pattern):
```typescript
export const Sidebar = () => {
  // Load server preferences
  const preferencesQuery = useUserPreferences();
  
  // Local state for immediate updates
  const [isCollapsed, setIsCollapsed] = useAtom(sidebarCollapsedAtom);
  
  // Mutation to persist
  const updatePrefs = useUpdatePreferences();
  
  // Sync on collapse change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      updatePrefs.mutate({ collapsed: isCollapsed });
    }, 500);
    return () => clearTimeout(timer);
  }, [isCollapsed]);

  if (preferencesQuery.isLoading) {
    return <SidebarSkeleton />;
  }

  return (
    <aside className={cn('sidebar', isCollapsed && 'collapsed')}>
      <SidebarHeader />
      <SidebarNav />
      <SidebarFooter />
      <SidebarCollapseToggle />
    </aside>
  );
};
```

**SidebarCollapseToggle.tsx** (follows `create-discussion.tsx` button pattern):
```typescript
export const SidebarCollapseToggle = () => {
  const [isCollapsed, setIsCollapsed] = useAtom(sidebarCollapsedAtom);
  
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setIsCollapsed(!isCollapsed)}
      icon={isCollapsed ? <ChevronRight /> : <ChevronLeft />}
      aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    />
  );
};
```

### Integration with bunshi

For scoped state management (e.g., multiple sidebars in different contexts):

```typescript
// sidebar-store.ts
import { atom } from 'jotai';
import { createScope } from 'bunshi';

export const SidebarScope = createScope<{ id: string }>(undefined);

export const sidebarCollapsedAtom = atom(false);
```

## Feature: Chat

### Proposed Structure

```
src/features/chat/
├── api/
│   ├── get-conversations.ts         # List all conversations
│   ├── get-messages.ts              # Get messages for conversation (infinite)
│   ├── send-message.ts              # Send new message
│   ├── create-conversation.ts       # Start new conversation
│   └── mark-as-read.ts              # Mark messages as read
├── components/
│   ├── chat-view.tsx                # Main chat container
│   ├── conversation-list.tsx        # List of conversations (sidebar)
│   ├── conversation-item.tsx        # Single conversation item
│   ├── message-list.tsx             # List of messages
│   ├── message-item.tsx             # Single message bubble
│   ├── message-input.tsx            # Input with send button
│   ├── chat-header.tsx              # Conversation header
│   └── typing-indicator.tsx         # "User is typing..." indicator
├── hooks/
│   ├── use-chat-scroll.ts           # Auto-scroll to bottom on new message
│   ├── use-message-submit.ts        # Handle enter key, shift+enter
│   └── use-optimistic-message.ts    # Optimistic UI for sent messages
└── stores/
    ├── chat-store.ts                # Draft messages, active conversation
    └── typing-store.ts              # Typing status tracking
```

### State Management Strategy

**Client State (jotai)**:
```typescript
// chat-store.ts
export const activeChatAtom = atom<string | null>(null);
export const draftMessagesAtom = atom<Record<string, string>>({});
export const isTypingAtom = atom<Record<string, boolean>>({});
```

**Server State (react-query)**:
```typescript
// get-messages.ts (infinite query - follows comments pattern)
export const getInfiniteMessagesQueryOptions = (conversationId: string) => {
  return infiniteQueryOptions({
    queryKey: ['messages', conversationId],
    queryFn: ({ pageParam = 1 }) => {
      return getMessages({ conversationId, page: pageParam });
    },
    getNextPageParam: (lastPage) => {
      if (lastPage?.meta?.page === lastPage?.meta?.totalPages) return undefined;
      return lastPage.meta.page + 1;
    },
    initialPageParam: 1,
  });
};

// send-message.ts (mutation - follows create-discussion pattern)
export const sendMessageSchema = z.object({
  conversationId: z.string(),
  content: z.string().min(1, 'Message cannot be empty'),
  attachments: z.array(z.string()).optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const useSendMessage = ({ mutationConfig } = {}) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: sendMessage,
    onMutate: async (newMessage) => {
      // Optimistic update
      await queryClient.cancelQueries({
        queryKey: ['messages', newMessage.conversationId],
      });
      
      const previousMessages = queryClient.getQueryData([
        'messages',
        newMessage.conversationId,
      ]);
      
      queryClient.setQueryData(
        ['messages', newMessage.conversationId],
        (old: any) => {
          // Add optimistic message
        },
      );
      
      return { previousMessages };
    },
    onError: (err, newMessage, context) => {
      // Rollback on error
      queryClient.setQueryData(
        ['messages', newMessage.conversationId],
        context?.previousMessages,
      );
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['messages', variables.conversationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['conversations'],
      });
    },
    ...mutationConfig,
  });
};
```

### Component Patterns

**ChatView.tsx** (follows `discussion-view.tsx` pattern):
```typescript
export const ChatView = ({ conversationId }: { conversationId: string }) => {
  const messagesQuery = useInfiniteMessages({ conversationId });
  const { addNotification } = useNotifications();
  
  const sendMessageMutation = useSendMessage({
    mutationConfig: {
      onSuccess: () => {
        // Clear draft
        setDraft('');
      },
      onError: () => {
        addNotification({
          type: 'error',
          title: 'Failed to send message',
        });
      },
    },
  });

  if (messagesQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ChatHeader conversationId={conversationId} />
      <MessageList
        messages={messagesQuery.data?.pages.flatMap(page => page.data) ?? []}
        onLoadMore={() => messagesQuery.fetchNextPage()}
        hasMore={messagesQuery.hasNextPage}
      />
      <MessageInput
        onSend={(content) => {
          sendMessageMutation.mutate({
            conversationId,
            content,
          });
        }}
        isLoading={sendMessageMutation.isPending}
      />
    </div>
  );
};
```

**MessageInput.tsx** (follows `create-discussion.tsx` form pattern):
```typescript
export const MessageInput = ({ onSend, isLoading }: MessageInputProps) => {
  const [activeChatId] = useAtom(activeChatAtom);
  const [drafts, setDrafts] = useAtom(draftMessagesAtom);
  
  const draft = drafts[activeChatId] || '';
  
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    onSend(draft);
    setDrafts({ ...drafts, [activeChatId]: '' });
  };
  
  return (
    <Form
      onSubmit={({ content }) => onSend(content)}
      schema={sendMessageSchema.pick({ content: true })}
    >
      {({ register, formState }) => (
        <div className="flex gap-2">
          <Textarea
            {...register('content')}
            value={draft}
            onChange={(e) => setDrafts({ ...drafts, [activeChatId]: e.target.value })}
            placeholder="Type a message..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button
            type="submit"
            isLoading={isLoading}
            disabled={!draft.trim()}
            icon={<Send />}
          >
            Send
          </Button>
        </div>
      )}
    </Form>
  );
};
```

**MessageList.tsx** (infinite scroll with intersection observer):
```typescript
export const MessageList = ({ messages, onLoadMore, hasMore }: Props) => {
  const { ref, inView } = useIntersectionObserver({
    threshold: 0,
  });
  
  useEffect(() => {
    if (inView && hasMore) {
      onLoadMore();
    }
  }, [inView, hasMore, onLoadMore]);
  
  const scrollRef = useChatScroll({ messages });
  
  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      {hasMore && (
        <div ref={ref} className="flex justify-center py-4">
          <Spinner />
        </div>
      )}
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
    </div>
  );
};
```

## Shared Components Integration

### Using shadcn components

Both features should use shadcn components from `@/components/ui/`:

```typescript
// ✅ GOOD: Import from shared components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form/input';
import { Textarea } from '@/components/ui/form/textarea';
import { Spinner } from '@/components/ui/spinner';
import { ScrollArea } from '@/components/ui/scroll-area';
```

### Creating feature-specific variants

If a feature needs a specialized button:

```typescript
// src/features/chat/components/send-button.tsx
import { Button, type ButtonProps } from '@/components/ui/button';

export const SendButton = ({ isLoading, ...props }: ButtonProps) => {
  return (
    <Button
      variant="default"
      size="icon"
      isLoading={isLoading}
      icon={<Send className="h-4 w-4" />}
      {...props}
    />
  );
};
```

## Feature Composition at App Level

Features should not import each other. Compose at app level:

```typescript
// src/app/routes/chat-page.tsx
import { Sidebar } from '@/features/sidebar/components/sidebar';
import { ChatView } from '@/features/chat/components/chat-view';

export const ChatPage = () => {
  const { conversationId } = useParams();
  
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1">
        {conversationId ? (
          <ChatView conversationId={conversationId} />
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  );
};
```

## WebSocket Integration (if needed)

For real-time features like typing indicators:

```typescript
// src/features/chat/hooks/use-chat-websocket.ts
import { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { isTypingAtom } from '../stores/typing-store';

export const useChatWebSocket = (conversationId: string) => {
  const setTyping = useSetAtom(isTypingAtom);
  
  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/conversations/${conversationId}`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'typing') {
        setTyping((prev) => ({
          ...prev,
          [data.userId]: true,
        }));
        
        setTimeout(() => {
          setTyping((prev) => ({
            ...prev,
            [data.userId]: false,
          }));
        }, 3000);
      }
      
      if (data.type === 'new_message') {
        // Invalidate messages query
        queryClient.invalidateQueries({
          queryKey: ['messages', conversationId],
        });
      }
    };
    
    return () => ws.close();
  }, [conversationId]);
};
```

## Testing Strategy

Following bulletproof-react patterns:

```typescript
// src/features/chat/components/__tests__/message-input.test.tsx
import { render, screen, waitFor } from '@/testing/test-utils';
import { MessageInput } from '../message-input';

describe('MessageInput', () => {
  it('sends message on enter key', async () => {
    const onSend = vi.fn();
    render(<MessageInput onSend={onSend} isLoading={false} />);
    
    const input = screen.getByPlaceholderText('Type a message...');
    await userEvent.type(input, 'Hello world{Enter}');
    
    await waitFor(() => {
      expect(onSend).toHaveBeenCalledWith('Hello world');
    });
  });
  
  it('does not send on shift+enter', async () => {
    const onSend = vi.fn();
    render(<MessageInput onSend={onSend} isLoading={false} />);
    
    const input = screen.getByPlaceholderText('Type a message...');
    await userEvent.type(input, 'Hello{Shift>}{Enter}{/Shift}world');
    
    expect(onSend).not.toHaveBeenCalled();
    expect(input).toHaveValue('Hello\nworld');
  });
});
```

## Migration Strategy

1. **Phase 1**: Set up feature folders and shared components
2. **Phase 2**: Move sidebar logic to `features/sidebar/`
3. **Phase 3**: Move chat logic to `features/chat/`
4. **Phase 4**: Refactor state management (jotai + react-query)
5. **Phase 5**: Add optimistic updates and polish

## Key Differences from Standard Bulletproof

1. **State Management**: We use jotai/bunshi instead of zustand
2. **Real-time**: We need WebSocket integration for chat
3. **Optimistic UI**: Chat requires optimistic updates for better UX
4. **Draft Persistence**: We need to persist draft messages locally

## Summary

- **Sidebar**: Simple feature with client state (collapsed) + server preferences
- **Chat**: Complex feature with infinite scroll, real-time updates, optimistic UI
- **Both**: Follow bulletproof patterns for API layer, components, and testing
- **Integration**: Compose at app level, no cross-feature imports
- **State**: jotai for client state, react-query for server cache
