import { Outlet } from 'react-router-dom';

/**
 * Root layout component
 *
 * Wraps all routes with common layout structure.
 * Add navigation, headers, footers, or providers here.
 */
export function RootLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Outlet />
    </div>
  );
}
