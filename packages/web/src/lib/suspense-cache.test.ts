/**
 * SuspenseCache unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SuspenseCache } from "./suspense-cache";

describe("SuspenseCache", () => {
  let cache: SuspenseCache<string>;

  beforeEach(() => {
    cache = new SuspenseCache<string>({
      maxSize: 3,
      ttl: 1000, // 1 second for testing
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Basic Caching", () => {
    it("should cache promises and return same instance on subsequent calls", () => {
      const factory = vi.fn(() => Promise.resolve("value1"));

      const promise1 = cache.get("key1", factory);
      const promise2 = cache.get("key1", factory);

      expect(promise1).toBe(promise2);
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it("should call factory for different keys", () => {
      const factory1 = vi.fn(() => Promise.resolve("value1"));
      const factory2 = vi.fn(() => Promise.resolve("value2"));

      cache.get("key1", factory1);
      cache.get("key2", factory2);

      expect(factory1).toHaveBeenCalledTimes(1);
      expect(factory2).toHaveBeenCalledTimes(1);
    });

    it("should return correct values when promises resolve", async () => {
      const promise1 = cache.get("key1", () => Promise.resolve("value1"));
      const promise2 = cache.get("key2", () => Promise.resolve("value2"));

      expect(await promise1).toBe("value1");
      expect(await promise2).toBe("value2");
    });
  });

  describe("TTL Expiration", () => {
    it("should evict expired entries", async () => {
      const factory = vi.fn(() => Promise.resolve("value"));

      // First call
      cache.get("key1", factory);
      expect(factory).toHaveBeenCalledTimes(1);

      // Advance time past TTL
      vi.advanceTimersByTime(1001);

      // Should create new promise
      cache.get("key1", factory);
      expect(factory).toHaveBeenCalledTimes(2);
    });

    it("should not evict entries within TTL", () => {
      const factory = vi.fn(() => Promise.resolve("value"));

      cache.get("key1", factory);
      expect(factory).toHaveBeenCalledTimes(1);

      // Advance time but stay within TTL
      vi.advanceTimersByTime(500);

      // Should reuse cached promise
      cache.get("key1", factory);
      expect(factory).toHaveBeenCalledTimes(1);
    });
  });

  describe("LRU Eviction", () => {
    it("should evict entries when maxSize exceeded", () => {
      const factory = vi.fn((key: string) => Promise.resolve(`value-${key}`));

      // Fill cache to maxSize (3)
      cache.get("key1", () => factory("key1"));
      cache.get("key2", () => factory("key2"));
      cache.get("key3", () => factory("key3"));
      expect(factory).toHaveBeenCalledTimes(3);

      // Add key4 - should trigger eviction
      cache.get("key4", () => factory("key4"));
      expect(factory).toHaveBeenCalledTimes(4);

      // Cache should now have 3 entries (one was evicted)
      const stats = cache.getStats();
      expect(stats.size).toBe(3);
      expect(stats.maxSize).toBe(3);
    });

    it("should maintain maxSize constraint", () => {
      // Add many entries
      for (let i = 0; i < 10; i++) {
        cache.get(`key${i}`, () => Promise.resolve(`value${i}`));
      }

      const stats = cache.getStats();
      expect(stats.size).toBeLessThanOrEqual(3);
    });
  });

  describe("Error Handling", () => {
    it("should auto-remove rejected promises from cache", async () => {
      const factory = vi.fn(() => Promise.reject(new Error("API error")));

      const promise1 = cache.get("key1", factory);

      // Wait for rejection
      await expect(promise1).rejects.toThrow("API error");

      // Should create new promise (rejected one was removed)
      const promise2 = cache.get("key1", factory);
      expect(promise2).not.toBe(promise1);
      expect(factory).toHaveBeenCalledTimes(2);
    });

    it("should keep fulfilled promises in cache", async () => {
      const factory = vi.fn(() => Promise.resolve("success"));

      const promise1 = cache.get("key1", factory);
      await promise1; // Wait for fulfillment

      const promise2 = cache.get("key1", factory);
      expect(promise2).toBe(promise1);
      expect(factory).toHaveBeenCalledTimes(1);
    });
  });

  describe("Manual Invalidation", () => {
    it("should remove entry when invalidated", () => {
      const factory = vi.fn(() => Promise.resolve("value"));

      cache.get("key1", factory);
      expect(factory).toHaveBeenCalledTimes(1);

      cache.invalidate("key1");

      cache.get("key1", factory);
      expect(factory).toHaveBeenCalledTimes(2);
    });

    it("should not affect other entries when one is invalidated", () => {
      const factory1 = vi.fn(() => Promise.resolve("value1"));
      const factory2 = vi.fn(() => Promise.resolve("value2"));

      const promise1 = cache.get("key1", factory1);
      cache.get("key2", factory2);

      cache.invalidate("key1");

      cache.get("key1", factory1);
      const promise2Again = cache.get("key2", factory2);

      expect(factory1).toHaveBeenCalledTimes(2);
      expect(factory2).toHaveBeenCalledTimes(1);
      expect(promise2Again).toBeDefined();
    });
  });

  describe("Clear", () => {
    it("should remove all entries", () => {
      const factory = vi.fn(() => Promise.resolve("value"));

      cache.get("key1", factory);
      cache.get("key2", factory);
      cache.get("key3", factory);
      expect(factory).toHaveBeenCalledTimes(3);

      cache.clear();

      cache.get("key1", factory);
      cache.get("key2", factory);
      cache.get("key3", factory);
      expect(factory).toHaveBeenCalledTimes(6);
    });
  });

  describe("Stats", () => {
    it("should return accurate cache statistics", () => {
      cache.get("key1", () => Promise.resolve("value1"));
      cache.get("key2", () => Promise.resolve("value2"));

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(3);
      expect(stats.entries).toEqual(["key1", "key2"]);
    });
  });
});
