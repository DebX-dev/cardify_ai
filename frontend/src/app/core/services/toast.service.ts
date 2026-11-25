import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
  retryable?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private readonly _toasts = signal<ToastItem[]>([]);
  private retryHandler: (() => void) | null = null;

  readonly toasts = this._toasts.asReadonly();

  show(message: string, kind: ToastKind = 'info', options?: { onRetry?: () => void }): void {
    const id = this.nextId++;
    if (options?.onRetry) {
      this.retryHandler = options.onRetry;
    }

    this._toasts.update((list) => [
      ...list.slice(-2),
      { id, kind, message, retryable: Boolean(options?.onRetry) },
    ]);

    setTimeout(() => this.dismiss(id), kind === 'error' ? 7000 : 3500);
  }

  dismiss(id: number): void {
    this._toasts.update((list) => list.filter((t) => t.id !== id));
  }

  triggerRetry(id: number): void {
    this.dismiss(id);
    const handler = this.retryHandler;
    this.retryHandler = null;
    handler?.();
  }
}
