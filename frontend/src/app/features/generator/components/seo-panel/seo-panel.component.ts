import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { SeoAnalysis } from '../../../../core/models/run.model';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { TagComponent } from '../../../../shared/ui/tag/tag.component';

@Component({
  selector: 'app-seo-panel',
  standalone: true,
  imports: [ButtonComponent, TagComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
  templateUrl: './seo-panel.component.html',
  styleUrl: './seo-panel.component.css',
})
export class SeoPanelComponent {
  readonly analysis = input<SeoAnalysis | null>(null);
  readonly loading = input(false);
  readonly analyze = output<void>();
}
