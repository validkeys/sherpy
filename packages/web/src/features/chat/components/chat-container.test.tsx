import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatContainer } from './chat-container';
import { createMockWebSocketRuntime } from '@/test/mocks/websocket-mock';

// Mock @assistant-ui/react
vi.mock('@assistant-ui/react', () => ({
  Thread: vi.fn(({ runtime, components }: { runtime: any; components?: any }) => (
    <div data-testid="mock-thread">
      Thread component (runtime provided: {runtime ? 'yes' : 'no'}, custom composer:{' '}
      {components?.Composer ? 'yes' : 'no'})
    </div>
  )),
  AssistantRuntimeProvider: vi.fn(
    ({ children, runtime }: { children: React.ReactNode; runtime: any }) => (
      <div data-testid="mock-runtime-provider">{children}</div>
    )
  ),
  useAssistantTransportRuntime: vi.fn(),
  Composer: {
    Root: vi.fn(({ children, className }: any) => (
      <div data-testid="composer-root" className={className}>
        {children}
      </div>
    )),
    Input: vi.fn(({ placeholder, className }: any) => (
      <input data-testid="composer-input" placeholder={placeholder} className={className} />
    )),
    Send: vi.fn(({ children, className }: any) => (
      <button data-testid="composer-send" className={className}>
        {children}
      </button>
    )),
  },
}));

// Mock WebSocket utilities
vi.mock('@/lib/websocket', () => ({
  getWebSocketUrl: vi.fn(() => 'ws://localhost:8080'),
  getAuthToken: vi.fn(() => 'mock-auth-token'),
  buildAuthenticatedWsUrl: vi.fn(
    (projectId: string) => `ws://localhost:8080?projectId=${projectId}`
  ),
}));

// Mock the useChatRuntime hook to return the full structure with connection state
vi.mock('../hooks/use-chat-runtime', () => ({
  useChatRuntime: vi.fn(),
}));

describe('ChatContainer', () => {
  const mockProjectId = 'test-project-123';
  let mockRuntime: ReturnType<typeof createMockWebSocketRuntime>;
  let mockUseAssistantTransportRuntime: ReturnType<typeof vi.fn>;
  let mockUseChatRuntime: ReturnType<typeof vi.fn>;
  let mockGetWebSocketUrl: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockRuntime = createMockWebSocketRuntime();

    // Get mocked functions
    const assistantUI = await import('@assistant-ui/react');
    mockUseAssistantTransportRuntime = assistantUI.useAssistantTransportRuntime as any;
    mockUseAssistantTransportRuntime.mockReturnValue(mockRuntime);

    const chatRuntime = await import('../hooks/use-chat-runtime');
    mockUseChatRuntime = chatRuntime.useChatRuntime as any;
    // Default mock returns connected state
    mockUseChatRuntime.mockReturnValue({
      runtime: mockRuntime,
      connectionState: {
        isConnected: true,
        error: null,
        isReconnecting: false,
      },
      manualRetry: vi.fn(),
    });

    const websocketLib = await import('@/lib/websocket');
    mockGetWebSocketUrl = websocketLib.getWebSocketUrl as any;
  });

  it('renders without errors', () => {
    render(<ChatContainer projectId={mockProjectId} />);
    expect(screen.getByTestId('mock-thread')).toBeInTheDocument();
  });

  it('displays welcome message with hybrid mode explanation', () => {
    render(<ChatContainer projectId={mockProjectId} />);
    expect(screen.getByText(/Let's start the sherpy workflow/i)).toBeInTheDocument();
    expect(screen.getByText(/I'll guide you through each step/i)).toBeInTheDocument();
    expect(
      screen.getByText(/You can follow the guided questions or ask your own questions anytime/i)
    ).toBeInTheDocument();
  });

  it('renders Thread component with runtime', () => {
    render(<ChatContainer projectId={mockProjectId} />);
    const threadElement = screen.getByTestId('mock-thread');
    expect(threadElement).toBeInTheDocument();
    expect(threadElement.textContent).toContain('runtime provided: yes');
  });

  it('calls useChatRuntime with project ID', () => {
    render(<ChatContainer projectId={mockProjectId} />);

    expect(mockUseChatRuntime).toHaveBeenCalledWith(mockProjectId);
  });

  it('shows streaming indicator when runtime is running', () => {
    mockRuntime.isRunning = true;
    render(<ChatContainer projectId={mockProjectId} />);
    expect(screen.getByText(/AI is thinking/i)).toBeInTheDocument();
  });

  it('hides streaming indicator when runtime is not running', () => {
    mockRuntime.isRunning = false;
    render(<ChatContainer projectId={mockProjectId} />);
    expect(screen.queryByText(/AI is thinking/i)).not.toBeInTheDocument();
  });

  it('provides custom composer to Thread component', () => {
    render(<ChatContainer projectId={mockProjectId} />);
    const threadElement = screen.getByTestId('mock-thread');
    expect(threadElement.textContent).toContain('custom composer: yes');
  });

  it('Thread component receives custom composer configuration', () => {
    render(<ChatContainer projectId={mockProjectId} />);

    // Verify the mock Thread was called with custom composer
    const threadElement = screen.getByTestId('mock-thread');
    expect(threadElement.textContent).toContain('custom composer: yes');

    // This verifies that CustomComposer is properly integrated
    expect(threadElement).toBeInTheDocument();
  });

  it('shows connection error when not connected', () => {
    // Override the mock to return disconnected state
    mockUseChatRuntime.mockReturnValueOnce({
      runtime: mockRuntime,
      connectionState: {
        isConnected: false,
        error: new Error('Connection failed'),
        isReconnecting: false,
      },
      manualRetry: vi.fn(),
    });

    render(<ChatContainer projectId={mockProjectId} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Connection lost')).toBeInTheDocument();
  });

  it('hides composer when disconnected', () => {
    // Check that the Thread receives undefined composer when disconnected
    mockUseChatRuntime.mockReturnValueOnce({
      runtime: mockRuntime,
      connectionState: {
        isConnected: false,
        error: new Error('Connection failed'),
        isReconnecting: false,
      },
      manualRetry: vi.fn(),
    });

    render(<ChatContainer projectId={mockProjectId} />);
    const threadElement = screen.getByTestId('mock-thread');
    // When disconnected, composer should be undefined
    expect(threadElement.textContent).toContain('custom composer: no');
  });

  it('shows reconnecting message when reconnecting', () => {
    mockUseChatRuntime.mockReturnValueOnce({
      runtime: mockRuntime,
      connectionState: {
        isConnected: false,
        error: new Error('Connection failed'),
        isReconnecting: true,
      },
      manualRetry: vi.fn(),
    });

    render(<ChatContainer projectId={mockProjectId} />);
    expect(screen.getByText('Connection lost. Reconnecting...')).toBeInTheDocument();
  });

  it('does not show error when connected', () => {
    render(<ChatContainer projectId={mockProjectId} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
