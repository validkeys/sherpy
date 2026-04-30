import { cn } from '@/utils/cn';
import { Link } from 'react-router-dom';

/**
 * 404 Not Found page component
 *
 * Displayed when users navigate to a route that doesn't exist.
 */
export function NotFoundPage() {
  return (
    <div className={cn('min-h-screen flex items-center justify-center')}>
      <div className="text-center">
        <h1 className="text-6xl font-bold text-foreground mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-foreground mb-4">Page Not Found</h2>
        <p className="text-muted-foreground mb-8">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          to="/"
          className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
