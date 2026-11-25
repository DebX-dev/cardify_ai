import { Injectable } from '@angular/core';
import { GenerateRunPayload, Run, SeoAnalysis } from '../models/run.model';

interface LocalCacheEntry<T> {
  value: T;
  expiresAt: number;
}

const RUN_CACHE_PREFIX = 'cardify:run:';
const HISTORY_CACHE_KEY = 'cardify:history:v1';
const SEO_CACHE_PREFIX = 'cardify:seo:';
const DEFAULT_TTL_MS = 1000 * 60 * 30; // 30 minutes local browser cache

/**
 * Browser-side localStorage + in-memory cache so repeated product inputs,
 * recent history, and SEO analyses render instantaneously without waiting on network/AI.
 */
@Injectable({ providedIn: 'root' })
export class CacheService {
  private readonly memory = new Map<string, LocalCacheEntry<unknown>>();

  buildRunKey(payload: Pick<GenerateRunPayload, 'name' | 'category' | 'tone' | 'extraContext'>): string {
    return (
      RUN_CACHE_PREFIX +
      [
        payload.name.trim().toLowerCase(),
        payload.category.trim().toLowerCase(),
        (payload.tone || 'Auto').trim().toLowerCase(),
        (payload.extraContext ?? '').trim().toLowerCase(),
      ].join('::')
    );
  }

  getRun(payload: Pick<GenerateRunPayload, 'name' | 'category' | 'tone' | 'extraContext'>): Run | null {
    return this.get<Run>(this.buildRunKey(payload));
  }

  setRun(run: Run): void {
    const key = this.buildRunKey({
      name: run.input.name,
      category: run.input.category,
      tone: (run.input.tone as GenerateRunPayload['tone']) ?? 'Auto',
      extraContext: run.input.extraContext,
    });
    this.set(key, { ...run, cached: false });
  }

  getHistory(): Run[] {
    return this.get<Run[]>(HISTORY_CACHE_KEY) ?? [];
  }

  setHistory(runs: Run[]): void {
    this.set(HISTORY_CACHE_KEY, runs.slice(0, 20));
  }

  getSeo(runId: string, variantId: string): SeoAnalysis | null {
    return this.get<SeoAnalysis>(`${SEO_CACHE_PREFIX}${runId}:${variantId}`);
  }

  setSeo(runId: string, analysis: SeoAnalysis): void {
    this.set(`${SEO_CACHE_PREFIX}${runId}:${analysis.variantId}`, analysis);
  }

  invalidateSeo(runId: string, variantId: string): void {
    const key = `${SEO_CACHE_PREFIX}${runId}:${variantId}`;
    this.memory.delete(key);
    this.safeRemoveStorage(key);
  }

  private get<T>(key: string): T | null {
    const now = Date.now();
    const mem = this.memory.get(key);
    if (mem) {
      if (mem.expiresAt > now) {
        return mem.value as T;
      }
      this.memory.delete(key);
    }

    const raw = this.safeReadStorage(key);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as LocalCacheEntry<T>;
      if (parsed.expiresAt > now) {
        this.memory.set(key, parsed);
        return parsed.value;
      }
      this.safeRemoveStorage(key);
      return null;
    } catch {
      this.safeRemoveStorage(key);
      return null;
    }
  }

  private set<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS): void {
    const entry: LocalCacheEntry<T> = {
      value,
      expiresAt: Date.now() + ttlMs,
    };
    this.memory.set(key, entry);
    this.safeWriteStorage(key, JSON.stringify(entry));
  }

  private safeReadStorage(key: string): string | null {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  }

  private safeWriteStorage(key: string, value: string): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch {
      // Ignore quota exceeded errors gracefully
    }
  }

  private safeRemoveStorage(key: string): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch {
      // Ignore storage access errors
    }
  }
}
