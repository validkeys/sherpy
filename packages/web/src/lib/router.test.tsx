import React from 'react';
import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { router } from './router';

// Mock chat actions to avoid AuiProvider requirement
vi.mock('@/features/chat', () => ({
  useChatActions: () => ({
    sendMessage: vi.fn(),
    sendSystemMessage: vi.fn(),
    clearThread: vi.fn(),
  }),
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
  it('renders home page at root path', () => {
    render(<RouterProvider router={router} />);
    expect(screen.getByRole('heading', { name: /Sherpy Planning Pipeline/i })).toBeInTheDocument();
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
