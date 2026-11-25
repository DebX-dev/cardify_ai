import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AI_PROVIDER, AiProvider } from '../../ai/ai-provider.interface';
import {
  GeneratedScorecardPayload,
  GeneratedVariantsPayload,
  ProductVariant,
  RegeneratedVariantPayload,
  ScoreBreakdown,
  SeoAnalysisPayload,
  VariantScorecard,
  Verdict,
} from '../../ai/ai.types';
import {
  buildCombinedPrompt,
  buildRegeneratePrompt,
  buildSeoPrompt,
  COMBINED_RESPONSE_SCHEMA,
  REGENERATE_RESPONSE_SCHEMA,
  SEO_RESPONSE_SCHEMA,
  VERSION as PROMPT_VERSION,
} from '../../ai/prompts';
import { MemoryCacheService } from '../../common/cache/memory-cache.service';
import { GenerateRunDto } from './dto/generate.dto';
import { QueryRunsDto } from './dto/query-runs.dto';
import { RegenerateVariantDto, TransformToneDto } from './dto/regenerate.dto';
import { RunResponseDto } from './dto/run-response.dto';
import { SeoAnalysisResponseDto } from './dto/scorecard.dto';
import { PaginatedRunsResult, ProductRepository } from './product.repository';

interface CombinedGenerationPayload {
  variants: GeneratedVariantsPayload['variants'];
  scorecard: GeneratedScorecardPayload['scorecard'];
  winnerId: string;
  whyThisWon: string;
}

/**
 * MVC Service: orchestrates L1 in-memory cache, L2 MongoDB cache, single-pass
 * AI generation + scorecard computation, persistence, and post-generation actions.
 */
@Injectable()
export class ProductService {
  private readonly maxTokensCombined: number;
  private readonly maxTokensVariants: number;
  private readonly temperature: number;
  private readonly temperatureScorecard: number;
  private readonly promptVersion: string;

  constructor(
    @Inject(AI_PROVIDER) private readonly aiProvider: AiProvider,
    private readonly productRepository: ProductRepository,
    private readonly cache: MemoryCacheService,
    private readonly configService: ConfigService,
  ) {
    this.maxTokensVariants = this.configService.get<number>('gemini.maxTokensVariants') ?? 900;
    const maxTokensScorecard =
      this.configService.get<number>('gemini.maxTokensScorecard') ?? 1200;
    this.maxTokensCombined = Math.max(this.maxTokensVariants + maxTokensScorecard, 2000);
    this.temperature = this.configService.get<number>('gemini.temperature') ?? 0.7;
    this.temperatureScorecard =
      this.configService.get<number>('gemini.temperatureScorecard') ?? 0.3;
    this.promptVersion = this.configService.get<string>('gemini.promptVersion') ?? PROMPT_VERSION;
  }

  async generate(dto: GenerateRunDto, requestId?: string): Promise<RunResponseDto> {
    const cacheKey = this.buildGenerateCacheKey(dto);
    if (!dto.bypassCache) {
      const l1Cached = this.cache.get<RunResponseDto>(cacheKey);
      if (l1Cached) {
        return { ...l1Cached, cached: true };
      }

      const l2DbCached = await this.productRepository.findLatestByInput({
        name: dto.name,
        category: dto.category,
        tone: dto.tone,
        extraContext: dto.extraContext,
      });
      if (l2DbCached) {
        this.cache.set(cacheKey, l2DbCached);
        return { ...l2DbCached, cached: true };
      }
    }

    const startedAt = Date.now();
    const combinedPrompt = buildCombinedPrompt({
      name: dto.name,
      category: dto.category,
      tone: dto.tone,
      extraContext: dto.extraContext,
    });

    const aiResult = await this.aiProvider.complete<CombinedGenerationPayload>({
      system: combinedPrompt.system,
      user: combinedPrompt.user,
      schema: COMBINED_RESPONSE_SCHEMA,
      maxTokens: this.maxTokensCombined,
      temperature: this.temperature,
      requestId,
      promptVersion: this.promptVersion,
    });

    const normalizedVariants: ProductVariant[] = (aiResult.data.variants ?? [])
      .slice(0, 3)
      .map((item, idx) => this.normalizeVariant(`v${idx + 1}`, item));

    const scorecard = this.buildNormalizedScorecard(
      normalizedVariants,
      aiResult.data.scorecard ?? [],
    );
    const winnerId = this.resolveWinnerId(scorecard, aiResult.data.winnerId);
    const latencyMs = Math.max(1, Date.now() - startedAt);

    const saved = await this.productRepository.create({
      input: {
        name: dto.name,
        category: dto.category,
        tone: dto.tone,
        ...(dto.extraContext ? { extraContext: dto.extraContext } : {}),
      },
      variants: normalizedVariants,
      scorecard,
      winnerId,
      whyThisWon: (aiResult.data.whyThisWon ?? 'Highest overall weighted scorecard total.').trim(),
      aiModel: aiResult.model,
      promptVersion: this.promptVersion,
      latencyMs,
    });

    this.cache.set(cacheKey, saved);
    return { ...saved, cached: false };
  }

