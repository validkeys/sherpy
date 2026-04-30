import { type ClassifiedError, classifyError, logError } from '@/lib/error-utils';
import { useCallback } from 'react';

interface UseErrorHandlerOptions {
  onError?: (error: ClassifiedError) => void;
  showToast?: boolean;
  toast?: (options: {
    variant?: 'default' | 'destructive';
    title: string;
    description: string;
  }) => void;
}

interface ErrorHandler {
  handleError: (error: unknown, context?: Record<string, unknown>) => ClassifiedError;
  handleAsyncError: (fn: () => Promise<void>, context?: Record<string, unknown>) => Promise<void>;
  retry: <T>(fn: () => Promise<T>, options?: { maxRetries?: number; delay?: number }) => Promise<T>;
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}): ErrorHandler {
  const { onError, showToast = false, toast } = options;

  const handleError = useCallback(
    (error: unknown, context?: Record<string, unknown>): ClassifiedError => {
      const classifiedError = classifyError(error);

      logError(classifiedError, context);

      if (showToast && toast) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: classifiedError.userMessage,
        });
      }

      onError?.(classifiedError);

      return classifiedError;
    },
    [onError, showToast, toast]
  );

  const handleAsyncError = useCallback(
    async (fn: () => Promise<void>, context?: Record<string, unknown>): Promise<void> => {
      try {
        await fn();
      } catch (error) {
        handleError(error, context);
      }
    },
    [handleError]
  );

  const retry = useCallback(
    async <T>(
      fn: () => Promise<T>,
      options: { maxRetries?: number; delay?: number } = {}
    ): Promise<T> => {
      const { maxRetries = 3, delay = 1000 } = options;
      let lastError: unknown;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          return await fn();
        } catch (error) {
          lastError = error;
          const classifiedError = classifyError(error);

          if (!classifiedError.retryable) {
            handleError(error, { attempt, maxRetries });
            throw error;
          }

          if (attempt < maxRetries - 1) {
            await new Promise((resolve) => setTimeout(resolve, delay * (attempt + 1)));
          }
        }
      }

      handleError(lastError, { attempts: maxRetries });
      throw lastError;
    },
    [handleError]
  );

  return {
    handleError,
    handleAsyncError,
    retry,
  };
}
