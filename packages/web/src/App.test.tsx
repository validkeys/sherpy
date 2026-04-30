import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { render, screen } from './test/utils';

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

describe('App', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });
  it('renders the main heading', () => {
    render(<App />);
    expect(screen.getByText('Sherpy Planning Pipeline')).toBeInTheDocument();
  });

  it('renders the sidebar', () => {
    render(<App />);
    expect(screen.getByRole('complementary')).toBeInTheDocument();
    expect(screen.getByText('Workflow Steps')).toBeInTheDocument();
  });

  it('renders the main content area', () => {
    render(<App />);
    expect(screen.getByText('Main Content Area')).toBeInTheDocument();
  });

  it('renders example buttons', () => {
    render(<App />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Default Button/i })).toBeInTheDocument();
  });
});
