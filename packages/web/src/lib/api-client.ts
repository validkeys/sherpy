/**
 * API Client
 *
 * Fetch wrapper for making authenticated API requests.
 * Used by React Query hooks in the API layer.
 */

import { env } from '../config/env';

export interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: unknown;
}

export class ApiClientError extends Error implements ApiError {
  public status?: number;
  public code?: string;
  public details?: unknown;

  constructor(message: string, status?: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RequestOptions extends globalThis.RequestInit {
  timeout?: number;
}

/**
 * Get authentication token from storage
 */
function getAuthToken(): string | null {
  // TODO: Implement token storage (localStorage or memory)
  return null;
}

/**
 * Make an authenticated API request
 */
async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { timeout = 30000, ...fetchOptions } = options;

  const url = `${env.apiUrl}${endpoint}`;
  const token = getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new ApiClientError(
        errorBody.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorBody.code,
        errorBody
      );
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return {} as T;
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ApiClientError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new ApiClientError('Request timeout', undefined, 'TIMEOUT');
      }
      throw new ApiClientError(error.message, undefined, 'NETWORK_ERROR', error);
    }

    throw new ApiClientError('Unknown error occurred', undefined, 'UNKNOWN_ERROR');
  }
}

/**
 * HTTP method helpers
 */
export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};
