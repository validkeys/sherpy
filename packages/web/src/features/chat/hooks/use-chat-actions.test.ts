import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChatActions } from './use-chat-actions';

// Mock @assistant-ui/react
const mockRuntime = {
  append: vi.fn(),
  switchToNewThread: vi.fn(),
};

vi.mock('@assistant-ui/react', () => ({
  useAssistantRuntime: () => mockRuntime,
}));

describe('useChatActions', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('calls runtime.append with user role', () => {
      const { result } = renderHook(() => useChatActions());

      result.current.sendMessage('Hello, AI!');

      expect(mockRuntime.append).toHaveBeenCalledWith({
        role: 'user',
        content: [{ type: 'text', text: 'Hello, AI!' }],
      });
      expect(mockRuntime.append).toHaveBeenCalledTimes(1);
    });

    it('sends multiple messages with correct format', () => {
      const { result } = renderHook(() => useChatActions());

      result.current.sendMessage('First message');
      result.current.sendMessage('Second message');

      expect(mockRuntime.append).toHaveBeenCalledTimes(2);
      expect(mockRuntime.append).toHaveBeenNthCalledWith(1, {
        role: 'user',
        content: [{ type: 'text', text: 'First message' }],
      });
      expect(mockRuntime.append).toHaveBeenNthCalledWith(2, {
        role: 'user',
        content: [{ type: 'text', text: 'Second message' }],
      });
    });

    it('handles empty string message', () => {
      const { result } = renderHook(() => useChatActions());

      result.current.sendMessage('');

      expect(mockRuntime.append).toHaveBeenCalledWith({
        role: 'user',
        content: [{ type: 'text', text: '' }],
      });
    });

    it('handles message with special characters', () => {
      const { result } = renderHook(() => useChatActions());
      const specialMessage = 'Message with\nnewlines\tand\ttabs & special chars: !@#$%';

      result.current.sendMessage(specialMessage);

      expect(mockRuntime.append).toHaveBeenCalledWith({
        role: 'user',
        content: [{ type: 'text', text: specialMessage }],
      });
    });
  });

  describe('sendSystemMessage', () => {
    it('calls runtime.append with system role', () => {
      const { result } = renderHook(() => useChatActions());

      result.current.sendSystemMessage('System instruction');

      expect(mockRuntime.append).toHaveBeenCalledWith({
        role: 'system',
        content: [{ type: 'text', text: 'System instruction' }],
      });
      expect(mockRuntime.append).toHaveBeenCalledTimes(1);
    });

    it('sends multiple system messages', () => {
      const { result } = renderHook(() => useChatActions());

      result.current.sendSystemMessage('First system message');
      result.current.sendSystemMessage('Second system message');

      expect(mockRuntime.append).toHaveBeenCalledTimes(2);
      expect(mockRuntime.append).toHaveBeenNthCalledWith(1, {
        role: 'system',
        content: [{ type: 'text', text: 'First system message' }],
      });
      expect(mockRuntime.append).toHaveBeenNthCalledWith(2, {
        role: 'system',
        content: [{ type: 'text', text: 'Second system message' }],
      });
    });

    it('handles empty system message', () => {
      const { result } = renderHook(() => useChatActions());

      result.current.sendSystemMessage('');

      expect(mockRuntime.append).toHaveBeenCalledWith({
        role: 'system',
        content: [{ type: 'text', text: '' }],
      });
    });
  });

  describe('clearThread', () => {
    it('calls runtime.switchToNewThread', () => {
      const { result } = renderHook(() => useChatActions());

      result.current.clearThread();

      expect(mockRuntime.switchToNewThread).toHaveBeenCalledTimes(1);
      expect(mockRuntime.switchToNewThread).toHaveBeenCalledWith();
    });

    it('can be called multiple times', () => {
      const { result } = renderHook(() => useChatActions());

      result.current.clearThread();
      result.current.clearThread();
      result.current.clearThread();

      expect(mockRuntime.switchToNewThread).toHaveBeenCalledTimes(3);
    });
  });

  describe('combined operations', () => {
    it('can send messages and clear thread in sequence', () => {
      const { result } = renderHook(() => useChatActions());

      result.current.sendMessage('Message 1');
      result.current.sendMessage('Message 2');
      result.current.clearThread();
      result.current.sendMessage('Message after clear');

      expect(mockRuntime.append).toHaveBeenCalledTimes(3);
      expect(mockRuntime.switchToNewThread).toHaveBeenCalledTimes(1);
    });

    it('can send both user and system messages', () => {
      const { result } = renderHook(() => useChatActions());

      result.current.sendMessage('User message');
      result.current.sendSystemMessage('System message');

      expect(mockRuntime.append).toHaveBeenCalledTimes(2);
      expect(mockRuntime.append).toHaveBeenNthCalledWith(1, {
        role: 'user',
        content: [{ type: 'text', text: 'User message' }],
      });
      expect(mockRuntime.append).toHaveBeenNthCalledWith(2, {
        role: 'system',
        content: [{ type: 'text', text: 'System message' }],
      });
    });
  });

  describe('message content structure', () => {
    it('formats user messages with correct content structure', () => {
      const { result } = renderHook(() => useChatActions());

      result.current.sendMessage('Test');

      const callArgs = mockRuntime.append.mock.calls[0][0];
      expect(callArgs).toHaveProperty('role', 'user');
      expect(callArgs).toHaveProperty('content');
      expect(Array.isArray(callArgs.content)).toBe(true);
      expect(callArgs.content).toHaveLength(1);
      expect(callArgs.content[0]).toEqual({
        type: 'text',
        text: 'Test',
      });
    });

    it('formats system messages with correct content structure', () => {
      const { result } = renderHook(() => useChatActions());

      result.current.sendSystemMessage('System');

      const callArgs = mockRuntime.append.mock.calls[0][0];
      expect(callArgs).toHaveProperty('role', 'system');
      expect(callArgs).toHaveProperty('content');
      expect(Array.isArray(callArgs.content)).toBe(true);
      expect(callArgs.content).toHaveLength(1);
      expect(callArgs.content[0]).toEqual({
        type: 'text',
        text: 'System',
      });
    });
  });

  describe('return value structure', () => {
    it('returns object with all three methods', () => {
      const { result } = renderHook(() => useChatActions());

      expect(result.current).toHaveProperty('sendMessage');
      expect(result.current).toHaveProperty('sendSystemMessage');
      expect(result.current).toHaveProperty('clearThread');

      expect(typeof result.current.sendMessage).toBe('function');
      expect(typeof result.current.sendSystemMessage).toBe('function');
      expect(typeof result.current.clearThread).toBe('function');
    });

    it('returns exactly three methods', () => {
      const { result } = renderHook(() => useChatActions());

      const keys = Object.keys(result.current);
      expect(keys).toHaveLength(3);
      expect(keys).toContain('sendMessage');
      expect(keys).toContain('sendSystemMessage');
      expect(keys).toContain('clearThread');
    });
  });
});
