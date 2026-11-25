import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { GenerateRunPayload, ProductTone } from '../../../../core/models/run.model';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';

const TONES: ProductTone[] = ['Auto', 'Professional', 'Playful', 'Luxury', 'Minimal', 'Technical'];

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.css',
})
export class ProductFormComponent {
  private readonly fb = inject(FormBuilder);

  readonly loading = input(false);
  readonly canBypassCache = input(false);
  readonly preset = input<{ name: string; category: string; tone: ProductTone } | null>(null);
  readonly submitted = output<GenerateRunPayload>();

  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');

  readonly tones = TONES;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    category: ['', [Validators.required, Validators.maxLength(60)]],
    tone: ['Auto' as ProductTone],
    extraContext: ['', [Validators.maxLength(200)]],
  });

  constructor() {
    effect(() => {
      const sample = this.preset();
      if (sample) {
        this.form.patchValue({
          name: sample.name,
          category: sample.category,
          tone: sample.tone,
        });
      }
    });
  }

  focusName(): void {
    this.nameInput()?.nativeElement.focus();
  }

  onSubmit(bypassCache = false): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.submitted.emit({
      name: raw.name.trim(),
      category: raw.category.trim(),
      tone: raw.tone,
      ...(raw.extraContext.trim() ? { extraContext: raw.extraContext.trim() } : {}),
      ...(bypassCache ? { bypassCache: true } : {}),
    });
  }
}
