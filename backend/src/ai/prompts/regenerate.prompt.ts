import { ProductVariant } from '../ai.types';

export const VERSION = 'v1';

export interface RegeneratePromptInput {
  name: string;
  category: string;
  extraContext?: string;
  currentVariant: ProductVariant;
  feedback?: string;
  targetTone?: string;
}

export const REGENERATE_RESPONSE_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    variant: {
      type: 'object',
      properties: {
        tone: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        tags: {
          type: 'array',
          minItems: 3,
          maxItems: 6,
          items: { type: 'string' },
        },
      },
      required: ['tone', 'title', 'description', 'tags'],
    },
    score: {
      type: 'object',
      properties: {
        scores: {
          type: 'object',
          properties: {
            clarity: { type: 'integer', minimum: 0, maximum: 100 },
            persuasion: { type: 'integer', minimum: 0, maximum: 100 },
            seo: { type: 'integer', minimum: 0, maximum: 100 },
            uniqueness: { type: 'integer', minimum: 0, maximum: 100 },
            brandFit: { type: 'integer', minimum: 0, maximum: 100 },
          },
          required: ['clarity', 'persuasion', 'seo', 'uniqueness', 'brandFit'],
        },
        rationales: {
          type: 'object',
          properties: {
            clarity: { type: 'string' },
            persuasion: { type: 'string' },
            seo: { type: 'string' },
            uniqueness: { type: 'string' },
            brandFit: { type: 'string' },
          },
          required: ['clarity', 'persuasion', 'seo', 'uniqueness', 'brandFit'],
        },
      },
      required: ['scores', 'rationales'],
    },
    whyThisWon: { type: 'string' },
  },
  required: ['variant', 'score'],
};

export function buildRegeneratePrompt(input: RegeneratePromptInput): {
  system: string;
  user: string;
} {
  const modeInstruction = input.targetTone
    ? `Transform the product card into the "${input.targetTone}" tone while preserving core product truth.`
    : `Revise the product card according to user feedback: "${input.feedback ?? 'Improve conversion clarity and uniqueness'}".`;

  return {
    system: [
      'You are an expert e-commerce copywriter and editorial scorer.',
      'Rewrite the given single product card variant and evaluate it on the 5 criteria (0-100) with grounded one-line rationales.',
      'Constraints: title <= 60 chars, description <= 150 chars, 3-6 lowercase tags.',
      'Return JSON only.',
    ].join('\n'),
    user: JSON.stringify({
      product: {
        name: input.name,
        category: input.category,
        extraContext: input.extraContext ?? '',
      },
      currentVariant: input.currentVariant,
      instruction: modeInstruction,
      targetTone: input.targetTone ?? input.currentVariant.tone,
    }),
  };
}
