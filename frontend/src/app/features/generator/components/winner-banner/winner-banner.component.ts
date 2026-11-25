import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ProductVariant, Run } from '../../../../core/models/run.model';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { TagComponent } from '../../../../shared/ui/tag/tag.component';

@Component({
  selector: 'app-winner-banner',
  standalone: true,
  imports: [ButtonComponent, TagComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  templateUrl: './winner-banner.component.html',
  styleUrl: './winner-banner.component.css',
})
export class WinnerBannerComponent {
  readonly run = input.required<Run>();
  readonly winner = input.required<ProductVariant>();
  readonly cacheSource = input<'browser-cache' | 'backend-cache' | 'live-ai' | null>(null);
  readonly analyzeSeo = output<string>();

  exportPdf(): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }
}
