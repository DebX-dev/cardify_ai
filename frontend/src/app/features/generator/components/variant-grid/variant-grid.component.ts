import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RunInput } from '../../../../core/models/run.model';
import { RankedVariantItem } from '../../state/generator.store';
import { VariantCardComponent } from '../variant-card/variant-card.component';

@Component({
  selector: 'app-variant-grid',
  standalone: true,
  imports: [VariantCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  templateUrl: './variant-grid.component.html',
  styleUrl: './variant-grid.component.css',
})
export class VariantGridComponent {
  readonly items = input.required<RankedVariantItem[]>();
  readonly runInput = input.required<RunInput>();
  readonly regeneratingId = input<string | null>(null);

  readonly pickWinner = output<string>();
  readonly regenerate = output<{ variantId: string; feedback: string }>();
  readonly transformTone = output<{ variantId: string; tone: string }>();
  readonly analyzeSeo = output<string>();
}
