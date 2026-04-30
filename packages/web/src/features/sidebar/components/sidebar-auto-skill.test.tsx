/**
 * Integration tests for auto-skill invocation from sidebar navigation
 * Tests m2-012: auto-skill invocation when clicking workflow steps
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Sidebar } from './sidebar';

const mockSendMessage = vi.fn();
vi.mock('@/features/chat', () => ({
  useChatActions: () => ({
    sendMessage: mockSendMessage,
    sendSystemMessage: vi.fn(),
    clearThread: vi.fn(),
  }),
}));

vi.mock('@/shared/services/skill-service', () => ({
  getSkillMessageForStep: (stepId: string) => {
    const commands: Record<string, string> = {
      intake: 'Start new project intake',
      'business-requirements': 'Continue Sherpy Flow: Business Requirements',
      'gap-analysis': 'Continue Sherpy Flow: Gap Analysis',
    };
    return commands[stepId] || null;
  },
}));

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
});

describe('Sidebar - Auto-Skill Invocation Integration', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    localStorageMock.clear();
    store = createStore();
    mockSendMessage.mockClear();
    mockSendMessage.mockResolvedValue(undefined);
  });

  const renderSidebar = () => {
    return render(
      <Provider store={store}>
        <Sidebar />
      </Provider>
    );
  };

  it('sends skill message to chat when step clicked', async () => {
    const user = userEvent.setup();
    renderSidebar();

    const businessReqStep = screen.getByRole('button', {
      name: /Navigate to Business Requirements/i,
    });

    await user.click(businessReqStep);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('Continue Sherpy Flow: Business Requirements');
    });
  });

  it('sends correct skill command for intake step', async () => {
    const user = userEvent.setup();
    renderSidebar();

    const intakeStep = screen.getByRole('button', { name: /Navigate to Intake/i });
    await user.click(intakeStep);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('Start new project intake');
    });
  });

  it('sends correct skill command for gap analysis step', async () => {
    const user = userEvent.setup();
    renderSidebar();

    const gapAnalysisStep = screen.getByRole('button', {
      name: /Gap Analysis/i,
    });
    await user.click(gapAnalysisStep);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('Continue Sherpy Flow: Gap Analysis');
    });
  });

  it('shows loading state during skill invocation', async () => {
    const user = userEvent.setup();
    let resolvePromise: () => void;
    const promise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });
    mockSendMessage.mockReturnValue(promise);

    renderSidebar();

    const intakeStep = screen.getByRole('button', { name: /Navigate to Intake/i });
    await user.click(intakeStep);

    expect(intakeStep).toHaveAttribute('aria-busy', 'true');
    expect(intakeStep).toHaveAttribute('aria-disabled', 'true');
    expect(intakeStep).toHaveStyle({ opacity: '0.6' });

    resolvePromise!();
    await promise;

    await waitFor(() => {
      expect(intakeStep).toHaveAttribute('aria-busy', 'false');
      expect(intakeStep).toHaveAttribute('aria-disabled', 'false');
    });
  });

  it('logs warning when no skill command defined for step', async () => {
    const user = userEvent.setup();
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    renderSidebar();

    // Click on a step that has no skill command in our mock (anything beyond gap-analysis)
    const styleAnchorsStep = screen.getByRole('button', {
      name: /Navigate to Style Anchors/i,
    });
    await user.click(styleAnchorsStep);

    // The step should still be navigated to, but a warning should be logged
    await waitFor(() => {
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No skill command defined for step:')
      );
    });

    consoleWarnSpy.mockRestore();
  });

  it('handles skill invocation error gracefully', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSendMessage.mockRejectedValue(new Error('Network error'));

    renderSidebar();

    const intakeStep = screen.getByRole('button', { name: /Navigate to Intake/i });
    await user.click(intakeStep);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to invoke skill:', expect.any(Error));
    });

    await waitFor(() => {
      expect(intakeStep).toHaveAttribute('aria-busy', 'false');
    });

    consoleErrorSpy.mockRestore();
  });

  it('can invoke skills on multiple steps sequentially', async () => {
    const user = userEvent.setup();
    renderSidebar();

    const intakeStep = screen.getByRole('button', { name: /Navigate to Intake/i });
    const businessReqStep = screen.getByRole('button', {
      name: /Navigate to Business Requirements/i,
    });

    await user.click(intakeStep);
    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('Start new project intake');
    });

    mockSendMessage.mockClear();

    await user.click(businessReqStep);
    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('Continue Sherpy Flow: Business Requirements');
    });
  });

  it('invokes skill only once per click', async () => {
    const user = userEvent.setup();
    renderSidebar();

    const intakeStep = screen.getByRole('button', { name: /Navigate to Intake/i });
    await user.click(intakeStep);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledTimes(1);
    });
  });
});
