import { type FC, type ReactNode } from 'react';
import { AuiIf, MessagePrimitive, ThreadPrimitive, useAuiState } from '@assistant-ui/react';
import { cn } from '@/utils/cn';

interface ThreadProps {
  composer?: ReactNode;
}

/**
 * Thread component built on @assistant-ui/react primitives.
 * Displays chat messages with automatic scrolling and supports custom composer.
 */
export const Thread: FC<ThreadProps> = ({ composer }) => {
  return (
    <ThreadPrimitive.Root className="flex h-full flex-col bg-background">
      <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4">
          <AuiIf condition={(s) => s.thread.isEmpty}>
            <ThreadWelcome />
          </AuiIf>

          <ThreadPrimitive.Messages>{() => <Message />}</ThreadPrimitive.Messages>

          <ThreadPrimitive.ViewportFooter className="sticky bottom-0 mt-auto bg-background pb-4">
            {composer}
          </ThreadPrimitive.ViewportFooter>
        </div>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
};

/**
 * Welcome message shown when thread is empty
 */
const ThreadWelcome: FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <h2 className="font-semibold text-2xl">Welcome to Sherpy</h2>
      <p className="text-muted-foreground">Start a conversation to begin</p>
    </div>
  );
};

/**
 * Message component that renders user or assistant messages
 */
const Message: FC = () => {
  const role = useAuiState((s) => s.message.role);

  if (role === 'user') return <UserMessage />;
  return <AssistantMessage />;
};

/**
 * User message bubble
 */
const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root
      className={cn('flex justify-end', 'animate-in fade-in slide-in-from-bottom-2 duration-200')}
    >
      <div className="max-w-[80%] rounded-lg bg-primary px-4 py-2 text-primary-foreground">
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  );
};

/**
 * Assistant message bubble with streaming support
 */
const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root
      className={cn('flex justify-start', 'animate-in fade-in slide-in-from-bottom-2 duration-200')}
    >
      <div className="max-w-[80%] rounded-lg border bg-muted px-4 py-2 text-foreground">
        <MessagePrimitive.Parts>
          {({ part }) => {
            if (part.type === 'text') {
              return <div className="whitespace-pre-wrap">{part.text}</div>;
            }
            if (part.type === 'tool-call') {
              return (
                <div className="rounded border bg-background p-2 text-sm">
                  <div className="font-medium">Tool: {part.toolName}</div>
                  <pre className="mt-1 text-xs">{JSON.stringify(part.args, null, 2)}</pre>
                </div>
              );
            }
            return null;
          }}
        </MessagePrimitive.Parts>
      </div>
    </MessagePrimitive.Root>
  );
};
