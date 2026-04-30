import { ComposerPrimitive } from '@assistant-ui/react';
import { cn } from '@/utils/cn';

/**
 * Custom composer component for hybrid chat mode.
 * Supports both structured guided responses and free-form questions.
 */
export function CustomComposer() {
  return (
    <ComposerPrimitive.Root className="flex w-full items-center gap-2 rounded-lg border bg-background p-2">
      <ComposerPrimitive.Input
        autoFocus
        placeholder="Answer the question or ask your own..."
        className={cn(
          'flex-1 bg-transparent outline-none',
          'placeholder:text-muted-foreground',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
      />
      <ComposerPrimitive.Send className={cn('rounded-md bg-primary px-4 py-2 text-primary-foreground', 'hover:bg-primary/90', 'disabled:pointer-events-none disabled:opacity-50')}>
        Send
      </ComposerPrimitive.Send>
    </ComposerPrimitive.Root>
  );
}
