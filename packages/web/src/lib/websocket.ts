/**
 * WebSocket configuration utilities
 *
 * Provides functions for:
 * - Getting WebSocket base URL from environment
 * - Getting authentication token (with DEV_MODE bypass)
 * - Building authenticated WebSocket URLs with project context
 */

/**
 * Get the WebSocket base URL from environment variables
 *
 * @returns WebSocket base URL, defaults to 'ws://localhost:8080' if not configured
 */
export function getWebSocketUrl(): string {
  return import.meta.env.VITE_WS_URL || 'ws://localhost:8080';
}

/**
 * Get authentication token for WebSocket connections
 *
 * In DEV_MODE, returns null (no auth required)
 * Otherwise, retrieves JWT from localStorage
 *
 * @returns JWT token string or null if not available/not required
 */
export function getAuthToken(): string | null {
  // In development mode, no auth token is required
  if (import.meta.env.VITE_DEV_MODE === 'true') {
    return null;
  }

  // Get JWT from localStorage
  return localStorage.getItem('auth_token');
}

/**
 * Build an authenticated WebSocket URL with project context
 *
 * Combines base URL, project ID, and optional auth token into a complete WebSocket URL
 *
 * @param projectId - The project ID to connect to
 * @returns Complete WebSocket URL with query parameters
 *
 * @example
 * // With auth token
 * buildAuthenticatedWsUrl('proj-123')
 * // => 'ws://localhost:8080?projectId=proj-123&token=eyJ...'
 *
 * @example
 * // Without auth token (DEV_MODE)
 * buildAuthenticatedWsUrl('proj-123')
 * // => 'ws://localhost:8080?projectId=proj-123'
 */
export function buildAuthenticatedWsUrl(projectId: string): string {
  const baseUrl = getWebSocketUrl();
  const token = getAuthToken();

  // Always include projectId
  let url = `${baseUrl}?projectId=${projectId}`;

  // Add token if available
  if (token) {
    url += `&token=${token}`;
  }

  return url;
}
