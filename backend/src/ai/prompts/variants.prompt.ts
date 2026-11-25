export const VERSION = 'v1';

export interface VariantsPromptInput {
  name: string;
  category: string;
  tone: string;
  extraContext?: string;
}

export const VARIANTS_RESPONSE_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    variants: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: {
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
    },
  },
  required: ['variants'],
};

export function buildVariantsPrompt(input: VariantsPromptInput): {
  system: string;
  user: string;
} {
  const toneInstruction =
    input.tone === 'Auto'
      ? 'Choose a diverse trio of tones: Professional, Playful, and Luxury.'
      : `Anchor the first variant strongly in "${input.tone}" and make the other two distinct complementary tones (choosing from Professional, Playful, Luxury, Minimal, Technical) so all 3 variants have distinct voices.`;

  return {
    system: [
      'You are an expert e-commerce conversion copywriter and SEO strategist.',
      'Return valid JSON matching the exact schema with NO markdown fences or commentary.',
      'Constraints for every variant:',
      '- Return exactly 3 variants with distinct tones.',
      '- title: max 60 characters, punchy, benefit-led.',
      '- description: max 150 characters, vivid and conversion-focused.',
      '- tags: 3 to 6 concise lowercase kebab-case or single-word SEO keywords.',
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