  async findAll(query: QueryRunsDto): Promise<PaginatedRunsResult> {
    return this.productRepository.findPaginated({
      page: query.page,
      limit: query.limit,
      q: query.q,
      tone: query.tone,
    });
  }

  async findOne(id: string): Promise<RunResponseDto> {
    const run = await this.productRepository.findById(id);
    if (!run) {
      throw new NotFoundException(`Run "${id}" was not found.`);
    }
    return run;
  }

  async pickWinner(id: string, variantId: string): Promise<RunResponseDto> {
    const existing = await this.findOne(id);
    if (!existing.variants.some((v) => v.id === variantId)) {
      throw new BadRequestException(`Variant "${variantId}" does not exist in run "${id}".`);
    }

    const updated = await this.productRepository.updatePick(id, variantId);
    if (!updated) {
      throw new NotFoundException(`Run "${id}" was not found.`);
    }

    this.cache.set(this.buildGenerateCacheKey(updated.input), updated);
    return updated;
  }

  async regenerateVariant(
    id: string,
    variantId: string,
    dto: RegenerateVariantDto,
    requestId?: string,
  ): Promise<RunResponseDto> {
    return this.rewriteSingleVariant(id, variantId, { feedback: dto.feedback }, requestId);
  }

  async transformTone(
    id: string,
    dto: TransformToneDto,
    requestId?: string,
  ): Promise<RunResponseDto> {
    return this.rewriteSingleVariant(id, dto.variantId, { targetTone: dto.tone }, requestId);
  }

  async analyzeSeo(
    id: string,
    variantId: string,
    requestId?: string,
  ): Promise<SeoAnalysisResponseDto> {
    const run = await this.findOne(id);
    const variant = run.variants.find((v) => v.id === variantId);
    if (!variant) {
      throw new BadRequestException(`Variant "${variantId}" does not exist in run "${id}".`);
    }

    const seoCacheKey = `seo:${id}:${variantId}:${variant.title}:${variant.description}`;
    const cachedSeo = this.cache.get<SeoAnalysisResponseDto>(seoCacheKey);
    if (cachedSeo) {
      return { ...cachedSeo, cached: true };
    }

    const prompt = buildSeoPrompt({
      name: run.input.name,
      category: run.input.category,
      variant,
    });

    const result = await this.aiProvider.complete<SeoAnalysisPayload>({
      system: prompt.system,
      user: prompt.user,
      schema: SEO_RESPONSE_SCHEMA,
      maxTokens: this.maxTokensVariants,
      temperature: this.temperatureScorecard,
      requestId,
      promptVersion: this.promptVersion,
    });

    const response: SeoAnalysisResponseDto = {
      variantId,
      topKeywords: result.data.topKeywords.slice(0, 8),
      missingKeywords: result.data.missingKeywords.slice(0, 3),
      summary: result.data.summary.trim(),
      cached: false,
    };

    this.cache.set(seoCacheKey, response);
    return response;
  }

  private async rewriteSingleVariant(
    id: string,
    variantId: string,
    options: { feedback?: string; targetTone?: string },
    requestId?: string,
  ): Promise<RunResponseDto> {
    const run = await this.findOne(id);
    const targetVariant = run.variants.find((v) => v.id === variantId);
    if (!targetVariant) {
      throw new BadRequestException(`Variant "${variantId}" does not exist in run "${id}".`);
    }

    const startedAt = Date.now();
    const prompt = buildRegeneratePrompt({
      name: run.input.name,
      category: run.input.category,
      extraContext: run.input.extraContext,
      currentVariant: targetVariant,
      feedback: options.feedback,
      targetTone: options.targetTone,
    });

    const aiResult = await this.aiProvider.complete<RegeneratedVariantPayload>({
      system: prompt.system,
      user: prompt.user,
      schema: REGENERATE_RESPONSE_SCHEMA,
      maxTokens: this.maxTokensVariants,
      temperature: this.temperature,
      requestId,
      promptVersion: this.promptVersion,
    });

    const updatedVariant = this.normalizeVariant(variantId, {
      ...aiResult.data.variant,
      tone: options.targetTone ?? aiResult.data.variant.tone,
    });

    const updatedVariants = run.variants.map((v) => (v.id === variantId ? updatedVariant : v));
    const clampedScores = this.clampScores(aiResult.data.score.scores);
    const total = this.computeWeightedTotal(clampedScores);
    const updatedScorecardEntry: VariantScorecard = {
      variantId,
      scores: clampedScores,
      rationales: aiResult.data.score.rationales,
      total,
      verdict: this.computeVerdict(total),
    };

    const updatedScorecard = run.scorecard.map((s) =>
      s.variantId === variantId ? updatedScorecardEntry : s,
    );
    const winnerId = this.resolveWinnerId(updatedScorecard, run.winnerId);
    const whyThisWon =
      aiResult.data.whyThisWon?.trim() ||
      (winnerId === variantId
        ? `${updatedVariant.tone} variant took the lead with a weighted score of ${total}.`
        : run.whyThisWon);

    const updated = await this.productRepository.updateVariantAndScorecard({
      id,
      variants: updatedVariants,
      scorecard: updatedScorecard,
      winnerId,
      whyThisWon,
      aiModel: aiResult.model,
      latencyMs: Math.max(1, Date.now() - startedAt),
    });

    if (!updated) {
      throw new NotFoundException(`Run "${id}" was not found.`);
    }

    this.cache.invalidatePrefix(`seo:${id}:${variantId}:`);
    this.cache.set(this.buildGenerateCacheKey(updated.input), updated);
    return { ...updated, cached: false };
  }

