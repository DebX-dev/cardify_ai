import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ProductVariant, VariantScorecard } from '../../../core/models/run.model';

interface RadarSeries {
  variantId: string;
  label: string;
  color: string;
  fill: string;
  points: string;
}

const AXES: Array<{ key: keyof VariantScorecard['scores']; label: string }> = [
  { key: 'clarity', label: 'Clarity' },
  { key: 'persuasion', label: 'Persuasion' },
  { key: 'seo', label: 'SEO' },
  { key: 'uniqueness', label: 'Uniqueness' },
  { key: 'brandFit', label: 'Brand Fit' },
];

const PALETTE = [
  { stroke: '#6366f1', fill: 'rgba(99, 102, 241, 0.22)' },
  { stroke: '#d946ef', fill: 'rgba(217, 70, 239, 0.18)' },
  { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.18)' },
];

@Component({
  selector: 'app-radar-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  templateUrl: './radar-chart.component.html',
  styleUrl: './radar-chart.component.css',
})
export class RadarChartComponent {
  readonly variants = input.required<ProductVariant[]>();
  readonly scorecard = input.required<VariantScorecard[]>();

  private readonly cx = 160;
  private readonly cy = 140;
  private readonly maxRadius = 92;

  readonly gridRings = [0.25, 0.5, 0.75, 1].map((scale) =>
    AXES.map((_, idx) => this.polarToPoint(idx, scale * 100)).join(' '),
  );

  readonly axisLines = AXES.map((axis, idx) => {
    const [x2, y2] = this.polarCoords(idx, 100);
    const [labelX, labelY] = this.polarCoords(idx, 122);
    return { label: axis.label, x2, y2, labelX, labelY };
  });

  readonly series = computed<RadarSeries[]>(() => {
    const variants = this.variants();
    return this.scorecard().map((entry, idx) => {
      const variant = variants.find((v) => v.id === entry.variantId);
      const color = PALETTE[idx % PALETTE.length];
      const points = AXES.map((axis, axisIdx) =>
        this.polarToPoint(axisIdx, entry.scores[axis.key]),
      ).join(' ');

      return {
        variantId: entry.variantId,
        label: variant ? `${variant.tone} (${entry.total})` : entry.variantId,
        color: color.stroke,
        fill: color.fill,
        points,
      };
    });
  });

  private polarCoords(index: number, value: number): [number, number] {
    const angle = (Math.PI * 2 * index) / AXES.length - Math.PI / 2;
    const r = (Math.max(0, Math.min(125, value)) / 100) * this.maxRadius;
    return [
      Math.round((this.cx + r * Math.cos(angle)) * 10) / 10,
      Math.round((this.cy + r * Math.sin(angle)) * 10) / 10,
    ];
  }

  private polarToPoint(index: number, value: number): string {
    const [x, y] = this.polarCoords(index, value);
    return `${x},${y}`;
  }
}
