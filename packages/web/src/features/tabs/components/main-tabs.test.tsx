import React from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Provider, createStore, useAtom, useSetAtom } from 'jotai';
import { type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MainTabs } from './main-tabs';
import { activeTabAtom } from '../stores/tab-atoms';

// Mock ChatContainer component
vi.mock('@/features/chat', () => ({
  ChatContainer: ({ projectId }: { projectId: string }) => (
    <div data-testid="chat-container" data-project-id={projectId}>
      Chat Container
    </div>
  ),
}));

function TestWrapper({ children }: { children: ReactNode }) {
  // Create a fresh Jotai store for each test to ensure isolation
  const store = createStore();
  store.set(activeTabAtom, 'chat');
  return <Provider store={store}>{children}</Provider>;
}

function TabStateDisplay() {
  const [activeTab] = useAtom(activeTabAtom);
  return <div data-testid="active-tab">{activeTab}</div>;
}

describe('MainTabs', () => {
  const defaultProps = {
    projectId: 'test-project-123',
  };

  describe('rendering', () => {
    it('renders chat and files tabs', () => {
      render(<MainTabs {...defaultProps} />, { wrapper: TestWrapper });

      expect(screen.getByRole('tab', { name: /chat/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /files/i })).toBeInTheDocument();
    });

    it('renders with chat tab active by default', () => {
      render(<MainTabs {...defaultProps} />, { wrapper: TestWrapper });

      const chatTab = screen.getByRole('tab', { name: /chat/i });
      expect(chatTab).toHaveAttribute('data-state', 'active');
    });

    it('renders with files tab inactive by default', () => {
      render(<MainTabs {...defaultProps} />, { wrapper: TestWrapper });

      const filesTab = screen.getByRole('tab', { name: /files/i });
      expect(filesTab).toHaveAttribute('data-state', 'inactive');
    });

    it('renders ChatContainer with correct projectId', () => {
      render(<MainTabs {...defaultProps} />, { wrapper: TestWrapper });

      const chatContainer = screen.getByTestId('chat-container');
      expect(chatContainer).toBeInTheDocument();
      expect(chatContainer).toHaveAttribute('data-project-id', 'test-project-123');
    });

    it('renders files container when files tab is active', async () => {
      const user = userEvent.setup();
      render(<MainTabs {...defaultProps} />, { wrapper: TestWrapper });

      const filesTab = screen.getByRole('tab', { name: /files/i });
      await user.click(filesTab);

      expect(screen.getByRole('heading', { name: /project files/i })).toBeInTheDocument();
      expect(screen.getByText(/file explorer coming soon/i)).toBeInTheDocument();
    });
  });

  describe('tab switching', () => {
    it('switches to files tab when clicked', async () => {
      const user = userEvent.setup();
      render(<MainTabs {...defaultProps} />, { wrapper: TestWrapper });

      const filesTab = screen.getByRole('tab', { name: /files/i });
      await user.click(filesTab);

      expect(filesTab).toHaveAttribute('data-state', 'active');
    });

    it('switches back to chat tab when clicked', async () => {
      const user = userEvent.setup();
      render(<MainTabs {...defaultProps} />, { wrapper: TestWrapper });

      const filesTab = screen.getByRole('tab', { name: /files/i });
      const chatTab = screen.getByRole('tab', { name: /chat/i });

      await user.click(filesTab);
      expect(filesTab).toHaveAttribute('data-state', 'active');

      await user.click(chatTab);
      expect(chatTab).toHaveAttribute('data-state', 'active');
    });

    it('only one tab is active at a time', async () => {
      const user = userEvent.setup();
      render(<MainTabs {...defaultProps} />, { wrapper: TestWrapper });

      const chatTab = screen.getByRole('tab', { name: /chat/i });
      const filesTab = screen.getByRole('tab', { name: /files/i });

      expect(chatTab).toHaveAttribute('data-state', 'active');
      expect(filesTab).toHaveAttribute('data-state', 'inactive');

      await user.click(filesTab);

      expect(chatTab).toHaveAttribute('data-state', 'inactive');
      expect(filesTab).toHaveAttribute('data-state', 'active');
    });
  });

  describe('jotai atom synchronization', () => {
    it('syncs tab selection with activeTabAtom', async () => {
      const user = userEvent.setup();
      render(
        <>
          <MainTabs {...defaultProps} />
          <TabStateDisplay />
        </>,
        { wrapper: TestWrapper }
      );

      expect(screen.getByTestId('active-tab')).toHaveTextContent('chat');

      const filesTab = screen.getByRole('tab', { name: /files/i });
      await user.click(filesTab);

      expect(screen.getByTestId('active-tab')).toHaveTextContent('files');
    });

    it('syncs back to chat tab with activeTabAtom', async () => {
      const user = userEvent.setup();
      render(
        <>
          <MainTabs {...defaultProps} />
          <TabStateDisplay />
        </>,
        { wrapper: TestWrapper }
      );

      const filesTab = screen.getByRole('tab', { name: /files/i });
      const chatTab = screen.getByRole('tab', { name: /chat/i });

      await user.click(filesTab);
      expect(screen.getByTestId('active-tab')).toHaveTextContent('files');

      await user.click(chatTab);
      expect(screen.getByTestId('active-tab')).toHaveTextContent('chat');
    });

    it('updates UI when atom changes externally', async () => {
      const user = userEvent.setup();

      function ExternalAtomUpdater() {
        const setActiveTab = useSetAtom(activeTabAtom);
        return <button onClick={() => setActiveTab('files')}>Switch Externally</button>;
      }

      render(
        <>
          <MainTabs {...defaultProps} />
          <ExternalAtomUpdater />
        </>,
        { wrapper: TestWrapper }
      );

      const chatTab = screen.getByRole('tab', { name: /chat/i });
      const filesTab = screen.getByRole('tab', { name: /files/i });

      expect(chatTab).toHaveAttribute('data-state', 'active');
      expect(filesTab).toHaveAttribute('data-state', 'inactive');

      const switchButton = screen.getByRole('button', { name: /switch externally/i });
      await user.click(switchButton);

      // After external update, files tab should be active
      expect(filesTab).toHaveAttribute('data-state', 'active');
      expect(chatTab).toHaveAttribute('data-state', 'inactive');
    });
  });

  describe('accessibility', () => {
    it('has correct ARIA role for tablist', () => {
      render(<MainTabs {...defaultProps} />, { wrapper: TestWrapper });

      const tablist = screen.getByRole('tablist');
      expect(tablist).toBeInTheDocument();
    });

    it('has correct ARIA role for tabs', () => {
      render(<MainTabs {...defaultProps} />, { wrapper: TestWrapper });

      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(2);
    });

    it('supports keyboard navigation with Tab key to reach tablist', async () => {
      const user = userEvent.setup();
      render(<MainTabs {...defaultProps} />, { wrapper: TestWrapper });

      await user.tab();

      // Radix Tabs uses roving tabindex - when tabbing into tablist,
      // the active tab should have focus
      const chatTab = screen.getByRole('tab', { name: /chat/i });
      expect(chatTab).toHaveFocus();
    });

    it('supports keyboard navigation with arrow keys', async () => {
      const user = userEvent.setup();
      render(<MainTabs {...defaultProps} />, { wrapper: TestWrapper });

      const chatTab = screen.getByRole('tab', { name: /chat/i });
      const filesTab = screen.getByRole('tab', { name: /files/i });

      chatTab.focus();
      expect(chatTab).toHaveFocus();

      await user.keyboard('{ArrowRight}');
      expect(filesTab).toHaveFocus();

      await user.keyboard('{ArrowLeft}');
      expect(chatTab).toHaveFocus();
    });

    it('activates tab on Enter key', async () => {
      const user = userEvent.setup();
      render(<MainTabs {...defaultProps} />, { wrapper: TestWrapper });

      const filesTab = screen.getByRole('tab', { name: /files/i });

      filesTab.focus();
      await user.keyboard('{Enter}');

      expect(filesTab).toHaveAttribute('data-state', 'active');
    });

    it('activates tab on Space key', async () => {
      const user = userEvent.setup();
      render(<MainTabs {...defaultProps} />, { wrapper: TestWrapper });

      const filesTab = screen.getByRole('tab', { name: /files/i });

      filesTab.focus();
      await user.keyboard(' ');

      expect(filesTab).toHaveAttribute('data-state', 'active');
    });

    it('has aria-selected attribute on active tab', () => {
      render(<MainTabs {...defaultProps} />, { wrapper: TestWrapper });

      const chatTab = screen.getByRole('tab', { name: /chat/i });
      const filesTab = screen.getByRole('tab', { name: /files/i });

      expect(chatTab).toHaveAttribute('aria-selected', 'true');
      expect(filesTab).toHaveAttribute('aria-selected', 'false');
    });

    it('updates aria-selected when switching tabs', async () => {
      const user = userEvent.setup();
      render(<MainTabs {...defaultProps} />, { wrapper: TestWrapper });

      const chatTab = screen.getByRole('tab', { name: /chat/i });
      const filesTab = screen.getByRole('tab', { name: /files/i });

      await user.click(filesTab);

      expect(chatTab).toHaveAttribute('aria-selected', 'false');
      expect(filesTab).toHaveAttribute('aria-selected', 'true');
    });
  });
});
