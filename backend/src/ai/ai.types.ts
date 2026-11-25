export type ProductTone =
  | 'Auto'
  | 'Professional'
  | 'Playful'
  | 'Luxury'
  | 'Minimal'
  | 'Technical';

export type Verdict = 'Strong hire' | 'Hire' | 'Borderline' | 'Needs improvement';

export interface ProductVariant {
  id: string;
  tone: string;
  title: string;
  description: string;
  tags: string[];
}

export interface ScoreBreakdown {
  clarity: number;
  persuasion: number;
  seo: number;
  uniqueness: number;
  brandFit: number;
}

export interface ScoreRationales {
  clarity: string;
  persuasion: string;
  seo: string;
  uniqueness: string;
  brandFit: string;
}

export interface VariantScorecard {
  variantId: string;
  scores: ScoreBreakdown;
  rationales: ScoreRationales;
  total: number;
  verdict: Verdict;
}

export interface GeneratedVariantsPayload {
  variants: Array<{
    tone: string;
    title: string;
    description: string;
    tags: string[];
  }>;
}

export interface GeneratedScorecardPayload {
  scorecard: Array<{
    variantId: string;
    scores: ScoreBreakdown;
    rationales: ScoreRationales;
  }>;
  winnerId: string;
  whyThisWon: string;
}

export interface RegeneratedVariantPayload {
  variant: {
    tone: string;
    title: string;
    description: string;
    tags: string[];
  };
  score: {
    scores: ScoreBreakdown;
    rationales: ScoreRationales;
  };
  whyThisWon?: string;
}

export interface SeoKeywordMetric {
  keyword: string;
  densityPercent: number;
  relevance: 'high' | 'medium' | 'low';
}

export interface SeoAnalysisPayload {
  topKeywords: SeoKeywordMetric[];
  missingKeywords: string[];
  summary: string;
}
