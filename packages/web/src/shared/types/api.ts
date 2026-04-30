/**
 * API Client Types
 *
 * Shared types for API request/response handling, error handling, and type-safe
 * HTTP client methods.
 */

/**
 * Standard API error response structure
 */
export interface ApiErrorResponse {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  stack?: string;
}

/**
 * API Error class with typed response data
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: ApiErrorResponse,
    public cause?: Error
  ) {
    super(message);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Network error (no response received)
 */
export class NetworkError extends Error {
  constructor(
    message: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * HTTP methods supported by the API client
 */
export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';

/**
 * Request configuration options
 */
export interface RequestConfig {
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeout?: number;
}

/**
 * API client interface
 */
export interface ApiClient {
  get<T>(url: string, config?: RequestConfig): Promise<T>;
  post<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T>;
  put<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T>;
  patch<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T>;
  delete<T>(url: string, config?: RequestConfig): Promise<T>;
}

/**
 * React Query configuration types
 */

/**
 * Query configuration that can override query options
 */
export type QueryConfig<TQueryFnData> = Omit<
  TQueryFnData extends (...args: any[]) => infer TReturnType
    ? TReturnType
    : TQueryFnData extends { queryKey: any; queryFn: any }
      ? TQueryFnData
      : never,
  'queryKey' | 'queryFn'
>;

/**
 * Mutation configuration that can override mutation options
 */
export type MutationConfig<TMutationFn extends (...args: any[]) => Promise<any>> = {
  onSuccess?: (
    data: Awaited<ReturnType<TMutationFn>>,
    variables: Parameters<TMutationFn>[0],
    context: unknown
  ) => void;
  onError?: (error: Error, variables: Parameters<TMutationFn>[0], context: unknown) => void;
  onSettled?: (
    data: Awaited<ReturnType<TMutationFn>> | undefined,
    error: Error | null,
    variables: Parameters<TMutationFn>[0],
    context: unknown
  ) => void;
};
