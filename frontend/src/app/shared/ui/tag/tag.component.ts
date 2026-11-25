import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-tag',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tag.component.html',
  styleUrl: './tag.component.css',
})
export class TagComponent {
  readonly tone = input<'neutral' | 'brand' | 'gold' | 'success' | 'warn'>('neutral');

  readonly classes = computed(() => {
    const base =
      'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium tracking-tight';
    const styles = {
      neutral:
        'bg-slate-100/90 text-slate-700 border border-slate-200/70 dark:bg-slate-800/80 dark:text-slate-200 dark:border-slate-700/70',
      brand:
        'bg-violet-500/10 text-violet-700 border border-violet-400/30 dark:bg-violet-500/20 dark:text-violet-200',
      gold:
        'bg-amber-400/20 text-amber-900 border border-amber-400/50 dark:bg-amber-500/20 dark:text-amber-200',
      success:
        'bg-emerald-500/15 text-emerald-800 border border-emerald-400/35 dark:bg-emerald-500/20 dark:text-emerald-200',
      warn:
        'bg-rose-500/15 text-rose-800 border border-rose-400/35 dark:bg-rose-500/20 dark:text-rose-200',
    }[this.tone()];
    return `${base} ${styles}`;
  });
}
