/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('env configuration', () => {
  // Store original import.meta.env
  const originalEnv = { ...import.meta.env };

  beforeEach(() => {
    // Reset import.meta.env before each test
    Object.keys(import.meta.env).forEach((key) => {
      delete import.meta.env[key];
    });
    Object.assign(import.meta.env, originalEnv);

    // Clear module cache to force re-evaluation
    vi.resetModules();
  });

  describe('valid configuration', () => {
    it('should export env object with valid values', async () => {
      import.meta.env.VITE_API_URL = 'http://localhost:3000';
      import.meta.env.VITE_WS_URL = 'ws://localhost:3000';
      import.meta.env.VITE_DEV_MODE = 'true';

      const { env } = await import('./env');

      expect(env).toEqual({
        apiUrl: 'http://localhost:3000',
        wsUrl: 'ws://localhost:3000',
        devMode: true,
      });
    });

    it('should parse VITE_DEV_MODE as boolean true', async () => {
      import.meta.env.VITE_API_URL = 'http://localhost:3000';
      import.meta.env.VITE_WS_URL = 'ws://localhost:3000';
      import.meta.env.VITE_DEV_MODE = 'true';

      const { env } = await import('./env');

      expect(env.devMode).toBe(true);
    });

    it('should parse VITE_DEV_MODE as boolean false', async () => {
      import.meta.env.VITE_API_URL = 'http://localhost:3000';
      import.meta.env.VITE_WS_URL = 'ws://localhost:3000';
      import.meta.env.VITE_DEV_MODE = 'false';

      const { env } = await import('./env');

      expect(env.devMode).toBe(false);
    });

    it('should handle https API URLs', async () => {
      import.meta.env.VITE_API_URL = 'https://api.example.com';
      import.meta.env.VITE_WS_URL = 'wss://api.example.com';
      import.meta.env.VITE_DEV_MODE = 'false';

      const { env } = await import('./env');

      expect(env.apiUrl).toBe('https://api.example.com');
      expect(env.wsUrl).toBe('wss://api.example.com');
    });

    it('should handle API URLs with paths', async () => {
      import.meta.env.VITE_API_URL = 'http://localhost:3000/api/v1';
      import.meta.env.VITE_WS_URL = 'ws://localhost:3000';
      import.meta.env.VITE_DEV_MODE = 'true';

      const { env } = await import('./env');

      expect(env.apiUrl).toBe('http://localhost:3000/api/v1');
    });

    it('should use import.meta.env.DEV as default for VITE_DEV_MODE', async () => {
      import.meta.env.VITE_API_URL = 'http://localhost:3000';
      import.meta.env.VITE_WS_URL = 'ws://localhost:3000';
      import.meta.env.DEV = true;
      delete import.meta.env.VITE_DEV_MODE;

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { env } = await import('./env');

      expect(env.devMode).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('VITE_DEV_MODE'));

      consoleSpy.mockRestore();
    });
  });

  describe('missing required variables', () => {
    it('should throw error when VITE_API_URL is missing', async () => {
      import.meta.env.VITE_WS_URL = 'ws://localhost:3000';
      import.meta.env.VITE_DEV_MODE = 'true';
      delete import.meta.env.VITE_API_URL;

      await expect(import('./env')).rejects.toThrow(
        /Missing required environment variable: VITE_API_URL/
      );
    });

    it('should throw error when VITE_API_URL is empty string', async () => {
      import.meta.env.VITE_API_URL = '';
      import.meta.env.VITE_WS_URL = 'ws://localhost:3000';
      import.meta.env.VITE_DEV_MODE = 'true';

      await expect(import('./env')).rejects.toThrow(
        /Missing required environment variable: VITE_API_URL/
      );
    });

    it('should throw error when VITE_WS_URL is missing', async () => {
      import.meta.env.VITE_API_URL = 'http://localhost:3000';
      import.meta.env.VITE_DEV_MODE = 'true';
      delete import.meta.env.VITE_WS_URL;

      await expect(import('./env')).rejects.toThrow(
        /Missing required environment variable: VITE_WS_URL/
      );
    });

    it('should throw error when VITE_WS_URL is empty string', async () => {
      import.meta.env.VITE_API_URL = 'http://localhost:3000';
      import.meta.env.VITE_WS_URL = '';
      import.meta.env.VITE_DEV_MODE = 'true';

      await expect(import('./env')).rejects.toThrow(
        /Missing required environment variable: VITE_WS_URL/
      );
    });
  });

  describe('invalid URL formats', () => {
    it('should throw error for invalid VITE_API_URL', async () => {
      import.meta.env.VITE_API_URL = 'not-a-valid-url';
      import.meta.env.VITE_WS_URL = 'ws://localhost:3000';
      import.meta.env.VITE_DEV_MODE = 'true';

      await expect(import('./env')).rejects.toThrow(/Invalid VITE_API_URL: "not-a-valid-url"/);
    });

    it('should throw error for VITE_WS_URL without ws:// or wss:// prefix', async () => {
      import.meta.env.VITE_API_URL = 'http://localhost:3000';
      import.meta.env.VITE_WS_URL = 'http://localhost:3000';
      import.meta.env.VITE_DEV_MODE = 'true';

      await expect(import('./env')).rejects.toThrow(
        /Invalid VITE_WS_URL: "http:\/\/localhost:3000". Must start with ws:\/\/ or wss:\/\//
      );
    });

    it('should throw error for VITE_WS_URL without protocol', async () => {
      import.meta.env.VITE_API_URL = 'http://localhost:3000';
      import.meta.env.VITE_WS_URL = 'localhost:3000';
      import.meta.env.VITE_DEV_MODE = 'true';

      await expect(import('./env')).rejects.toThrow(
        /Invalid VITE_WS_URL: "localhost:3000". Must start with ws:\/\/ or wss:\/\//
      );
    });
  });

  describe('type safety', () => {
    it('should have correct TypeScript types', async () => {
      import.meta.env.VITE_API_URL = 'http://localhost:3000';
      import.meta.env.VITE_WS_URL = 'ws://localhost:3000';
      import.meta.env.VITE_DEV_MODE = 'true';

      const { env } = await import('./env');

      // Type assertions to verify TypeScript types
      const apiUrl: string = env.apiUrl;
      const wsUrl: string = env.wsUrl;
      const devMode: boolean = env.devMode;

      expect(typeof apiUrl).toBe('string');
      expect(typeof wsUrl).toBe('string');
      expect(typeof devMode).toBe('boolean');
    });
  });
});
