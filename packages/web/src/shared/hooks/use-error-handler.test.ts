import { ErrorType } from '@/lib/error-utils';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useErrorHandler } from './use-error-handler';

describe('useErrorHandler', () => {
  describe('handleError', () => {
    it('classifies and returns error', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new Error('Test error');

      const classified = result.current.handleError(error);

      expect(classified.type).toBe(ErrorType.Unknown);
      expect(classified.message).toBe('Test error');
      expect(classified.errorId).toBeTruthy();
    });

    it('calls onError callback', () => {
      const onError = vi.fn();
      const { result } = renderHook(() => useErrorHandler({ onError }));
      const error = new Error('Test error');

      result.current.handleError(error);

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ErrorType.Unknown,
          message: 'Test error',
        })
      );
    });

    it('includes context in error logging', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new Error('Test error');
      const context = { operation: 'save', userId: '123' };

      const classified = result.current.handleError(error, context);

      expect(classified).toBeTruthy();
    });
  });

  describe('handleAsyncError', () => {
    it('handles successful async operations', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const successFn = vi.fn().mockResolvedValue('success');

      await result.current.handleAsyncError(successFn);

      expect(successFn).toHaveBeenCalledTimes(1);
    });

    it('catches and handles async errors', async () => {
      const onError = vi.fn();
      const { result } = renderHook(() => useErrorHandler({ onError }));
      const errorFn = vi.fn().mockRejectedValue(new Error('Async error'));

      await result.current.handleAsyncError(errorFn);

      expect(errorFn).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Async error',
        })
      );
    });

    it('includes context in async error handling', async () => {
      const onError = vi.fn();
      const { result } = renderHook(() => useErrorHandler({ onError }));
      const errorFn = vi.fn().mockRejectedValue(new Error('Async error'));
      const context = { operation: 'fetch' };

      await result.current.handleAsyncError(errorFn, context);

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Async error',
        })
      );
    });
  });

  describe('retry', () => {
    it('retries function on failure', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce('success');

      const response = await result.current.retry(mockFn, {
        maxRetries: 3,
        delay: 10,
      });

      expect(mockFn).toHaveBeenCalledTimes(3);
      expect(response).toBe('success');
    });

    it('throws after max retries exceeded', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const mockFn = vi.fn().mockRejectedValue(new Error('Always fails'));

      await expect(result.current.retry(mockFn, { maxRetries: 2, delay: 10 })).rejects.toThrow(
        'Always fails'
      );

      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('does not retry non-retryable errors', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const mockFn = vi.fn().mockRejectedValue({ status: 401, message: 'Unauthorized' });

      await expect(result.current.retry(mockFn, { maxRetries: 3, delay: 10 })).rejects.toEqual({
        status: 401,
        message: 'Unauthorized',
      });

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('uses default retry options', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const mockFn = vi.fn().mockRejectedValue(new Error('Always fails'));

      await expect(result.current.retry(mockFn)).rejects.toThrow('Always fails');

      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('applies exponential backoff delay', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const mockFn = vi.fn().mockRejectedValue(new Error('Fail'));
      const startTime = Date.now();

      await expect(result.current.retry(mockFn, { maxRetries: 3, delay: 50 })).rejects.toThrow(
        'Fail'
      );

      const endTime = Date.now();
      const elapsed = endTime - startTime;

      expect(elapsed).toBeGreaterThanOrEqual(100);
    });

    it('returns result on first success', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const mockFn = vi.fn().mockResolvedValue('success');

      const response = await result.current.retry(mockFn, { maxRetries: 3 });

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(response).toBe('success');
    });
  });

  describe('toast integration', () => {
    it('shows toast when enabled and provided', () => {
      const mockToast = vi.fn();
      const { result } = renderHook(() => useErrorHandler({ showToast: true, toast: mockToast }));

      result.current.handleError(new Error('Test'));

      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Error',
        description: expect.any(String),
      });
    });

    it('does not show toast when disabled', () => {
      const mockToast = vi.fn();
      const { result } = renderHook(() => useErrorHandler({ showToast: false, toast: mockToast }));

      result.current.handleError(new Error('Test'));

      expect(mockToast).not.toHaveBeenCalled();
    });

    it('does not show toast when not provided', () => {
      const { result } = renderHook(() => useErrorHandler({ showToast: true }));
      const error = new Error('Test error');

      expect(() => result.current.handleError(error)).not.toThrow();
    });
  });
});
