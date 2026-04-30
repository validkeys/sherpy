import { Loader2 } from 'lucide-react';

/**
 * Loading indicator shown when a skill is being invoked.
 * Displays an animated spinner with a message.
 */
export function LoadingIndicator() {
  return (
    <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>Invoking skill...</span>
    </div>
  );
}
