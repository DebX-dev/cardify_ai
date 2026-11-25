import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';

@Component({
  selector: 'app-score-ring',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './score-ring.component.html',
  styleUrl: './score-ring.component.css',
})
export class ScoreRingComponent {
  readonly value = input.required<number>();
  readonly label = input('Score');
  readonly size = input(52);
  readonly strokeWidth = input(5);

  readonly displayValue = signal(0);

  readonly center = computed(() => this.size() / 2);
  readonly radius = computed(() => (this.size() - this.strokeWidth()) / 2);
  readonly circumference = computed(() => 2 * Math.PI * this.radius());

  readonly dashOffset = computed(() => {
    const pct = Math.max(0, Math.min(100, this.displayValue())) / 100;
    return this.circumference() * (1 - pct);
  });

  readonly strokeColor = computed(() => {
    const v = this.value();
    if (v >= 85) return '#10b981';
    if (v >= 70) return '#8b5cf6';
    if (v >= 55) return '#f59e0b';
    return '#f43f5e';
  });

  constructor() {
    effect((onCleanup) => {
      const target = Math.round(this.value());
      const reducedMotion =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (reducedMotion || typeof requestAnimationFrame === 'undefined') {
        this.displayValue.set(target);
        return;
      }

      let frameId = 0;
      const duration = 350;
      const start = performance.now();

      const step = (now: number) => {
        const progress = Math.min(1, (now - start) / duration);
        this.displayValue.set(Math.round(target * progress));
        if (progress < 1) {
          frameId = requestAnimationFrame(step);
        }
      };

      frameId = requestAnimationFrame(step);
      onCleanup(() => cancelAnimationFrame(frameId));
    });
  }
}
