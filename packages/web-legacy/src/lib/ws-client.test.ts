/**
 * WebSocket Client Integration Tests
 *
 * Note: Full end-to-end WebSocket tests with reconnection behavior
 * require a real WebSocket server. These tests cover the basic client
 * functionality and event handling that can be reliably tested with mocks.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { WebSocketClient } from "./ws-client";

describe("WebSocketClient", () => {
  let wsClient: WebSocketClient;
  let mockGetToken: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockGetToken = vi.fn().mockResolvedValue("test-token");
    wsClient = new WebSocketClient("ws://localhost:3101/ws", mockGetToken);
  });

  describe("instantiation", () => {
    it("should create WebSocket client with URL and token getter", () => {
      expect(wsClient).toBeDefined();
      expect(wsClient).toBeInstanceOf(WebSocketClient);
    });
  });

  describe("event listener registration", () => {
    it("should allow registering event listeners", () => {
      const handler = vi.fn();
      const unsubscribe = wsClient.on("project:updated", handler);

      expect(typeof unsubscribe).toBe("function");
    });

    it("should allow registering multiple listeners for same event", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      const unsubscribe1 = wsClient.on("project:updated", handler1);
      const unsubscribe2 = wsClient.on("project:updated", handler2);

      expect(typeof unsubscribe1).toBe("function");
      expect(typeof unsubscribe2).toBe("function");
    });

    it("should return unsubscribe function", () => {
      const handler = vi.fn();
      const unsubscribe = wsClient.on("project:updated", handler);

      // Should not throw
      expect(() => unsubscribe()).not.toThrow();
    });

    it("should support connection state change listeners", () => {
      const handler = vi.fn();
      const unsubscribe = wsClient.on("_connectionStateChanged", handler);

      expect(typeof unsubscribe).toBe("function");
    });
  });

  describe("lifecycle management", () => {
    it("should have destroy method", () => {
      expect(typeof wsClient.destroy).toBe("function");
    });

    it("should not throw when destroy is called", () => {
      expect(() => wsClient.destroy()).not.toThrow();
    });

    it("should have connect method", () => {
      expect(typeof wsClient.connect).toBe("function");
    });
  });

  describe("type safety", () => {
    it("should accept typed event types", () => {
      // These should compile without errors (TypeScript test)
      wsClient.on("project:updated", (_payload) => {});
      wsClient.on("project:pipelineStatusChanged", (_payload) => {});
      wsClient.on("task:statusChanged", (_payload) => {});
      wsClient.on("assignment:created", (_payload) => {});
      wsClient.on("assignment:updated", (_payload) => {});
    });
  });
});
