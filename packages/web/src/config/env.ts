/**
 * Environment Configuration
 *
 * Type-safe environment variable access with runtime validation.
 * All frontend environment variables must use the VITE_ prefix.
 */

interface Env {
  apiUrl: string;
  wsUrl: string;
  devMode: boolean;
}

/**
 * Validates that a required environment variable is defined.
 * Throws an error if the variable is missing.
 */
function getRequiredEnv(key: string): string {
  const value = import.meta.env[key];
  if (value === undefined || value === '') {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
        `Please check your .env.local file and ensure it matches .env.example.`
    );
  }
  return value;
}

/**
 * Gets an optional environment variable with a default value.
 * Logs a warning if using the default value in development.
 */
function getOptionalEnv(key: string, defaultValue: string): string {
  const value = import.meta.env[key];
  if (value === undefined || value === '') {
    if (import.meta.env.DEV) {
      console.warn(`Environment variable ${key} not set, using default: ${defaultValue}`);
    }
    return defaultValue;
  }
  return value;
}

/**
 * Parses a string boolean value.
 */
function parseBoolean(value: string): boolean {
  return value.toLowerCase() === 'true';
}

/**
 * Validates and exports typed environment configuration.
 * This runs at module initialization, ensuring env vars are validated at app startup.
 */
function createEnv(): Env {
  // API URL: if empty, use current origin (for Vite proxy in dev, or same-origin in prod)
  const apiUrlEnv = import.meta.env.VITE_API_URL;
  const apiUrl = apiUrlEnv && apiUrlEnv.trim() !== ''
    ? apiUrlEnv
    : (typeof window !== 'undefined' ? window.location.origin : '');

  const wsUrl = getRequiredEnv('VITE_WS_URL');
  const devMode = parseBoolean(getOptionalEnv('VITE_DEV_MODE', String(import.meta.env.DEV)));

  // Validate URL formats (skip if using relative URL for Vite proxy)
  if (apiUrl && !apiUrl.startsWith('/')) {
    try {
      new URL(apiUrl);
    } catch {
      throw new Error(
        `Invalid VITE_API_URL: "${apiUrl}". Must be a valid URL (e.g., http://localhost:3000) or empty to use Vite proxy`
      );
    }
  }

  // Validate WebSocket URL format
  if (!wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://')) {
    throw new Error(`Invalid VITE_WS_URL: "${wsUrl}". Must start with ws:// or wss://`);
  }

  return {
    apiUrl,
    wsUrl,
    devMode,
  };
}

/**
 * Type-safe environment configuration.
 *
 * Usage:
 *   import { env } from '@/config/env';
 *   fetch(`${env.apiUrl}/users`);
 */
export const env = createEnv();
