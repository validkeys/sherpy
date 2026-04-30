import { RootLayout } from '@/shared/layouts/root-layout';
import { ErrorBoundaryDemoPage } from '@/shared/pages';
import { HomePage } from '@/shared/pages/home';
import { NotFoundPage } from '@/shared/pages/not-found';
import { ProjectPage } from '@/shared/pages/project';
import { createBrowserRouter } from 'react-router-dom';

/**
 * Application router configuration
 *
 * Routes are organized by feature. Shared routes (home, 404, etc.)
 * are defined here. Feature-specific routes should be added as
 * child routes under their respective feature paths.
 *
 * Example:
 * {
 *   path: 'projects',
 *   lazy: () => import('@/features/projects/routes'),
 * }
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <ProjectPage />,
      },
      {
        path: 'project/:projectId',
        element: <ProjectPage />,
      },
      {
        path: 'home',
        element: <HomePage />,
      },
      {
        path: 'error-boundary-demo',
        element: <ErrorBoundaryDemoPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);
