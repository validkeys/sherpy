/**
 * Error classification and utility functions for error handling
 * @module lib/error-utils
 */

export enum ErrorType {
  Network = 'NETWORK_ERROR',
  Api = 'API_ERROR',
  Validation = 'VALIDATION_ERROR',
  Authentication = 'AUTH_ERROR',
  Unknown = 'UNKNOWN_ERROR',
}

export interface ClassifiedError {
  type: ErrorType;
  message: string;
  originalError: unknown;
  errorId: string;
  userMessage: string;
  isRecoverable: boolean;
  retryable: boolean;
}

export function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function classifyError(error: unknown): ClassifiedError {
  const errorId = generateErrorId();

  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      type: ErrorType.Network,
      message: 'Network connection failed',
      originalError: error,
      errorId,
      userMessage: 'Unable to connect to the server. Please check your internet connection.',
      isRecoverable: true,
      retryable: true,
    };
  }

  if (
    error &&
    typeof error === 'object' &&
    'status' in error &&
    typeof error.status === 'number'
  ) {
    const status = error.status;

    if (status === 401 || status === 403) {
      return {
        type: ErrorType.Authentication,
        message: 'Authentication failed',
        originalError: error,
        errorId,
        userMessage: 'Your session has expired. Please sign in again.',
        isRecoverable: true,
        retryable: false,
      };
    }

    if (status >= 400 && status < 500) {
      return {
        type: ErrorType.Validation,
        message: 'Invalid request',
        originalError: error,
        errorId,
        userMessage: 'The request could not be completed. Please check your input.',
        isRecoverable: true,
        retryable: false,
      };
    }

    if (status >= 500) {
      return {
        type: ErrorType.Api,
        message: 'Server error',
        originalError: error,
        errorId,
        userMessage: 'A server error occurred. Please try again later.',
        isRecoverable: true,
        retryable: true,
      };
    }
  }

  if (error instanceof Error) {
    return {
      type: ErrorType.Unknown,
      message: error.message,
      originalError: error,
      errorId,
      userMessage: 'An unexpected error occurred. Please try again.',
      isRecoverable: true,
      retryable: true,
    };
  }

  return {
    type: ErrorType.Unknown,
    message: 'Unknown error',
    originalError: error,
    errorId,
    userMessage: 'An unexpected error occurred. Please try again.',
    isRecoverable: true,
    retryable: true,
  };
}

export function logError(error: ClassifiedError, context?: Record<string, unknown>): void {
  const isDev = import.meta.env.DEV;

  if (isDev) {
    console.group(`🔴 Error [${error.type}] - ${error.errorId}`);
    console.error('Message:', error.message);
    console.error('User Message:', error.userMessage);
    console.error('Original Error:', error.originalError);
    if (context) {
      console.error('Context:', context);
    }
    console.groupEnd();
  } else {
    console.error(`[${error.errorId}] ${error.type}: ${error.message}`, {
      errorId: error.errorId,
      type: error.type,
      context,
    });
  }
}

export interface ErrorRecoveryStrategy {
  canRecover: (error: ClassifiedError) => boolean;
  recover: (error: ClassifiedError) => void | Promise<void>;
}

export function createRetryStrategy(
  retryFn: () => void | Promise<void>,
): ErrorRecoveryStrategy {
  return {
    canRecover: (error) => error.retryable,
    recover: retryFn,
  };
}

export function createNavigationStrategy(path: string): ErrorRecoveryStrategy {
  return {
    canRecover: () => true,
    recover: () => {
      window.location.href = path;
    },
  };
}

export function createReloadStrategy(): ErrorRecoveryStrategy {
  return {
    canRecover: () => true,
    recover: () => {
      window.location.reload();
    },
  };
}
