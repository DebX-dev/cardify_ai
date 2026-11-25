import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Lightweight in-memory LRU/TTL cache for fast repeat product-card renders.
 * Keys are normalized by caller; expired entries are evicted lazily on get,
 * and oldest entries are evicted when maxEntries is reached.
 */
@Injectable()
export class MemoryCacheService {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private hits = 0;
  private misses = 0;

  constructor(private readonly configService: ConfigService) {
    const ttlSeconds = this.configService.get<number>('cache.ttlSeconds') ?? 300;
    this.ttlMs = Math.max(0, ttlSeconds) * 1000;
    this.maxEntries = Math.max(1, this.configService.get<number>('cache.maxEntries') ?? 200);
  }

  get<T>(key: string): T | null {
    if (this.ttlMs <= 0) {
      this.misses += 1;
      return null;
    }

    const entry = this.store.get(key);
    if (!entry) {
      this.misses += 1;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses += 1;
      return null;
    }

    // Refresh recency for LRU behavior
    this.store.delete(key);
    this.store.set(key, entry);
    this.hits += 1;
    return entry.value as T;
  }

  set<T>(key: string, value: T, customTtlMs?: number): void {
    const effectiveTtl = customTtlMs ?? this.ttlMs;
    if (effectiveTtl <= 0) return;

    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + effectiveTtl,
    });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
  }

  stats(): { size: number; hits: number; misses: number; maxEntries: number; ttlMs: number } {
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      maxEntries: this.maxEntries,
      ttlMs: this.ttlMs,
    };
  }
}
