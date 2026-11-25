import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProductTone, ProductVariant, RunInput, VariantScorecard } from '../../../../core/models/run.model';
import { ClipboardService } from '../../../../core/services/clipboard.service';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { ScoreRingComponent } from '../../../../shared/ui/score-ring/score-ring.component';
import { TagComponent } from '../../../../shared/ui/tag/tag.component';
import { ScorecardPanelComponent } from '../scorecard-panel/scorecard-panel.component';

const TRANSFORM_TONES: Exclude<ProductTone, 'Auto'>[] = [
  'Professional',
  'Playful',
  'Luxury',
  'Minimal',
  'Technical',
];

@Component({
  selector: 'app-variant-card',
  standalone: true,
  imports: [
    FormsModule,
    CardComponent,
    TagComponent,
    ButtonComponent,
    ScoreRingComponent,
    ScorecardPanelComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
  templateUrl: './variant-card.component.html',
  styleUrl: './variant-card.component.css',
})
export class VariantCardComponent {
  private readonly clipboard = inject(ClipboardService);

  readonly rank = input.required<number>();
  readonly variant = input.required<ProductVariant>();
  readonly scorecard = input.required<VariantScorecard>();
  readonly runInput = input.required<RunInput>();
  readonly isWinner = input(false);
  readonly isHumanPick = input(false);
  readonly busy = input(false);

  readonly pickWinner = output<string>();
  readonly regenerate = output<{ variantId: string; feedback: string }>();
  readonly transformTone = output<{ variantId: string; tone: string }>();
  readonly analyzeSeo = output<string>();

  readonly showFeedback = signal(false);
  feedbackText = '';
  readonly transformTones = TRANSFORM_TONES;

  readonly verdictTone = computed<'success' | 'brand' | 'gold' | 'warn'>(() => {
    const verdict = this.scorecard().verdict;
    if (verdict === 'Strong hire') return 'success';
    if (verdict === 'Hire') return 'brand';
    if (verdict === 'Borderline') return 'gold';
    return 'warn';
  });

  copy(format: 'json' | 'shopify' | 'amazon' | 'markdown'): void {
    const v = this.variant();
    const inputData = this.runInput();
    if (format === 'json') {
      void this.clipboard.copyText(this.clipboard.formatJson(v), 'JSON');
    } else if (format === 'shopify') {
      void this.clipboard.copyText(this.clipboard.formatShopify(v, inputData), 'Shopify JSON');
    } else if (format === 'amazon') {
      void this.clipboard.copyText(this.clipboard.formatAmazon(v, inputData), 'Amazon Bullets');
    } else {
      void this.clipboard.copyText(this.clipboard.formatMarkdown(v), 'Markdown');
    }
  }

  submitFeedback(): void {
    const trimmed = this.feedbackText.trim();
    if (!trimmed) return;
    this.regenerate.emit({ variantId: this.variant().id, feedback: trimmed });
    this.showFeedback.set(false);
    this.feedbackText = '';
  }

  onToneSelect(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const tone = select.value;
    if (!tone) return;
    this.transformTone.emit({ variantId: this.variant().id, tone });
    select.value = '';
  }
}
