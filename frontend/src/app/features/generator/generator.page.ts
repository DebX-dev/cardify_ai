import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { GenerateRunPayload, ProductTone, Run } from '../../core/models/run.model';
import { HistoryService } from '../../core/services/history.service';
import { ThemeService } from '../../core/services/theme.service';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { ConfettiComponent } from '../../shared/ui/confetti/confetti.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { RadarChartComponent } from '../../shared/ui/radar-chart/radar-chart.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { HistoryDrawerComponent } from './components/history-drawer/history-drawer.component';
import { ProductFormComponent } from './components/product-form/product-form.component';
import { SeoPanelComponent } from './components/seo-panel/seo-panel.component';
import { VariantGridComponent } from './components/variant-grid/variant-grid.component';
import { WinnerBannerComponent } from './components/winner-banner/winner-banner.component';
import { GeneratorStore } from './state/generator.store';

@Component({
  selector: 'app-generator-page',
  standalone: true,
  imports: [
    ButtonComponent,
    ConfettiComponent,
    EmptyStateComponent,
    HistoryDrawerComponent,
    ProductFormComponent,
    RadarChartComponent,
    SeoPanelComponent,
    SkeletonComponent,
    VariantGridComponent,
    WinnerBannerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onGlobalKeydown($event)',
  },
  templateUrl: './generator.page.html',
  styleUrl: './generator.page.css',
})
export class GeneratorPageComponent {
  readonly store = inject(GeneratorStore);
  readonly themeService = inject(ThemeService);
  readonly historyService = inject(HistoryService);

  readonly drawerOpen = signal(false);
  readonly samplePreset = signal<{ name: string; category: string; tone: ProductTone } | null>(null);

  private readonly productForm = viewChild(ProductFormComponent);

  constructor() {
    void this.historyService.refresh();
  }

  onGenerate(payload: GenerateRunPayload): void {
    void this.store.generate(payload);
  }

  onSamplePicked(sample: { name: string; category: string; tone: 'Auto' | 'Luxury' | 'Minimal' }): void {
    this.samplePreset.set({ ...sample });
    void this.store.generate({
      name: sample.name,
      category: sample.category,
      tone: sample.tone,
    });
  }

  onHistorySelected(run: Run): void {
    this.store.loadFromHistory(run);
  }

  onGlobalKeydown(event: KeyboardEvent): void {
    if (event.key !== '/') return;
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    event.preventDefault();
    this.productForm()?.focusName();
  }
}
