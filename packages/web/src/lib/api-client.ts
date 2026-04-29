/**
 * API Client
 *
 * Type-safe fetch wrapper with authentication, error handling, and retry logic.
 * Provides the foundation for React Query integration.
 */

import { env } from '@/config/env';
import {
  ApiClient,
  ApiError,
  HttpMethod,
  NetworkError,
  RequestConfig,
} from '@/shared/types/api';

const TOKEN_KEY = 'auth_token';
const DEFAULT_TIMEOUT = 30000;
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

/**
 * Retrieves authentication token from localStorage
 */
function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Sets authentication token in localStorage
 */
export function setAuthToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to store auth token:', error);
  }
}

/**
 * Clears authentication token from localStorage
 */
export function clearAuthToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error('Failed to clear auth token:', error);
  }
}

/**
 * Builds full URL with query parameters
 * Note: If path is an absolute URL (e.g., http://external-api.com/...),
 * it overrides baseUrl, allowing calls to external APIs when needed.
 */
function buildUrl(baseUrl: string, path: string, params?: RequestConfig['params']): string {
  const url = new URL(path, baseUrl);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  return url.toString();
}

/**
 * Creates headers with authentication and content type
 * @param config - Request configuration with optional custom headers
 * @param hasBody - Whether the request has a body (sets Content-Type only if true)
 */
function createHeaders(config?: RequestConfig, hasBody = false): Headers {
  const headers = new Headers(config?.headers);

  const token = getAuthToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Only set Content-Type for requests with a body (POST, PUT, PATCH)
  if (hasBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return headers;
}

/**
 * Parses response based on content type
 */
async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('Content-Type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  if (contentType.includes('text/')) {
    const text = await response.text();
    return text as unknown as T;
  }

  return response.blob() as unknown as T;
}

/**
 * Handles HTTP error responses
 */
async function handleErrorResponse(response: Response): Promise<never> {
  let errorData;
  try {
    errorData = await response.json();
  } catch {
    errorData = { message: response.statusText };
  }

  const message = errorData.message || `HTTP ${response.status}: ${response.statusText}`;

  throw new ApiError(message, response.status, errorData);
}

/**
 * Checks if error is retryable (network issues or 5xx errors)
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof NetworkError) {
    return true;
  }

  if (error instanceof ApiError) {
    return error.status >= 500 && error.status < 600;
  }

  return false;
}

/**
 * Delays execution for retry backoff
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Merges multiple abort signals into one
 * When any signal aborts, the returned signal aborts
 */
function mergeAbortSignals(...signals: (AbortSignal | undefined)[]): AbortSignal {
  const controller = new AbortController();
  const validSignals = signals.filter((s): s is AbortSignal => s !== undefined);

  for (const signal of validSignals) {
    if (signal.aborted) {
      controller.abort();
      return controller.signal;
    }

    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  return controller.signal;
}

/**
 * Makes HTTP request with timeout, retry, and error handling
 */
async function request<T>(
  method: HttpMethod,
  path: string,
  config?: RequestConfig,
  body?: unknown,
  retryCount = 0
): Promise<T> {
  const url = buildUrl(env.apiUrl, path, config?.params);
  const headers = createHeaders(config, !!body);
  const timeout = config?.timeout ?? DEFAULT_TIMEOUT;

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

  // Merge user signal (if provided) with timeout signal so both can abort
  const signal = config?.signal
    ? mergeAbortSignals(config.signal, timeoutController.signal)
    : timeoutController.signal;

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 401) {
        clearAuthToken();
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      }
      await handleErrorResponse(response);
    }

    return parseResponse<T>(response);
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new NetworkError('Request timeout', error as Error);
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      const networkError = new NetworkError('Network request failed', error);

      if (retryCount < MAX_RETRIES && isRetryableError(networkError)) {
        await delay(RETRY_DELAY * (retryCount + 1));
        return request<T>(method, path, config, body, retryCount + 1);
      }

      throw networkError;
    }

    if (error instanceof ApiError) {
      if (retryCount < MAX_RETRIES && isRetryableError(error)) {
        await delay(RETRY_DELAY * (retryCount + 1));
        return request<T>(method, path, config, body, retryCount + 1);
      }
    }

    throw error;
  }
}

/**
 * Type-safe API client with authentication and error handling
 */
export const api: ApiClient = {
  get<T>(url: string, config?: RequestConfig): Promise<T> {
    return request<T>('GET', url, config);
  },

  post<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return request<T>('POST', url, config, data);
  },

  put<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return request<T>('PUT', url, config, data);
  },

  patch<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return request<T>('PATCH', url, config, data);
  },

  delete<T>(url: string, config?: RequestConfig): Promise<T> {
    return request<T>('DELETE', url, config);
  },
};
