/**
 * API Client Tests
 *
 * Comprehensive test coverage for API client including successful requests,
 * error handling, authentication, retry logic, and timeout behavior.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, clearAuthToken, setAuthToken } from './api-client';
import { ApiError, NetworkError } from '@/shared/types/api';

describe('api-client', () => {
  let localStorageMock: Record<string, string>;

  beforeEach(() => {
    vi.clearAllMocks();

    localStorageMock = {};

    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => localStorageMock[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          localStorageMock[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete localStorageMock[key];
        }),
        clear: vi.fn(() => {
          localStorageMock = {};
        }),
      },
      writable: true,
    });

    global.fetch = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('GET requests', () => {
    it('makes successful GET request', async () => {
      const mockData = { id: 1, name: 'Test' };
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify(mockData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const promise = api.get('/api/projects');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual(mockData);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/projects'),
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('includes query parameters in URL', async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const promise = api.get('/api/projects', {
        params: { page: 2, limit: 10 },
      });
      await vi.runAllTimersAsync();
      await promise;

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('page=2'),
        expect.anything()
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=10'),
        expect.anything()
      );
    });

    it('skips undefined query parameters', async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const promise = api.get('/api/projects', {
        params: { page: 1, filter: undefined },
      });
      await vi.runAllTimersAsync();
      await promise;

      const callUrl = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(callUrl).not.toContain('filter');
    });
  });

  describe('POST requests', () => {
    it('makes successful POST request with body', async () => {
      const requestData = { name: 'New Project' };
      const responseData = { id: 1, ...requestData };

      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify(responseData), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const promise = api.post('/api/projects', requestData);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual(responseData);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/projects'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestData),
        })
      );
    });

    it('makes POST request without body', async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const promise = api.post('/api/projects/123/archive');
      await vi.runAllTimersAsync();
      await promise;

      expect(fetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          method: 'POST',
          body: undefined,
        })
      );
    });
  });

  describe('PATCH requests', () => {
    it('makes successful PATCH request', async () => {
      const updateData = { name: 'Updated Name' };
      const responseData = { id: 1, ...updateData };

      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify(responseData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const promise = api.patch('/api/projects/1', updateData);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual(responseData);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/projects/1'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(updateData),
        })
      );
    });
  });

  describe('DELETE requests', () => {
    it('makes successful DELETE request', async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const promise = api.delete('/api/projects/1');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual({ success: true });
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/projects/1'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('authentication', () => {
    it('includes Authorization header when token is set', async () => {
      setAuthToken('test-token-123');

      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const promise = api.get('/api/projects');
      await vi.runAllTimersAsync();
      await promise;

      const callHeaders = vi.mocked(fetch).mock.calls[0][1]?.headers as Headers;
      expect(callHeaders.get('Authorization')).toBe('Bearer test-token-123');
    });

    it('omits Authorization header when no token is set', async () => {
      clearAuthToken();

      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const promise = api.get('/api/projects');
      await vi.runAllTimersAsync();
      await promise;

      const callHeaders = vi.mocked(fetch).mock.calls[0][1]?.headers as Headers;
      expect(callHeaders.get('Authorization')).toBeNull();
    });

    it('clears token and dispatches event on 401 response', async () => {
      setAuthToken('test-token');

      const eventListener = vi.fn();
      window.addEventListener('auth:unauthorized', eventListener);

      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ message: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const promise = api.get('/api/projects');
      await vi.runAllTimersAsync();

      try {
        await promise;
        expect.fail('Expected promise to reject');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
      }

      expect(localStorageMock['auth_token']).toBeUndefined();
      expect(eventListener).toHaveBeenCalled();

      window.removeEventListener('auth:unauthorized', eventListener);
    });
  });

  describe('error handling', () => {
    it('throws ApiError on 4xx response', async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ message: 'Not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const promise = api.get('/api/projects/999');
      await vi.runAllTimersAsync();

      try {
        await promise;
        expect.fail('Expected promise to reject');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(404);
        expect(error).toHaveProperty('message', 'Not found');
      }
    });

    it('throws ApiError on 5xx response', async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ message: 'Internal Server Error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const promise = api.get('/api/projects');
      await vi.runAllTimersAsync();

      try {
        await promise;
        expect.fail('Expected promise to reject');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(500);
      }
    });

    it('handles error response without JSON body', async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response('Bad Gateway', {
          status: 502,
        })
      );

      const promise = api.get('/api/projects');
      await vi.runAllTimersAsync();

      try {
        await promise;
        expect.fail('Expected promise to reject');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
      }
    });

    it('throws NetworkError on fetch failure', async () => {
      vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'));

      const promise = api.get('/api/projects');
      await vi.runAllTimersAsync();

      try {
        await promise;
        expect.fail('Expected promise to reject');
      } catch (error) {
        expect(error).toBeInstanceOf(NetworkError);
      }
    });
  });

  describe('timeout handling', () => {
    beforeEach(() => {
      vi.useRealTimers();
    });

    afterEach(() => {
      vi.useFakeTimers();
    });

    it('throws NetworkError on timeout', async () => {
      vi.mocked(fetch).mockImplementation(
        (_url, options) =>
          new Promise((_resolve, reject) => {
            // Listen for abort signal
            options?.signal?.addEventListener('abort', () => {
              reject(new DOMException('The operation was aborted', 'AbortError'));
            });
          })
      );

      try {
        await api.get('/api/projects', { timeout: 100 });
        expect.fail('Expected promise to reject');
      } catch (error) {
        expect(error).toBeInstanceOf(NetworkError);
        expect(error).toHaveProperty('message', 'Request timeout');
      }
    });

    it('respects custom timeout', async () => {
      vi.mocked(fetch).mockImplementation(
        (_url, options) =>
          new Promise((_resolve, reject) => {
            // Listen for abort signal
            options?.signal?.addEventListener('abort', () => {
              reject(new DOMException('The operation was aborted', 'AbortError'));
            });
          })
      );

      try {
        await api.get('/api/projects', { timeout: 50 });
        expect.fail('Expected promise to reject');
      } catch (error) {
        expect(error).toBeInstanceOf(NetworkError);
        expect(error).toHaveProperty('message', 'Request timeout');
      }
    });
  });

  describe('retry logic', () => {
    it('retries on 5xx error', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ message: 'Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ id: 1 }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );

      const promise = api.get('/api/projects');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual({ id: 1 });
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('retries on network error', async () => {
      vi.mocked(fetch)
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ id: 1 }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );

      const promise = api.get('/api/projects');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual({ id: 1 });
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('does not retry on 4xx errors', async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ message: 'Bad Request' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const promise = api.get('/api/projects');
      await vi.runAllTimersAsync();

      try {
        await promise;
        expect.fail('Expected promise to reject');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
      }
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('stops retrying after max attempts', async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ message: 'Server Error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const promise = api.get('/api/projects');
      await vi.runAllTimersAsync();

      try {
        await promise;
        expect.fail('Expected promise to reject');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
      }
      expect(fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('content type handling', () => {
    it('parses JSON responses', async () => {
      const data = { id: 1, name: 'Test' };
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify(data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const promise = api.get('/api/projects');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual(data);
    });

    it('parses text responses', async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response('Plain text response', {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        })
      );

      const promise = api.get('/api/export');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('Plain text response');
    });

    it('handles blob responses', async () => {
      const blob = new Blob(['file content'], { type: 'application/pdf' });
      vi.mocked(fetch).mockResolvedValue(
        new Response(blob, {
          status: 200,
          headers: { 'Content-Type': 'application/pdf' },
        })
      );

      const promise = api.get('/api/download');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBeInstanceOf(Blob);
    });
  });

  describe('custom headers', () => {
    it('includes custom headers in request', async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const promise = api.get('/api/projects', {
        headers: { 'X-Custom-Header': 'custom-value' },
      });
      await vi.runAllTimersAsync();
      await promise;

      const callHeaders = vi.mocked(fetch).mock.calls[0][1]?.headers as Headers;
      expect(callHeaders.get('X-Custom-Header')).toBe('custom-value');
    });

    it('allows overriding Content-Type header', async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response('', {
          status: 200,
        })
      );

      const promise = api.post('/api/upload', 'file content', {
        headers: { 'Content-Type': 'text/plain' },
      });
      await vi.runAllTimersAsync();
      await promise;

      const callHeaders = vi.mocked(fetch).mock.calls[0][1]?.headers as Headers;
      expect(callHeaders.get('Content-Type')).toBe('text/plain');
    });
  });

  describe('token management', () => {
    it('setAuthToken stores token in localStorage', () => {
      setAuthToken('new-token');
      expect(localStorageMock['auth_token']).toBe('new-token');
    });

    it('clearAuthToken removes token from localStorage', () => {
      setAuthToken('token-to-clear');
      clearAuthToken();
      expect(localStorageMock['auth_token']).toBeUndefined();
    });
  });
});
