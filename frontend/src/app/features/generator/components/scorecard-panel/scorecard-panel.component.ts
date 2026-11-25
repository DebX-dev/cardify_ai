import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { VariantScorecard } from '../../../../core/models/run.model';
import { ScoreRingComponent } from '../../../../shared/ui/score-ring/score-ring.component';

const CRITERIA: Array<{
  key: keyof VariantScorecard['scores'];
  label: string;
  weight: string;
}> = [
  { key: 'clarity', label: 'Clarity', weight: '25%' },
  { key: 'persuasion', label: 'Persuasion', weight: '25%' },
  { key: 'seo', label: 'SEO Strength', weight: '20%' },
  { key: 'uniqueness', label: 'Uniqueness', weight: '15%' },
  { key: 'brandFit', label: 'Brand Fit', weight: '15%' },
];

@Component({
  selector: 'app-scorecard-panel',
  standalone: true,
  imports: [ScoreRingComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './scorecard-panel.component.html',
  styleUrl: './scorecard-panel.component.css',
})
export class ScorecardPanelComponent {
  readonly scorecard = input.required<VariantScorecard>();
  readonly criteria = CRITERIA;
}
