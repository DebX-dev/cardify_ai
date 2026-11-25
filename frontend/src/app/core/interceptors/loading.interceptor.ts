import { HttpInterceptorFn } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class HttpLoadingState {
  private readonly activeCount = signal(0);
  readonly isRequestActive = () => this.activeCount() > 0;

  increment(): void {
    this.activeCount.update((n) => n + 1);
  }

  decrement(): void {
    this.activeCount.update((n) => Math.max(0, n - 1));
  }
}

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingState = inject(HttpLoadingState);
  loadingState.increment();
  return next(req).pipe(finalize(() => loadingState.decrement()));
};
