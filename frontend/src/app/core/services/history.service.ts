import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AnalyticsSummary, Run } from '../models/run.model';
import { CacheService } from './cache.service';
import { ProductService } from './product.service';

@Injectable({ providedIn: 'root' })
export class HistoryService {
  private readonly productService = inject(ProductService);
  private readonly cache = inject(CacheService);

  private readonly _runs = signal<Run[]>(this.cache.getHistory());
  private readonly _analytics = signal<AnalyticsSummary | null>(null);
  private readonly _loading = signal(false);

  readonly runs = this._runs.asReadonly();
  readonly analytics = this._analytics.asReadonly();
  readonly loading = this._loading.asReadonly();

  async refresh(params?: { q?: string; tone?: string }): Promise<void> {
    this._loading.set(true);
    try {
      const [runsRes, analyticsRes] = await Promise.all([
        firstValueFrom(this.productService.getRuns({ page: 1, limit: 20, ...params })),
        firstValueFrom(this.productService.getAnalyticsSummary()),
      ]);
      this._runs.set(runsRes.items);
      this._analytics.set(analyticsRes);
      if (!params?.q && !params?.tone) {
        this.cache.setHistory(runsRes.items);
      }
    } catch {
      // Keep locally cached history if backend is offline
    } finally {
      this._loading.set(false);
    }
  }

  prependOrUpdate(run: Run): void {
    this._runs.update((list) => {
      const filtered = list.filter((item) => item.id !== run.id);
      const next = [run, ...filtered].slice(0, 20);
      this.cache.setHistory(next);
      return next;
    });
  }
}
