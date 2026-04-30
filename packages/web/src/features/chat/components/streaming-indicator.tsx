/**
 * Streaming indicator shown while AI is generating a response.
 * Displays a pulsing animation to indicate active streaming.
 */
export function StreamingIndicator() {
  return (
    <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
      <div className="flex gap-1">
        <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        <span className="h-2 w-2 rounded-full bg-primary animate-pulse [animation-delay:0.2s]" />
        <span className="h-2 w-2 rounded-full bg-primary animate-pulse [animation-delay:0.4s]" />
      </div>
      <span>AI is thinking...</span>
    </div>
  );
}
