/**
 * Message Converter Tests
 *
 * Unit tests for ChatMessage to ThreadMessageLike conversion.
 */

import { describe, it, expect } from 'vitest';
import type { ChatMessage } from '../types';
import { convertToThreadMessage, convertMessagesToThread } from './message-converter';

describe('convertToThreadMessage', () => {
  it('converts user message correctly', () => {
    const chatMessage: ChatMessage = {
      id: 'msg-1',
      projectId: 'proj-1',
      role: 'user',
      content: 'Hello, world!',
      createdAt: '2026-05-04T10:00:00Z',
    };

    const result = convertToThreadMessage(chatMessage);

    expect(result).toEqual({
      id: 'msg-1',
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Hello, world!',
        },
      ],
      createdAt: new Date('2026-05-04T10:00:00Z'),
    });
  });

  it('converts assistant message correctly', () => {
    const chatMessage: ChatMessage = {
      id: 'msg-2',
      projectId: 'proj-1',
      role: 'assistant',
      content: 'Hi there!',
      createdAt: '2026-05-04T10:01:00Z',
    };

    const result = convertToThreadMessage(chatMessage);

    expect(result).toEqual({
      id: 'msg-2',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: 'Hi there!',
        },
      ],
      createdAt: new Date('2026-05-04T10:01:00Z'),
    });
  });

  it('converts system message correctly', () => {
    const chatMessage: ChatMessage = {
      id: 'msg-3',
      projectId: 'proj-1',
      role: 'system',
      content: 'System initialization',
      createdAt: '2026-05-04T09:59:00Z',
    };

    const result = convertToThreadMessage(chatMessage);

    expect(result).toEqual({
      id: 'msg-3',
      role: 'system',
      content: [
        {
          type: 'text',
          text: 'System initialization',
        },
      ],
      createdAt: new Date('2026-05-04T09:59:00Z'),
    });
  });

  it('handles empty content string', () => {
    const chatMessage: ChatMessage = {
      id: 'msg-4',
      projectId: 'proj-1',
      role: 'user',
      content: '',
      createdAt: '2026-05-04T10:02:00Z',
    };

    const result = convertToThreadMessage(chatMessage);

    expect(result).toEqual({
      id: 'msg-4',
      role: 'user',
      content: [
        {
          type: 'text',
          text: '',
        },
      ],
      createdAt: new Date('2026-05-04T10:02:00Z'),
    });
  });

  it('handles multiline content', () => {
    const chatMessage: ChatMessage = {
      id: 'msg-5',
      projectId: 'proj-1',
      role: 'user',
      content: 'Line 1\nLine 2\nLine 3',
      createdAt: '2026-05-04T10:03:00Z',
    };

    const result = convertToThreadMessage(chatMessage);

    expect(result.content).toEqual([
      {
        type: 'text',
        text: 'Line 1\nLine 2\nLine 3',
      },
    ]);
  });

  it('preserves special characters in content', () => {
    const chatMessage: ChatMessage = {
      id: 'msg-6',
      projectId: 'proj-1',
      role: 'user',
      content: 'Special chars: <>&"\'',
      createdAt: '2026-05-04T10:04:00Z',
    };

    const result = convertToThreadMessage(chatMessage);

    expect(result.content).toEqual([
      {
        type: 'text',
        text: 'Special chars: <>&"\'',
      },
    ]);
  });
});

describe('convertMessagesToThread', () => {
  it('converts empty array', () => {
    const result = convertMessagesToThread([]);

    expect(result).toEqual([]);
  });

  it('converts single message', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg-1',
        projectId: 'proj-1',
        role: 'user',
        content: 'Hello',
        createdAt: '2026-05-04T10:00:00Z',
      },
    ];

    const result = convertMessagesToThread(messages);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'msg-1',
      role: 'user',
      content: [{ type: 'text', text: 'Hello' }],
      createdAt: new Date('2026-05-04T10:00:00Z'),
    });
  });

  it('converts multiple messages in order', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg-1',
        projectId: 'proj-1',
        role: 'user',
        content: 'First',
        createdAt: '2026-05-04T10:00:00Z',
      },
      {
        id: 'msg-2',
        projectId: 'proj-1',
        role: 'assistant',
        content: 'Second',
        createdAt: '2026-05-04T10:01:00Z',
      },
      {
        id: 'msg-3',
        projectId: 'proj-1',
        role: 'user',
        content: 'Third',
        createdAt: '2026-05-04T10:02:00Z',
      },
    ];

    const result = convertMessagesToThread(messages);

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe('msg-1');
    expect(result[1].id).toBe('msg-2');
    expect(result[2].id).toBe('msg-3');
    expect(result[0].role).toBe('user');
    expect(result[1].role).toBe('assistant');
    expect(result[2].role).toBe('user');
  });

  it('maintains chronological order', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg-1',
        projectId: 'proj-1',
        role: 'user',
        content: 'A',
        createdAt: '2026-05-04T10:00:00Z',
      },
      {
        id: 'msg-2',
        projectId: 'proj-1',
        role: 'assistant',
        content: 'B',
        createdAt: '2026-05-04T10:01:00Z',
      },
      {
        id: 'msg-3',
        projectId: 'proj-1',
        role: 'user',
        content: 'C',
        createdAt: '2026-05-04T10:02:00Z',
      },
    ];

    const result = convertMessagesToThread(messages);

    expect(result[0].createdAt?.getTime()).toBeLessThan(
      result[1].createdAt?.getTime() ?? 0
    );
    expect(result[1].createdAt?.getTime()).toBeLessThan(
      result[2].createdAt?.getTime() ?? 0
    );
  });

  it('handles conversation with 10 messages (M4-UI-005 test case)', () => {
    const messages: ChatMessage[] = Array.from({ length: 10 }, (_, i) => ({
      id: `msg-${i + 1}`,
      projectId: 'c8a6716f-ccfc-4e38-94f6-8dc2b97703f0',
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `Message ${i + 1}`,
      createdAt: new Date(Date.UTC(2026, 4, 4, 10, i, 0)).toISOString(),
    }));

    const result = convertMessagesToThread(messages);

    expect(result).toHaveLength(10);
    expect(result[0].role).toBe('user');
    expect(result[1].role).toBe('assistant');
    expect(result[9].id).toBe('msg-10');
  });
});
