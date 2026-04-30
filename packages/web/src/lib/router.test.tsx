import React from 'react';
import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { router } from './router';

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
  it('renders project page at root path', () => {
    render(<RouterProvider router={router} />);
    // ProjectPage renders sidebar and tabs
    expect(screen.getByRole('complementary', { name: /sherpy workflow/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /workflow steps/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /chat/i })).toBeInTheDocument();
  });

  it('renders 404 page for unknown routes', async () => {
    const testRouter = createMemoryRouter(router.routes, {
      initialEntries: ['/this-route-does-not-exist'],
    });

    render(<RouterProvider router={testRouter} />);
    expect(screen.getByText(/404/i)).toBeInTheDocument();
    expect(screen.getByText(/Page Not Found/i)).toBeInTheDocument();
  });
});
