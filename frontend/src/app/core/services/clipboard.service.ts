import { Injectable, inject } from '@angular/core';
import { ProductVariant, RunInput } from '../models/run.model';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class ClipboardService {
  private readonly toast = inject(ToastService);

  async copyText(text: string, label: string): Promise<void> {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        this.toast.show(`${label} copied to clipboard`, 'success');
      } else {
        this.toast.show('Clipboard unavailable in this browser context', 'error');
      }
    } catch {
      this.toast.show(`Could not copy ${label}`, 'error');
    }
  }

  formatJson(variant: ProductVariant): string {
    return JSON.stringify(variant, null, 2);
  }

  formatShopify(variant: ProductVariant, input: RunInput): string {
    return JSON.stringify(
      {
        product: {
          title: variant.title,
          body_html: `<p>${variant.description}</p>`,
          product_type: input.category,
          tags: variant.tags.join(', '),
          status: 'draft',
          metafields_global_title_tag: variant.title,
          metafields_global_description_tag: variant.description,
        },
      },
      null,
      2,
    );
  }

  formatAmazon(variant: ProductVariant, input: RunInput): string {
    return [
      `TITLE: ${variant.title}`,
      `CATEGORY: ${input.category}`,
      `BULLET 1: ${variant.description}`,
      `BULLET 2: Crafted in a ${variant.tone} brand voice for ${input.name}.`,
      `SEARCH TERMS: ${variant.tags.join(' ')}`,
    ].join('\n');
  }

  formatMarkdown(variant: ProductVariant): string {
    return [
      `## ${variant.title}`,
      `*Tone: ${variant.tone}*`,
      '',
      variant.description,
      '',
      `**Tags:** ${variant.tags.map((t) => `\`#${t}\``).join(' ')}`,
    ].join('\n');
  }
}
