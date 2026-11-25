export type ProductTone =
  | 'Auto'
  | 'Professional'
  | 'Playful'
  | 'Luxury'
  | 'Minimal'
  | 'Technical';

export type Verdict = 'Strong hire' | 'Hire' | 'Borderline' | 'Needs improvement';

export interface RunInput {
  name: string;
  category: string;
  tone: ProductTone | string;
  extraContext?: string;
}

export interface GenerateRunPayload {
  name: string;
  category: string;
  tone: ProductTone;
  extraContext?: string;
  bypassCache?: boolean;
}

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

export interface Run {
  id: string;
  input: RunInput;
  variants: ProductVariant[];
  scorecard: VariantScorecard[];
  winnerId: string;
  humanPickId?: string;
  whyThisWon: string;
  aiModel: string;
  promptVersion: string;
  latencyMs: number;
  cached?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedRuns {
  items: Run[];
  total: number;
  page: number;
  limit: number;
}

export interface SeoKeywordMetric {
  keyword: string;
  densityPercent: number;
  relevance: 'high' | 'medium' | 'low';
}

export interface SeoAnalysis {
  variantId: string;
  topKeywords: SeoKeywordMetric[];
  missingKeywords: string[];
  summary: string;
  cached: boolean;
}

export interface AnalyticsSummary {
  totalRuns: number;
  avgLatencyMs: number;
  winRateByTone: Array<{ tone: string; wins: number; percentage: number }>;
  topCategories: Array<{ category: string; count: number }>;
}
