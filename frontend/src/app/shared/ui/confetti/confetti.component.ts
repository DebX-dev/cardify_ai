import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  viewChild,
} from '@angular/core';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
}

const CONFETTI_COLORS = ['#6366f1', '#8b5cf6', '#d946ef', '#f59e0b', '#10b981'];

@Component({
  selector: 'app-confetti',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './confetti.component.html',
  styleUrl: './confetti.component.css',
})
export class ConfettiComponent {
  readonly burstKey = input(0);
  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  constructor() {
    effect((onCleanup) => {
      const key = this.burstKey();
      const canvas = this.canvasRef()?.nativeElement;
      if (!key || !canvas || typeof window === 'undefined') return;

      const reduced =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const originX = canvas.width / 2;
      const originY = Math.min(260, canvas.height * 0.32);

      const particles: Particle[] = Array.from({ length: 64 }, () => {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 7;
        return {
          x: originX,
          y: originY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 3,
          size: 4 + Math.random() * 5,
          color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
          alpha: 1,
        };
      });

      const started = performance.now();
      const durationMs = 1200;
      let frameId = 0;

      const render = (now: number) => {
        const elapsed = now - started;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (const p of particles) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.22;
          p.alpha = Math.max(0, 1 - elapsed / durationMs);

          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x, p.y, p.size, p.size * 0.65);
        }

        if (elapsed < durationMs) {
          frameId = requestAnimationFrame(render);
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      };

      frameId = requestAnimationFrame(render);
      onCleanup(() => {
        cancelAnimationFrame(frameId);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      });
    });
  }
}
