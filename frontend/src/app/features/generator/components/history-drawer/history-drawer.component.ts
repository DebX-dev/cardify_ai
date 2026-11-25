import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Run } from '../../../../core/models/run.model';
import { HistoryService } from '../../../../core/services/history.service';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { TagComponent } from '../../../../shared/ui/tag/tag.component';

@Component({
  selector: 'app-history-drawer',
  standalone: true,
  imports: [DatePipe, FormsModule, ButtonComponent, TagComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscape()',
  },
  templateUrl: './history-drawer.component.html',
  styleUrl: './history-drawer.component.css',
})
export class HistoryDrawerComponent {
  readonly history = inject(HistoryService);

  readonly open = input(false);
  readonly closed = output<void>();
  readonly runSelected = output<Run>();

  private readonly drawerPanel = viewChild<ElementRef<HTMLElement>>('drawerPanel');
  readonly searchQuery = signal('');

  constructor() {
    effect(() => {
      if (this.open()) {
        void this.history.refresh();
        setTimeout(() => this.drawerPanel()?.nativeElement.focus(), 0);
      }
    });
  }

  onEscape(): void {
    if (this.open()) {
      this.closed.emit();
    }
  }

  onSearch(): void {
    void this.history.refresh({ q: this.searchQuery().trim() || undefined });
  }

  selectRun(run: Run): void {
    this.runSelected.emit(run);
    this.closed.emit();
  }
}
