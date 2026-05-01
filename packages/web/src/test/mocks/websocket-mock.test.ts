import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type MockWebSocketRuntime,
  createMockMessage,
  createMockWebSocketRuntime,
  resetRuntime,
  simulateConnectionError,
  simulateIncomingMessage,
  simulateMessageSequence,
  simulateStreamingResponse,
} from './websocket-mock';

describe('WebSocket Mock Utilities', () => {
  let runtime: MockWebSocketRuntime;

  beforeEach(() => {
    runtime = createMockWebSocketRuntime();
  });

  describe('createMockWebSocketRuntime', () => {
    it('creates runtime with expected structure', () => {
      expect(runtime).toHaveProperty('append');
      expect(runtime).toHaveProperty('switchToNewThread');
      expect(runtime).toHaveProperty('messages');
      expect(runtime).toHaveProperty('isRunning');
      expect(runtime).toHaveProperty('subscribe');
    });

    it('initializes with empty messages', () => {
      expect(runtime.messages).toEqual([]);
    });

    it('initializes with isRunning false', () => {
      expect(runtime.isRunning).toBe(false);
    });

    it('append returns message with id', async () => {
      const result = await runtime.append({ role: 'user', content: 'test' });
      expect(result).toHaveProperty('id');
      expect(result.content).toBe('test');
    });

    it('subscribe returns unsubscribe function', () => {
      const unsubscribe = runtime.subscribe();
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('simulateStreamingResponse', () => {
    it('progressively updates message content', () => {
      vi.useFakeTimers();
      const chunks = ['Hello', 'Hello, how', 'Hello, how can I help?'];

      simulateStreamingResponse(runtime, 'msg-1', chunks);

      // Initial state - streaming started
      expect(runtime.isRunning).toBe(true);

      // After all chunks processed (synchronously with 0 delay)
      vi.runAllTimers();
      expect(runtime.messages).toHaveLength(1);
      expect(runtime.messages[0].content).toBe(chunks[chunks.length - 1]);
      expect(runtime.isRunning).toBe(false);
      vi.useRealTimers();
    });

    it('sets isRunning to true during streaming', () => {
      simulateStreamingResponse(runtime, 'msg-1', ['Test']);
      expect(runtime.isRunning).toBe(true);
    });

    it('sets isRunning to false after final chunk', () => {
      vi.useFakeTimers();
      simulateStreamingResponse(runtime, 'msg-1', ['First', 'Second', 'Final']);
      vi.runAllTimers();
      expect(runtime.isRunning).toBe(false);
      vi.useRealTimers();
    });

    it('updates existing message instead of creating duplicates', () => {
      vi.useFakeTimers();
      simulateStreamingResponse(runtime, 'msg-1', ['A', 'AB', 'ABC']);
      vi.runAllTimers();

      expect(runtime.messages).toHaveLength(1);
      expect(runtime.messages[0].id).toBe('msg-1');
      expect(runtime.messages[0].content).toBe('ABC');
      vi.useRealTimers();
    });
  });

  describe('simulateConnectionError', () => {
    it('calls error handler with error object', () => {
      const mockErrorHandler = vi.fn();
      simulateConnectionError(mockErrorHandler, 'Network timeout');

      expect(mockErrorHandler).toHaveBeenCalledTimes(1);
      const error = mockErrorHandler.mock.calls[0][0];
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Network timeout');
    });

    it('uses default error message if not provided', () => {
      const mockErrorHandler = vi.fn();
      simulateConnectionError(mockErrorHandler);

      const error = mockErrorHandler.mock.calls[0][0];
      expect(error.message).toBe('WebSocket connection failed');
    });
  });

  describe('simulateIncomingMessage', () => {
    it('adds message to runtime messages', () => {
      const message = {
        id: 'msg-1',
        role: 'assistant' as const,
        content: 'Hello!',
      };

      simulateIncomingMessage(runtime, message);

      expect(runtime.messages).toHaveLength(1);
      expect(runtime.messages[0]).toEqual(message);
    });

    it('appends to existing messages', () => {
      simulateIncomingMessage(runtime, {
        id: 'msg-1',
        role: 'user',
        content: 'First',
      });
      simulateIncomingMessage(runtime, {
        id: 'msg-2',
        role: 'assistant',
        content: 'Second',
      });

      expect(runtime.messages).toHaveLength(2);
    });
  });

  describe('simulateMessageSequence', () => {
    it('adds multiple messages in order', () => {
      const messages = [
        { id: 'msg-1', role: 'user' as const, content: 'Hi' },
        { id: 'msg-2', role: 'assistant' as const, content: 'Hello' },
        { id: 'msg-3', role: 'user' as const, content: 'How are you?' },
      ];

      simulateMessageSequence(runtime, messages);

      expect(runtime.messages).toHaveLength(3);
      expect(runtime.messages).toEqual(messages);
    });

    it('handles empty array', () => {
      simulateMessageSequence(runtime, []);
      expect(runtime.messages).toHaveLength(0);
    });
  });

  describe('createMockMessage', () => {
    it('creates message with default values', () => {
      const message = createMockMessage();

      expect(message).toHaveProperty('id');
      expect(message.role).toBe('user');
      expect(message.content).toBe('Mock message content');
      expect(message).toHaveProperty('createdAt');
    });

    it('applies overrides', () => {
      const message = createMockMessage({
        role: 'assistant',
        content: 'Custom content',
      });

      expect(message.role).toBe('assistant');
      expect(message.content).toBe('Custom content');
    });

    it('generates unique IDs', () => {
      const msg1 = createMockMessage();
      const msg2 = createMockMessage();

      expect(msg1.id).not.toBe(msg2.id);
    });

    it('includes timestamp', () => {
      const message = createMockMessage();
      expect(message.createdAt).toBeDefined();
      expect(new Date(message.createdAt!).getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('resetRuntime', () => {
    it('clears messages', () => {
      simulateMessageSequence(runtime, [
        createMockMessage({ id: '1' }),
        createMockMessage({ id: '2' }),
      ]);

      resetRuntime(runtime);

      expect(runtime.messages).toEqual([]);
    });

    it('resets isRunning flag', () => {
      runtime.isRunning = true;

      resetRuntime(runtime);

      expect(runtime.isRunning).toBe(false);
    });

    it('clears mock call history', () => {
      runtime.append({ role: 'user', content: 'test' });
      runtime.switchToNewThread();
      runtime.subscribe();

      expect(runtime.append).toHaveBeenCalled();
      expect(runtime.switchToNewThread).toHaveBeenCalled();
      expect(runtime.subscribe).toHaveBeenCalled();

      resetRuntime(runtime);

      expect(runtime.append).not.toHaveBeenCalled();
      expect(runtime.switchToNewThread).not.toHaveBeenCalled();
      expect(runtime.subscribe).not.toHaveBeenCalled();
    });
  });

  describe('Integration Example: Chat Flow', () => {
    it('simulates complete chat conversation flow', () => {
      vi.useFakeTimers();
      // User sends message
      const userMessage = createMockMessage({
        role: 'user',
        content: 'What is TypeScript?',
      });
      simulateIncomingMessage(runtime, userMessage);

      expect(runtime.messages).toHaveLength(1);
      expect(runtime.messages[0].role).toBe('user');

      // Assistant starts streaming response
      const assistantMessageId = 'assistant-msg-1';
      simulateStreamingResponse(runtime, assistantMessageId, [
        'TypeScript is',
        'TypeScript is a typed',
        'TypeScript is a typed superset of JavaScript',
      ]);

      expect(runtime.isRunning).toBe(true);

      // Stream completes
      vi.runAllTimers();

      expect(runtime.isRunning).toBe(false);
      expect(runtime.messages).toHaveLength(2);
      expect(runtime.messages[1].content).toBe('TypeScript is a typed superset of JavaScript');
      vi.useRealTimers();
    });

    it('simulates error during conversation', () => {
      const mockErrorHandler = vi.fn();

      // Start conversation
      simulateIncomingMessage(runtime, createMockMessage({ role: 'user' }));

      // Error occurs
      simulateConnectionError(mockErrorHandler, 'Network unreachable');

      expect(mockErrorHandler).toHaveBeenCalled();
      expect(runtime.messages).toHaveLength(1); // User message still there
    });

    it('simulates reconnection and state restoration', () => {
      // Initial conversation
      const initialMessages = [
        createMockMessage({ id: '1', role: 'user', content: 'Hello' }),
        createMockMessage({ id: '2', role: 'assistant', content: 'Hi!' }),
      ];
      simulateMessageSequence(runtime, initialMessages);

      // Simulate disconnection by resetting
      const savedMessages = [...runtime.messages];
      resetRuntime(runtime);

      expect(runtime.messages).toHaveLength(0);

      // Restore messages after reconnection
      simulateMessageSequence(runtime, savedMessages);

      expect(runtime.messages).toEqual(initialMessages);
    });
  });
});
