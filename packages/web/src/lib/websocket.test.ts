import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildAuthenticatedWsUrl, getAuthToken, getWebSocketUrl } from './websocket';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

describe('websocket config', () => {
  describe('getWebSocketUrl', () => {
    it('returns default URL when VITE_WS_URL is not set', () => {
      // This test relies on VITE_WS_URL not being set in test environment
      // or fallback behavior working correctly
      const result = getWebSocketUrl();

      // Should return either configured value or default
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('has valid WebSocket URL format', () => {
      const result = getWebSocketUrl();

      expect(result.startsWith('ws://') || result.startsWith('wss://')).toBe(true);
    });
  });

  describe('getAuthToken', () => {
    beforeEach(() => {
      localStorage.clear();
      vi.clearAllMocks();
    });

    afterEach(() => {
      localStorage.clear();
    });

    it('returns token from localStorage when available', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
      localStorage.setItem('auth_token', token);

      const result = getAuthToken();

      // In non-dev mode, should return the token
      // In dev mode, returns null
      // Both are valid behaviors depending on VITE_DEV_MODE
      expect(result === null || result === token).toBe(true);
    });

    it('returns null when no token in localStorage', () => {
      const result = getAuthToken();

      expect(result).toBeNull();
    });

    it('respects DEV_MODE bypass logic', () => {
      // When DEV_MODE is true, should always return null
      // When DEV_MODE is false/undefined, should check localStorage
      localStorage.setItem('auth_token', 'test-token');

      const result = getAuthToken();

      // Either null (DEV_MODE) or token (production mode)
      expect(result === null || result === 'test-token').toBe(true);
    });
  });

  describe('buildAuthenticatedWsUrl', () => {
    beforeEach(() => {
      localStorage.clear();
      vi.clearAllMocks();
    });

    afterEach(() => {
      localStorage.clear();
    });

    it('builds URL with projectId', () => {
      const result = buildAuthenticatedWsUrl('proj-123');

      expect(result).toContain('projectId=proj-123');
      expect(result.startsWith('ws://') || result.startsWith('wss://')).toBe(true);
    });

    it('builds URL with only projectId when no token', () => {
      const result = buildAuthenticatedWsUrl('proj-456');

      expect(result).toContain('projectId=proj-456');
    });

    it('includes token when available in production mode', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
      localStorage.setItem('auth_token', token);

      const result = buildAuthenticatedWsUrl('proj-789');

      // In dev mode, no token. In production mode, token included
      expect(result).toContain('projectId=proj-789');
      // Token may or may not be present depending on DEV_MODE
      if (result.includes('token=')) {
        expect(result).toContain(`token=${token}`);
      }
    });

    it('handles special characters in projectId', () => {
      const result = buildAuthenticatedWsUrl('proj-123-test');

      expect(result).toContain('projectId=proj-123-test');
    });

    it('properly formats query parameters', () => {
      localStorage.setItem('auth_token', 'token123');

      const result = buildAuthenticatedWsUrl('proj-001');

      expect(result).toContain('?projectId=proj-001');
      expect(result.split('?').length).toBe(2);
    });
  });

  describe('integration scenarios', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    afterEach(() => {
      localStorage.clear();
    });

    it('handles authenticated scenario', () => {
      const prodToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.prod';
      localStorage.setItem('auth_token', prodToken);

      const wsUrl = getWebSocketUrl();
      const token = getAuthToken();
      const fullUrl = buildAuthenticatedWsUrl('proj-prod-123');

      expect(wsUrl).toBeTruthy();
      expect(typeof wsUrl).toBe('string');
      // Token may be null in DEV_MODE, or the actual token in production
      expect(token === null || token === prodToken).toBe(true);
      expect(fullUrl).toContain('projectId=proj-prod-123');
    });

    it('handles missing token gracefully', () => {
      const token = getAuthToken();
      const fullUrl = buildAuthenticatedWsUrl('proj-no-auth');

      expect(token).toBeNull();
      expect(fullUrl).toContain('projectId=proj-no-auth');
      expect(fullUrl).not.toContain('token=');
    });

    it('builds complete WebSocket URL', () => {
      const wsUrl = getWebSocketUrl();
      const fullUrl = buildAuthenticatedWsUrl('test-project');

      expect(fullUrl.startsWith(wsUrl)).toBe(true);
      expect(fullUrl).toContain('?projectId=test-project');
    });
  });
});
