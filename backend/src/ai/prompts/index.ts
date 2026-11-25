export const VERSION = 'v1';

export {
  VARIANTS_RESPONSE_SCHEMA,
  buildVariantsPrompt,
  VERSION as VARIANTS_PROMPT_VERSION,
  type VariantsPromptInput,
} from './variants.prompt';
export {
  SCORECARD_RESPONSE_SCHEMA,
  buildScorecardPrompt,
  VERSION as SCORECARD_PROMPT_VERSION,
  type ScorecardPromptInput,
} from './scorecard.prompt';
export {
  REGENERATE_RESPONSE_SCHEMA,
  buildRegeneratePrompt,
  VERSION as REGENERATE_PROMPT_VERSION,
  type RegeneratePromptInput,
} from './regenerate.prompt';
export {
  SEO_RESPONSE_SCHEMA,
  buildSeoPrompt,
  VERSION as SEO_PROMPT_VERSION,
  type SeoPromptInput,
} from './seo.prompt';
export {
  COMBINED_RESPONSE_SCHEMA,
  buildCombinedPrompt,
  VERSION as COMBINED_PROMPT_VERSION,
} from './combined.prompt';
