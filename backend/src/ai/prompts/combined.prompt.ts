import { VariantsPromptInput } from './variants.prompt';

export const VERSION = 'v1';

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

export const COMBINED_RESPONSE_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    variants: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
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
        required: ['id', 'tone', 'title', 'description', 'tags'],
      },
    },
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
  required: ['variants', 'scorecard', 'winnerId', 'whyThisWon'],
};

export function buildCombinedPrompt(input: VariantsPromptInput): {
  system: string;
  user: string;
} {
  const toneInstruction =
    input.tone === 'Auto'
      ? 'Use 3 distinct tones: Professional, Playful, and Luxury.'
      : `Make v1 "${input.tone}" and v2, v3 distinct complementary tones (e.g. Playful, Luxury, Minimal, Technical).`;

  return {
    system: [
      'You are an e-commerce conversion copywriter and editorial bar-raiser.',
      'In ONE JSON response, generate 3 distinct product card variants (ids v1, v2, v3) AND score all 3 on an AI Interview Scorecard.',
      'Variant rules: title <= 60 chars, description <= 150 chars, tags = 3-6 lowercase kebab-case keywords.',
      'Scorecard rules: score 0-100 on clarity, persuasion, seo, uniqueness, brandFit. Each rationale must be concise (<= 14 words) and cite real phrases from the copy. Pick winnerId and give a crisp 1-2 sentence whyThisWon.',
      'Return JSON only.',
    ].join('\n'),
    user: [
      `Product Name: ${input.name}`,
      `Category: ${input.category}`,
      `Requested Tone: ${input.tone}`,
      input.extraContext ? `Extra Context: ${input.extraContext}` : null,
      toneInstruction,
    ]
      .filter(Boolean)
      .join('\n'),
  };
}
