/**
 * Enterprise-grade Suspense-compatible cache with TTL and memory management
 *
 * Handles:
 * - Promise caching across Suspense boundaries
 * - Automatic expiration (TTL)
 * - Memory leak prevention (LRU eviction)
 * - Error state management
 */

interface CacheEntry<T> {
  promise: Promise<T>;
  timestamp: number;
  status: "pending" | "fulfilled" | "rejected";
}

interface CacheOptions {
  maxSize?: number; // Max entries before LRU eviction
  ttl?: number; // Time to live in milliseconds
  rejectionTTL?: number; // Time to cache rejections before retry (prevents infinite loops)
}

export class SuspenseCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessOrder = new Map<string, number>(); // For LRU tracking
  private accessCounter = 0;
  private readonly maxSize: number;
  private readonly ttl: number;
  private readonly rejectionTTL: number;

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize ?? 100;
    this.ttl = options.ttl ?? 5 * 60 * 1000; // 5 minutes default
    this.rejectionTTL = options.rejectionTTL ?? 10 * 1000; // 10 seconds default
  }

  /**
   * Get cached promise or create new one
   * Thread-safe for concurrent access
   */
  get(key: string, factory: () => Promise<T>): Promise<T> {
    const existing = this.cache.get(key);

    // Check if cached and still valid
    if (existing && this.isValid(existing)) {
      this.recordAccess(key);
      return existing.promise;
    }

    // Remove stale entry
    if (existing) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
    }

    // Create new promise
    const promise = factory();
    const entry: CacheEntry<T> = {
      promise,
      timestamp: Date.now(),
      status: "pending",
    };

    // Track fulfillment/rejection
    promise.then(
      () => {
        entry.status = "fulfilled";
      },
      () => {
        entry.status = "rejected";
        // Cache rejection to prevent infinite loop
        // Will be retried after rejectionTTL expires
      },
    );

    this.cache.set(key, entry);
    this.recordAccess(key);

    // Enforce size limit (LRU eviction)
    if (this.cache.size > this.maxSize) {
      this.evictLRU();
    }

    return promise;
  }

  /**
   * Manually invalidate a cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    this.accessOrder.delete(key);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;
  }

  /**
   * Get cache stats for monitoring
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      entries: Array.from(this.cache.keys()),
    };
  }

  private isValid(entry: CacheEntry<T>): boolean {
    const age = Date.now() - entry.timestamp;

    // Rejected entries expire after rejectionTTL (prevents infinite loops)
    if (entry.status === "rejected") {
      return age < this.rejectionTTL;
    }

    // Fulfilled/pending entries expire after normal TTL
    return age < this.ttl;
  }

  private recordAccess(key: string): void {
    this.accessOrder.set(key, ++this.accessCounter);
  }

  private evictLRU(): void {
    // Find least recently used entry
    let lruKey: string | null = null;
    let lruAccess = Number.POSITIVE_INFINITY;

    for (const [key, accessTime] of this.accessOrder.entries()) {
      if (accessTime < lruAccess) {
        lruAccess = accessTime;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.accessOrder.delete(lruKey);
    }
  }
}
