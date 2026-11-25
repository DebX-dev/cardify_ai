import { ProductVariant } from '../ai.types';

export const VERSION = 'v1';

export interface ScorecardPromptInput {
  name: string;
  category: string;
  tone: string;
  extraContext?: string;
  variants: ProductVariant[];
}

const SCORE_FIELDS = {
  type: 'object',
  properties: {
    clarity: { type: 'integer', minimum: 0, maximum: 100 },
    persuasion: { type: 'integer', minimum: 0, maximum: 100 },
    seo: { type: 'integer', minimum: 0, maximum: 100 },
    uniqueness: { type: 'integer', minimum: 0, maximum: 100 },
    brandFit: { type: 'integer', minimum: 0, maximum: 100 },
  },
  required: ['clarity', 'persuasion', 'seo', 'uniqueness', 'brandFit'],
};

const RATIONALE_FIELDS = {
  type: 'object',
  properties: {
    clarity: { type: 'string' },
    persuasion: { type: 'string' },
    seo: { type: 'string' },
    uniqueness: { type: 'string' },
    brandFit: { type: 'string' },
  },
  required: ['clarity', 'persuasion', 'seo', 'uniqueness', 'brandFit'],
};

export const SCORECARD_RESPONSE_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    scorecard: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: {
        type: 'object',
        properties: {
          variantId: { type: 'string' },
          scores: SCORE_FIELDS,
          rationales: RATIONALE_FIELDS,
        },
        required: ['variantId', 'scores', 'rationales'],
      },
    },
    winnerId: { type: 'string' },
    whyThisWon: { type: 'string' },
  },
  required: ['scorecard', 'winnerId', 'whyThisWon'],
};

export function buildScorecardPrompt(input: ScorecardPromptInput): {
  system: string;
  user: string;
} {
  return {
    system: [
      'You are an editorial bar-raiser conducting an "AI Interview Scorecard" for 3 product card variants.',
      'Score each variant strictly from 0 to 100 across: clarity, persuasion, seo, uniqueness, brandFit.',
      'Every rationale MUST be a crisp one-line critique grounded in the actual title, description, and tags (quote or reference real phrases). Never give generic praise.',
      'Differentiate the 3 variants meaningfully so there is a clear ranking.',
      'Set winnerId to the best variantId (v1, v2, or v3) and write a 2-sentence whyThisWon explanation.',
      'Return JSON only.',
    ].join('\n'),
    user: JSON.stringify({
      product: {
        name: input.name,
        category: input.category,
        requestedTone: input.tone,
        extraContext: input.extraContext ?? '',
      },
      variants: input.variants,
    }),
  };
}
