import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatContainer } from './chat-container';
import { createMockWebSocketRuntime } from '@/test/mocks/websocket-mock';

// Mock @assistant-ui/react
vi.mock('@assistant-ui/react', () => ({
  AssistantRuntimeProvider: vi.fn(
    ({ children, runtime }: { children: React.ReactNode; runtime: any }) => (
      <div data-testid="mock-runtime-provider">{children}</div>
    )
  ),
  useAssistantRuntime: vi.fn(),
  useAssistantTransportRuntime: vi.fn(),
  ThreadPrimitive: {
    Root: vi.fn(({ children, className }: any) => (
      <div data-testid="thread-root" className={className}>
        {children}
      </div>
    )),
    Viewport: vi.fn(({ children, className }: any) => (
      <div data-testid="thread-viewport" className={className}>
        {children}
      </div>
    )),
    Messages: vi.fn(({ children }: any) => (
      <div data-testid="thread-messages">
        {typeof children === 'function' ? children() : children}
      </div>
    )),
    ViewportFooter: vi.fn(({ children, className }: any) => (
      <div data-testid="thread-viewport-footer" className={className}>
        {children}
      </div>
    )),
  },
  MessagePrimitive: {
    Root: vi.fn(({ children, className }: any) => (
      <div data-testid="message-root" className={className}>
        {children}
      </div>
    )),
    Parts: vi.fn(({ children }: any) => (
      <div data-testid="message-parts">
        {typeof children === 'function' ? 'Message content' : children || 'Message content'}
      </div>
    )),
  },
  ComposerPrimitive: {
    Root: vi.fn(({ children, className }: any) => (
      <div data-testid="composer-root" className={className}>
        {children}
      </div>
    )),
    Input: vi.fn(({ placeholder, className, autoFocus }: any) => (
      <input
        data-testid="composer-input"
        placeholder={placeholder}
        className={className}
        autoFocus={autoFocus}
      />
    )),
    Send: vi.fn(({ children, className }: any) => (
      <button data-testid="composer-send" className={className}>
        {children}
      </button>
    )),
  },
  useAuiState: vi.fn((selector: any) => {
    const mockState = { thread: { isEmpty: true }, message: { role: 'user' } };
    return selector ? selector(mockState) : mockState;
  }),
  AuiIf: vi.fn(({ condition, children }: any) => {
    const state = { thread: { isEmpty: true }, message: { role: 'user' } };
    return condition(state) ? <>{children}</> : null;
  }),
}));

// Mock WebSocket utilities
vi.mock('@/lib/websocket', () => ({
  getWebSocketUrl: vi.fn(() => 'ws://localhost:8080'),
  getAuthToken: vi.fn(() => 'mock-auth-token'),
  buildAuthenticatedWsUrl: vi.fn(
    (projectId: string) => `ws://localhost:8080?projectId=${projectId}`
  ),
}));

// Mock the useConnectionState hook to return connection state
vi.mock('../hooks/use-connection-state', () => ({
  useConnectionState: vi.fn(),
}));

describe('ChatContainer', () => {
  const mockProjectId = 'test-project-123';
  let mockRuntime: ReturnType<typeof createMockWebSocketRuntime>;
  let mockUseAssistantRuntime: ReturnType<typeof vi.fn>;
  let mockUseConnectionState: ReturnType<typeof vi.fn>;
  let mockGetWebSocketUrl: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockRuntime = createMockWebSocketRuntime();

    // Get mocked functions
    const assistantUI = await import('@assistant-ui/react');
    mockUseAssistantRuntime = assistantUI.useAssistantRuntime as any;
    mockUseAssistantRuntime.mockReturnValue(mockRuntime);

    const connectionState = await import('../hooks/use-connection-state');
    mockUseConnectionState = connectionState.useConnectionState as any;
    // Default mock returns connected state
    mockUseConnectionState.mockReturnValue({
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
    expect(screen.getByTestId('thread-root')).toBeInTheDocument();
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
    const threadElement = screen.getByTestId('thread-root');
    expect(threadElement).toBeInTheDocument();
  });

  it('calls useConnectionState with project ID', () => {
    render(<ChatContainer projectId={mockProjectId} />);

    expect(mockUseConnectionState).toHaveBeenCalledWith(mockProjectId);
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
    const composerRoot = screen.getByTestId('composer-root');
    expect(composerRoot).toBeInTheDocument();
  });

  it('Thread component receives custom composer configuration', () => {
    render(<ChatContainer projectId={mockProjectId} />);

    // Verify the custom composer is rendered
    const composerInput = screen.getByTestId('composer-input');
    expect(composerInput).toBeInTheDocument();
    expect(composerInput).toHaveAttribute('placeholder', 'Answer the question or ask your own...');
  });

  it('shows connection error when not connected', () => {
    // Override the mock to return disconnected state
    mockUseConnectionState.mockReturnValueOnce({
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
    // Check that the Thread does not render composer when disconnected
    mockUseConnectionState.mockReturnValueOnce({
      connectionState: {
        isConnected: false,
        error: new Error('Connection failed'),
        isReconnecting: false,
      },
      manualRetry: vi.fn(),
    });

    render(<ChatContainer projectId={mockProjectId} />);
    // When disconnected, composer should not be rendered
    expect(screen.queryByTestId('composer-root')).not.toBeInTheDocument();
  });

  it('shows reconnecting message when reconnecting', () => {
    mockUseConnectionState.mockReturnValueOnce({
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
