/**
 * API Client Types
 *
 * Shared types for API request/response handling, error handling, and type-safe
 * HTTP client methods.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

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
    public cause?: Error,
  ) {
    super(message);
    this.name = "ApiError";
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Network error (no response received)
 */
export class NetworkError extends Error {
  constructor(
    message: string,
    public cause?: Error,
  ) {
    super(message);
    this.name = "NetworkError";
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * HTTP methods supported by the API client
 */
export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE" | "PUT";

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
