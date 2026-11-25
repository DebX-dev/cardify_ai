import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';

export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'cardify:theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  readonly theme = signal<ThemePreference>(this.readStoredTheme());

  constructor() {
    effect(() => {
      const pref = this.theme();
      this.persistTheme(pref);
      this.applyTheme(pref);
    });

    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      media.addEventListener('change', () => {
        if (this.theme() === 'system') {
          this.applyTheme('system');
        }
      });
    }
  }

  cycleTheme(): void {
    const order: ThemePreference[] = ['system', 'light', 'dark'];
    const next = order[(order.indexOf(this.theme()) + 1) % order.length];
    this.theme.set(next);
  }

  setTheme(pref: ThemePreference): void {
    this.theme.set(pref);
  }

  private applyTheme(pref: ThemePreference): void {
    const root = this.document.documentElement;
    const prefersDark =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;

    const useDark = pref === 'dark' || (pref === 'system' && prefersDark);
    root.classList.toggle('dark', useDark);
  }

  private readStoredTheme(): ThemePreference {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (raw === 'light' || raw === 'dark' || raw === 'system') {
        return raw;
      }
    } catch {
      // Ignore storage errors
    }
    return 'system';
  }

  private persistTheme(pref: ThemePreference): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, pref);
      }
    } catch {
      // Ignore storage errors
    }
  }
}
