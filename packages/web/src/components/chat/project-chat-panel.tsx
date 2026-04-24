/**
 * ProjectChatPanel
 * Chat panel using assistant-ui primitives
 */

import * as ThreadPrimitive from "@assistant-ui/react";
import { MessageCircle, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
          isOpen ? "translate-x-0" : "translate-x-full"
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
        <div className="flex flex-col h-[calc(100%-64px)] p-4">
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {/* Thread viewport for messages */}
            <ThreadPrimitive.ThreadPrimitive.Viewport className="flex-1 p-4">
              <div className="text-sm text-muted-foreground text-center py-8">
                Chat interface is ready. Backend integration coming in M6-006.
              </div>
            </ThreadPrimitive.ThreadPrimitive.Viewport>
          </div>

          {/* Composer for message input */}
          <div className="border-t pt-4">
            <ThreadPrimitive.ComposerPrimitive.Root className="flex gap-2">
              <ThreadPrimitive.ComposerPrimitive.Input
                className="flex-1 px-3 py-2 border rounded-md"
                placeholder="Type a message..."
              />
              <ThreadPrimitive.ComposerPrimitive.Send asChild>
                <Button size="sm">Send</Button>
              </ThreadPrimitive.ComposerPrimitive.Send>
            </ThreadPrimitive.ComposerPrimitive.Root>
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
