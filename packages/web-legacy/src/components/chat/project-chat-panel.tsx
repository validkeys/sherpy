/**
 * ProjectChatPanel
 * Chat panel using assistant-ui primitives
 */

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useThreadRuntime,
} from "@assistant-ui/react";
import { Bot, MessageCircle, User, X } from "lucide-react";
import { useState } from "react";

/**
 * User message bubble component
 */
function UserMessage() {
  return (
    <div className="flex items-start gap-3 justify-end">
      <div className="flex-1 max-w-[80%]">
        <MessagePrimitive.Content className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm" />
      </div>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
        <User className="h-4 w-4 text-primary-foreground" />
      </div>
    </div>
  );
}

/**
 * Assistant message bubble component
 */
function AssistantMessage() {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <Bot className="h-4 w-4" />
      </div>
      <div className="flex-1 max-w-[80%]">
        <MessagePrimitive.Content className="bg-muted px-4 py-2 rounded-lg text-sm" />
      </div>
    </div>
  );
}

/**
 * Chat panel component that slides in from the right side of the screen.
 * Uses assistant-ui's primitives for message display and input.
 */
export function ProjectChatPanel() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Toggle button - visible when panel is closed */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
          size="icon"
          aria-label="Open chat"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {/* Chat panel - slides in from right */}
      <aside
        role="complementary"
        className={cn(
          "fixed top-0 right-0 h-full bg-background border-l shadow-lg z-40 transition-transform duration-300",
          "w-full md:w-[400px]",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Project Chat</h2>
          <Button
            onClick={() => setIsOpen(false)}
            variant="ghost"
            size="icon"
            aria-label="Close chat"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Chat content using assistant-ui primitives */}
        <div className="flex flex-col h-[calc(100%-64px)]">
          {/* Thread viewport for messages */}
          <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto p-4">
            <ThreadPrimitive.Messages
              components={{
                UserMessage,
                AssistantMessage,
              }}
            />
            <ThreadPrimitive.If empty>
              <div className="text-sm text-muted-foreground text-center py-8">
                No messages yet. Start a conversation!
              </div>
            </ThreadPrimitive.If>
          </ThreadPrimitive.Viewport>

          {/* Composer for message input */}
          <div className="border-t p-4">
            <ComposerPrimitive.Root className="flex gap-2">
              <ComposerPrimitive.Input
                className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Type a message..."
              />
              <ComposerPrimitive.Send className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3">
                Send
              </ComposerPrimitive.Send>
            </ComposerPrimitive.Root>
          </div>
        </div>
      </aside>

      {/* Backdrop overlay on mobile when panel is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
