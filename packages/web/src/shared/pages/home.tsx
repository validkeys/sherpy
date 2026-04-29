import { useState } from 'react';
import { cn } from '@/utils/cn';

/**
 * Home page component
 *
 * Landing page for the application. Replace with actual
 * home page content when implementing features.
 */
export function HomePage() {
  const [count, setCount] = useState(0);

  return (
    <div className={cn('min-h-screen flex items-center justify-center')}>
      <div className={cn('max-w-md p-8 rounded-lg border bg-card text-card-foreground shadow-lg')}>
        <h1 className="text-3xl font-bold mb-4 text-foreground">Sherpy Flow UI Refactor</h1>
        <p className="text-muted-foreground mb-6">React 19 + Vite + TypeScript + Tailwind CSS</p>
        <button
          type="button"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          onClick={() => setCount((count) => count + 1)}
        >
          Count is {count}
        </button>
      </div>
    </div>
  );
}
