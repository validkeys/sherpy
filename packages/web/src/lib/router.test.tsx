import React from 'react';
import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { router } from './router';
import { AppProvider } from '@/providers';

// Mock project loader hook
vi.mock('@/shared/hooks/use-project-loader', () => ({
  useProjectLoader: () => ({
    project: null,
    isLoading: false,
    error: null,
    currentProjectId: 'default-project',
    loadProject: vi.fn(),
    retry: vi.fn(),
    clearProject: vi.fn(),
  }),
}));

// Mock chat messages API
vi.mock('@/shared/api/chat/get-messages', () => ({
  useMessages: () => ({
    data: { messages: [], hasMore: false },
    isLoading: false,
    error: null,
  }),
}));

// Mock projects API for ProjectSelector
vi.mock('@/shared/api/projects/get-projects', () => ({
  useProjects: () => ({
    data: { projects: [] },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

// Mock chat feature to avoid AuiProvider requirement
vi.mock('@/features/chat', () => ({
  ChatContainer: () => <div data-testid="chat-container">Chat Container</div>,
  useChatActions: () => ({
    sendMessage: vi.fn(),
    sendSystemMessage: vi.fn(),
    clearThread: vi.fn(),
  }),
}));

// Mock files feature
vi.mock('@/features/files', () => ({
  FilesContainer: () => <div data-testid="files-container">Files Container</div>,
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Router', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });
  it('renders project selector at root path', () => {
    render(
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    );
    // ProjectSelector renders project selection UI
    expect(screen.getByRole('heading', { name: /select a project/i })).toBeInTheDocument();
    expect(screen.getByText(/create new project/i)).toBeInTheDocument();
    expect(screen.getByText(/choose an existing project or create a new one/i)).toBeInTheDocument();
  });

  it('renders 404 page for unknown routes', async () => {
    const testRouter = createMemoryRouter(router.routes, {
      initialEntries: ['/this-route-does-not-exist'],
    });

    render(
      <AppProvider>
        <RouterProvider router={testRouter} />
      </AppProvider>
    );
    expect(screen.getByText(/404/i)).toBeInTheDocument();
    expect(screen.getByText(/Page Not Found/i)).toBeInTheDocument();
  });
});
