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

describe('ChatContainer', () => {
  const mockProjectId = 'test-project-123';
  let mockRuntime: ReturnType<typeof createMockWebSocketRuntime>;
  let mockUseAssistantTransportRuntime: ReturnType<typeof vi.fn>;
  let mockGetWebSocketUrl: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockRuntime = createMockWebSocketRuntime();

    // Get mocked functions
    const assistantUI = await import('@assistant-ui/react');
    mockUseAssistantTransportRuntime = assistantUI.useAssistantTransportRuntime as any;
    mockUseAssistantTransportRuntime.mockReturnValue(mockRuntime);

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

  it('calls useChatRuntime with correct API URL', () => {
    render(<ChatContainer projectId={mockProjectId} />);

    expect(mockGetWebSocketUrl).toHaveBeenCalled();
    expect(mockUseAssistantTransportRuntime).toHaveBeenCalled();
  });

  it('passes runtime configuration with project context', () => {
    render(<ChatContainer projectId={mockProjectId} />);

    // Verify runtime was created with correct configuration
    expect(mockUseAssistantTransportRuntime).toHaveBeenCalledWith(
      expect.objectContaining({
        api: expect.stringContaining('/chat'),
        initialState: expect.objectContaining({
          messages: expect.any(Array),
          isRunning: expect.any(Boolean),
        }),
        converter: expect.any(Function),
        headers: expect.any(Function),
        onError: expect.any(Function),
      })
    );
  });

  it('includes projectId in request headers', async () => {
    render(<ChatContainer projectId={mockProjectId} />);

    const transportOptions = mockUseAssistantTransportRuntime.mock.calls[0][0];

    // Call the headers function (it returns a promise)
    const headers = await transportOptions.headers();

    expect(headers['X-Project-Id']).toBe(mockProjectId);
    expect(headers['Authorization']).toContain('Bearer');
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('configures error handler for transport runtime', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<ChatContainer projectId={mockProjectId} />);

    // Get the onError handler that was passed
    const transportOptions = mockUseAssistantTransportRuntime.mock.calls[0][0];
    const onErrorHandler = transportOptions.onError;

    // Simulate an error
    const mockError = new Error('Test chat transport error');
    onErrorHandler(mockError);

    expect(consoleErrorSpy).toHaveBeenCalledWith('Chat transport error:', mockError);

    consoleErrorSpy.mockRestore();
  });

  it('uses converter function to transform state', () => {
    render(<ChatContainer projectId={mockProjectId} />);

    const transportOptions = mockUseAssistantTransportRuntime.mock.calls[0][0];
    const converter = transportOptions.converter;

    // Test converter function
    const mockState = {
      messages: [{ id: '1', role: 'user', content: 'test' }],
      isRunning: true,
    };

    const result = converter(mockState);

    expect(result).toEqual({
      messages: mockState.messages,
      isRunning: true,
    });
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
});