  /**
   * Weighted total formula:
   * 0.25*clarity + 0.25*persuasion + 0.20*seo + 0.15*uniqueness + 0.15*brandFit
   */
  computeWeightedTotal(scores: ScoreBreakdown): number {
    const raw =
      0.25 * scores.clarity +
      0.25 * scores.persuasion +
      0.2 * scores.seo +
      0.15 * scores.uniqueness +
      0.15 * scores.brandFit;
    return Math.round(raw * 10) / 10;
  }

  computeVerdict(total: number): Verdict {
    if (total >= 85) return 'Strong hire';
    if (total >= 70) return 'Hire';
    if (total >= 55) return 'Borderline';
    return 'Needs improvement';
  }

  private buildNormalizedScorecard(
    variants: ProductVariant[],
    rawEntries: GeneratedScorecardPayload['scorecard'],
  ): VariantScorecard[] {
    return variants.map((variant, idx) => {
      const matched =
        rawEntries.find((entry) => entry.variantId === variant.id) ?? rawEntries[idx];
      const scores = this.clampScores(
        matched?.scores ?? {
          clarity: 75,
          persuasion: 75,
          seo: 75,
          uniqueness: 70,
          brandFit: 75,
        },
      );
      const total = this.computeWeightedTotal(scores);
      return {
        variantId: variant.id,
        scores,
        rationales: matched?.rationales ?? {
          clarity: 'Clear headline and product focus.',
          persuasion: 'Communicates primary customer benefit.',
          seo: 'Includes relevant category keywords.',
          uniqueness: 'Distinct tone compared to siblings.',
          brandFit: `Aligned with ${variant.tone} voice.`,
        },
        total,
        verdict: this.computeVerdict(total),
      };
    });
  }

  private resolveWinnerId(scorecard: VariantScorecard[], preferredId?: string): string {
    const sorted = [...scorecard].sort((a, b) => b.total - a.total);
    if (sorted.length === 0) return 'v1';
    const topScore = sorted[0].total;
    const tiedTop = sorted.filter((entry) => entry.total === topScore);
    if (preferredId && tiedTop.some((entry) => entry.variantId === preferredId)) {
      return preferredId;
    }
    return sorted[0].variantId;
  }

  private normalizeVariant(
    id: string,
    raw: { tone: string; title: string; description: string; tags: string[] },
  ): ProductVariant {
    const cleanTags = (raw.tags ?? [])
      .map((tag) => tag.trim().toLowerCase().replace(/\s+/g, '-'))
      .filter(Boolean)
      .slice(0, 6);

    return {
      id,
      tone: (raw.tone || 'Professional').trim(),
      title: (raw.title || 'Untitled Product').trim().slice(0, 80),
      description: (raw.description || '').trim().slice(0, 180),
      tags: cleanTags.length >= 3 ? cleanTags : [...cleanTags, 'product', 'featured'].slice(0, 3),
    };
  }

  private clampScores(scores: ScoreBreakdown): ScoreBreakdown {
    const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
    return {
      clarity: clamp(scores.clarity),
      persuasion: clamp(scores.persuasion),
      seo: clamp(scores.seo),
      uniqueness: clamp(scores.uniqueness),
      brandFit: clamp(scores.brandFit),
    };
  }

  private buildGenerateCacheKey(input: {
    name: string;
    category: string;
    tone?: string;
    extraContext?: string;
  }): string {
    return [
      'run',
      input.name.trim().toLowerCase(),
      input.category.trim().toLowerCase(),
      (input.tone ?? 'Auto').trim().toLowerCase(),
      (input.extraContext ?? '').trim().toLowerCase(),
    ].join('::');
  }
}
