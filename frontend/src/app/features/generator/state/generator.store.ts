import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  GenerateRunPayload,
  ProductVariant,
  Run,
  SeoAnalysis,
  VariantScorecard,
} from '../../../core/models/run.model';
import { CacheService } from '../../../core/services/cache.service';
import { HistoryService } from '../../../core/services/history.service';
import { ProductService } from '../../../core/services/product.service';
import { ToastService } from '../../../core/services/toast.service';

export interface RankedVariantItem {
  rank: number;
  variant: ProductVariant;
  score: VariantScorecard;
  isWinner: boolean;
  isHumanPick: boolean;
}

@Injectable({ providedIn: 'root' })
export class GeneratorStore {
  private readonly productService = inject(ProductService);
  private readonly cache = inject(CacheService);
  private readonly history = inject(HistoryService);
  private readonly toast = inject(ToastService);

  private lastPayload: GenerateRunPayload | null = null;

  readonly run = signal<Run | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly activeVariantId = signal<string | null>(null);
  readonly regeneratingId = signal<string | null>(null);
  readonly seoAnalysis = signal<SeoAnalysis | null>(null);
  readonly seoLoading = signal(false);
  readonly confettiBurstKey = signal(0);
  readonly cacheSource = signal<'browser-cache' | 'backend-cache' | 'live-ai' | null>(null);

  readonly effectiveWinnerId = computed(() => {
    const current = this.run();
    if (!current) return null;
    return current.humanPickId ?? current.winnerId;
  });

  readonly sortedScorecard = computed<VariantScorecard[]>(() => {
    const current = this.run();
    if (!current) return [];
    return [...current.scorecard].sort((a, b) => b.total - a.total);
  });

  readonly rankedVariants = computed<RankedVariantItem[]>(() => {
    const current = this.run();
    if (!current) return [];
    const sorted = this.sortedScorecard();
    return sorted
      .map((score, idx) => {
        const variant = current.variants.find((v) => v.id === score.variantId);
        if (!variant) return null;
        return {
          rank: idx + 1,
          variant,
          score,
          isWinner: current.winnerId === variant.id,
          isHumanPick: current.humanPickId === variant.id,
        };
      })
      .filter((item): item is RankedVariantItem => item !== null);
  });

  readonly winnerVariant = computed(() => {
    const current = this.run();
    const id = this.effectiveWinnerId();
    if (!current || !id) return null;
    return current.variants.find((v) => v.id === id) ?? null;
  });

  async generate(payload: GenerateRunPayload): Promise<void> {
    this.lastPayload = payload;
    this.error.set(null);
    this.seoAnalysis.set(null);

    // Fast browser-local cache check for instant renders
    if (!payload.bypassCache) {
      const browserCached = this.cache.getRun(payload);
      if (browserCached) {
        this.run.set({ ...browserCached, cached: true });
        this.activeVariantId.set(browserCached.humanPickId ?? browserCached.winnerId);
        this.cacheSource.set('browser-cache');
        this.toast.show('Rendered instantly from local cache', 'info');
        return;
      }
    }

    this.loading.set(true);
    try {
      const result = await firstValueFrom(this.productService.generateRun(payload));
      this.run.set(result);
      this.activeVariantId.set(result.humanPickId ?? result.winnerId);
      this.cacheSource.set(result.cached ? 'backend-cache' : 'live-ai');
      this.cache.setRun(result);
      this.history.prependOrUpdate(result);
      this.confettiBurstKey.update((k) => k + 1);
      void this.history.refresh();
    } catch (err: unknown) {
      // Surface the backend's specific reason (e.g. "Gemini models are temporarily overloaded").
      const backendMessage = (err as { error?: { message?: string | string[] } })?.error?.message;
      this.error.set(
        (Array.isArray(backendMessage) ? backendMessage.join(', ') : backendMessage) ??
          'Could not generate product cards. Please retry.',
      );
      this.toast.show('Generation failed. Click Retry to try again.', 'error', {
        onRetry: () => {
          if (this.lastPayload) void this.generate(this.lastPayload);
        },
      });
    } finally {
      this.loading.set(false);
    }
  }

  async pickWinner(variantId: string): Promise<void> {
    const current = this.run();
    if (!current) return;
    try {
      const updated = await firstValueFrom(this.productService.pickWinner(current.id, variantId));
      this.run.set(updated);
      this.activeVariantId.set(variantId);
      this.cache.setRun(updated);
      this.history.prependOrUpdate(updated);
      this.toast.show('Updated your winning pick', 'success');
    } catch {
      // Handled by error interceptor
    }
  }

  async regenerateVariant(variantId: string, feedback: string): Promise<void> {
    const current = this.run();
    if (!current) return;
    this.regeneratingId.set(variantId);
    try {
      const updated = await firstValueFrom(
        this.productService.regenerateVariant(current.id, variantId, feedback),
      );
      this.run.set(updated);
      this.cacheSource.set('live-ai');
      this.cache.invalidateSeo(current.id, variantId);
      this.cache.setRun(updated);
      this.history.prependOrUpdate(updated);
      if (this.seoAnalysis()?.variantId === variantId) {
        this.seoAnalysis.set(null);
      }
      this.toast.show(`Regenerated ${variantId.toUpperCase()} and re-scored`, 'success');
    } finally {
      this.regeneratingId.set(null);
    }
  }

  async transformTone(variantId: string, tone: string): Promise<void> {
    const current = this.run();
    if (!current) return;
    this.regeneratingId.set(variantId);
    try {
      const updated = await firstValueFrom(
        this.productService.transformTone(current.id, variantId, tone),
      );
      this.run.set(updated);
      this.cacheSource.set('live-ai');
      this.cache.invalidateSeo(current.id, variantId);
      this.cache.setRun(updated);
      this.history.prependOrUpdate(updated);
      if (this.seoAnalysis()?.variantId === variantId) {
        this.seoAnalysis.set(null);
      }
      this.toast.show(`Transformed variant to ${tone}`, 'success');
    } finally {
      this.regeneratingId.set(null);
    }
  }

  async analyzeSeo(variantId?: string): Promise<void> {
    const current = this.run();
    if (!current) return;
    const targetId = variantId ?? this.effectiveWinnerId() ?? 'v1';

    const cachedSeo = this.cache.getSeo(current.id, targetId);
    if (cachedSeo) {
      this.seoAnalysis.set({ ...cachedSeo, cached: true });
      return;
    }

    this.seoLoading.set(true);
    try {
      const analysis = await firstValueFrom(this.productService.analyzeSeo(current.id, targetId));
      this.seoAnalysis.set(analysis);
      this.cache.setSeo(current.id, analysis);
    } finally {
      this.seoLoading.set(false);
    }
  }

  loadFromHistory(selectedRun: Run): void {
    this.run.set(selectedRun);
    this.activeVariantId.set(selectedRun.humanPickId ?? selectedRun.winnerId);
    this.seoAnalysis.set(null);
    this.cacheSource.set('browser-cache');
    this.error.set(null);
  }
}
