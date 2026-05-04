/**
 * ChatHistory Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { ChatHistory } from './chat-history';
import type { ChatMessage } from '@/shared/api/chat/types';

// Mock useMessages hook
vi.mock('@/shared/api/chat/get-messages', () => ({
  useMessages: vi.fn(),
}));

describe('ChatHistory', () => {
  let queryClient: QueryClient;
  let mockUseMessages: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    const module = await import('@/shared/api/chat/get-messages');
    mockUseMessages = module.useMessages as any;
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('renders loading state', () => {
    mockUseMessages.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<ChatHistory projectId="proj-123" />, { wrapper });

    expect(screen.getByText('Loading chat history...')).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockUseMessages.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch'),
    });

    render(<ChatHistory projectId="proj-123" />, { wrapper });

    expect(screen.getByText(/Failed to load chat history/)).toBeInTheDocument();
    expect(screen.getByText(/Failed to fetch/)).toBeInTheDocument();
  });

  it('renders nothing when no messages', () => {
    mockUseMessages.mockReturnValue({
      data: { messages: [], hasMore: false },
      isLoading: false,
      error: null,
    });

    const { container } = render(<ChatHistory projectId="proj-123" />, { wrapper });

    expect(container.firstChild).toBeNull();
  });

  it('renders user and assistant messages', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg-1',
        projectId: 'proj-123',
        role: 'user',
        content: 'Hello!',
        createdAt: '2026-05-04T10:00:00Z',
      },
      {
        id: 'msg-2',
        projectId: 'proj-123',
        role: 'assistant',
        content: 'Hi there!',
        createdAt: '2026-05-04T10:00:01Z',
      },
    ];

    mockUseMessages.mockReturnValue({
      data: { messages, hasMore: false },
      isLoading: false,
      error: null,
    });

    render(<ChatHistory projectId="proj-123" />, { wrapper });

    expect(screen.getByText('Hello!')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });

  it('applies correct styling to user messages', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg-1',
        projectId: 'proj-123',
        role: 'user',
        content: 'User message',
        createdAt: '2026-05-04T10:00:00Z',
      },
    ];

    mockUseMessages.mockReturnValue({
      data: { messages, hasMore: false },
      isLoading: false,
      error: null,
    });

    const { container } = render(<ChatHistory projectId="proj-123" />, { wrapper });

    const messageDiv = container.querySelector('[data-role="user"]');
    expect(messageDiv).toBeInTheDocument();
    expect(messageDiv?.className).toContain('justify-end');
  });

  it('applies correct styling to assistant messages', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg-1',
        projectId: 'proj-123',
        role: 'assistant',
        content: 'Assistant message',
        createdAt: '2026-05-04T10:00:00Z',
      },
    ];

    mockUseMessages.mockReturnValue({
      data: { messages, hasMore: false },
      isLoading: false,
      error: null,
    });

    const { container } = render(<ChatHistory projectId="proj-123" />, { wrapper });

    const messageDiv = container.querySelector('[data-role="assistant"]');
    expect(messageDiv).toBeInTheDocument();
    expect(messageDiv?.className).toContain('justify-start');
  });

  it('renders multiple messages in order', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg-1',
        projectId: 'proj-123',
        role: 'user',
        content: 'First',
        createdAt: '2026-05-04T10:00:00Z',
      },
      {
        id: 'msg-2',
        projectId: 'proj-123',
        role: 'assistant',
        content: 'Second',
        createdAt: '2026-05-04T10:00:01Z',
      },
      {
        id: 'msg-3',
        projectId: 'proj-123',
        role: 'user',
        content: 'Third',
        createdAt: '2026-05-04T10:00:02Z',
      },
    ];

    mockUseMessages.mockReturnValue({
      data: { messages, hasMore: false },
      isLoading: false,
      error: null,
    });

    const { container } = render(<ChatHistory projectId="proj-123" />, { wrapper });

    const messageElements = container.querySelectorAll('[data-message-id]');
    expect(messageElements).toHaveLength(3);
    expect(messageElements[0].getAttribute('data-message-id')).toBe('msg-1');
    expect(messageElements[1].getAttribute('data-message-id')).toBe('msg-2');
    expect(messageElements[2].getAttribute('data-message-id')).toBe('msg-3');
  });

  it('displays timestamps', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg-1',
        projectId: 'proj-123',
        role: 'user',
        content: 'Test message',
        createdAt: '2026-05-04T14:30:45Z',
      },
    ];

    mockUseMessages.mockReturnValue({
      data: { messages, hasMore: false },
      isLoading: false,
      error: null,
    });

    render(<ChatHistory projectId="proj-123" />, { wrapper });

    // Timestamp should be formatted as locale time
    const timestampText = screen.getByText(/\d{1,2}:\d{2}/);
    expect(timestampText).toBeInTheDocument();
  });

  it('handles multiline content', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg-1',
        projectId: 'proj-123',
        role: 'user',
        content: 'Line 1\nLine 2\nLine 3',
        createdAt: '2026-05-04T10:00:00Z',
      },
    ];

    mockUseMessages.mockReturnValue({
      data: { messages, hasMore: false },
      isLoading: false,
      error: null,
    });

    const { container } = render(<ChatHistory projectId="proj-123" />, { wrapper });

    const contentDiv = container.querySelector('.whitespace-pre-wrap');
    expect(contentDiv?.textContent).toBe('Line 1\nLine 2\nLine 3');
  });

  it('calls useMessages with correct params', () => {
    mockUseMessages.mockReturnValue({
      data: { messages: [], hasMore: false },
      isLoading: false,
      error: null,
    });

    render(<ChatHistory projectId="custom-project-456" />, { wrapper });

    expect(mockUseMessages).toHaveBeenCalledWith({
      projectId: 'custom-project-456',
      queryConfig: {
        enabled: true,
        staleTime: Infinity,
      },
    });
  });

  it('disables query when projectId is empty', () => {
    mockUseMessages.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });

    render(<ChatHistory projectId="" />, { wrapper });

    expect(mockUseMessages).toHaveBeenCalledWith({
      projectId: '',
      queryConfig: {
        enabled: false,
        staleTime: Infinity,
      },
    });
  });
});
