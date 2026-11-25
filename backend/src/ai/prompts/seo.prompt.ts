import { ProductVariant } from '../ai.types';

export const VERSION = 'v1';

export interface SeoPromptInput {
  name: string;
  category: string;
  variant: ProductVariant;
}

export const SEO_RESPONSE_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    topKeywords: {
      type: 'array',
      minItems: 5,
      maxItems: 8,
      items: {
        type: 'object',
        properties: {
          keyword: { type: 'string' },
          densityPercent: { type: 'number' },
          relevance: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['keyword', 'densityPercent', 'relevance'],
      },
    },
    missingKeywords: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: { type: 'string' },
    },
    summary: { type: 'string' },
  },
  required: ['topKeywords', 'missingKeywords', 'summary'],
};

export function buildSeoPrompt(input: SeoPromptInput): {
  system: string;
  user: string;
} {
  return {
    system: [
      'You are a technical e-commerce SEO analyst.',
      'Analyze the provided product card (title, description, tags) and return up to 8 topKeywords with estimated densityPercent (e.g. 4.2) and relevance (high|medium|low), plus exactly 3 high-intent missingKeywords to add, and a concise 1-sentence summary.',
      'Return JSON only.',
    ].join('\n'),
    user: JSON.stringify(input),
  };
}
