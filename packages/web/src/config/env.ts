/**
 * Environment Configuration
 *
 * Typed and validated environment variables.
 * All frontend env vars must be prefixed with VITE_.
 */

interface Env {
  apiUrl: string;
  wsUrl: string;
  devMode: boolean;
}

function getEnv(): Env {
  const apiUrl = import.meta.env.VITE_API_URL;
  const wsUrl = import.meta.env.VITE_WS_URL;
  const devMode = import.meta.env.VITE_DEV_MODE === 'true' || import.meta.env.DEV;

  // Validate required environment variables
  if (!apiUrl) {
    throw new Error('VITE_API_URL is required');
  }

  if (!wsUrl) {
    throw new Error('VITE_WS_URL is required');
  }

  return {
    apiUrl,
    wsUrl,
    devMode,
  };
}

export const env = getEnv();
