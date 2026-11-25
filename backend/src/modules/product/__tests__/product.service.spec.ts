import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider } from '../../../ai/ai-provider.interface';
import { MemoryCacheService } from '../../../common/cache/memory-cache.service';
import { RunResponseDto } from '../dto/run-response.dto';
import { ProductRepository } from '../product.repository';
import { ProductService } from '../product.service';

describe('ProductService', () => {
  let service: ProductService;
  let aiProvider: jest.Mocked<AiProvider>;
  let repository: jest.Mocked<ProductRepository>;
  let cache: MemoryCacheService;

  const mockSavedRun: RunResponseDto = {
    id: '673a9b5f12c34d567890abcd',
    input: { name: 'Wireless Mouse', category: 'Electronics', tone: 'Professional' },
    variants: [
      {
        id: 'v1',
        tone: 'Professional',
        title: 'Ergonomic Wireless Mouse',
        description: 'Quiet clicks and all-day comfort for remote teams.',
        tags: ['ergonomic', 'wireless', 'silent-click'],
      },
      {
        id: 'v2',
        tone: 'Playful',
        title: 'Click Happy Wireless Mouse',
        description: 'Breeze through tabs with featherlight glide.',
        tags: ['wireless', 'colorful', 'desktop'],
      },
      {
        id: 'v3',
        tone: 'Luxury',
        title: 'Atelier Precision Wireless Mouse',
        description: 'Sculpted anodized aluminum meets whisper-quiet switches.',
        tags: ['luxury', 'precision', 'minimal'],
      },
    ],
    scorecard: [
      {
        variantId: 'v1',
        scores: { clarity: 92, persuasion: 88, seo: 85, uniqueness: 78, brandFit: 90 },
        rationales: {
          clarity: 'Clear headline',
          persuasion: 'Strong remote benefit',
          seo: 'Includes wireless',
          uniqueness: 'Solid positioning',
          brandFit: 'Matches Professional',
        },
        total: 87.2,
        verdict: 'Strong hire',
      },
      {
        variantId: 'v2',
        scores: { clarity: 80, persuasion: 75, seo: 70, uniqueness: 82, brandFit: 80 },
        rationales: {
          clarity: 'Fun opening',
          persuasion: 'Light benefit',
          seo: 'Basic tags',
          uniqueness: 'Playful angle',
          brandFit: 'Fits Playful',
        },
        total: 77.1,
        verdict: 'Hire',
      },
      {
        variantId: 'v3',
        scores: { clarity: 84, persuasion: 82, seo: 68, uniqueness: 88, brandFit: 86 },
        rationales: {
          clarity: 'Refined',
          persuasion: 'Material proof',
          seo: 'Niche terms',
          uniqueness: 'Elevated craft',
          brandFit: 'Luxury voice',
        },
        total: 81.2,
        verdict: 'Hire',
      },
    ],
    winnerId: 'v1',
    whyThisWon: 'Highest clarity and persuasion scores.',
    aiModel: 'gemini-3.5-flash-lite',
    promptVersion: 'v1',
    latencyMs: 1200,
    createdAt: '2026-11-24T10:00:00.000Z',
    updatedAt: '2026-11-24T10:00:00.000Z',
  };

  beforeEach(() => {
    aiProvider = {
      model: 'gemini-3.5-flash-lite',
      complete: jest.fn(),
    };

    repository = {
      create: jest.fn().mockResolvedValue(mockSavedRun),
      findById: jest.fn().mockResolvedValue(mockSavedRun),
      findLatestByInput: jest.fn().mockResolvedValue(null),
      findPaginated: jest.fn(),
      updatePick: jest.fn(),
      updateVariantAndScorecard: jest.fn(),
    } as unknown as jest.Mocked<ProductRepository>;

    const configService = {
      get: jest.fn((key: string) => {
        const map: Record<string, unknown> = {
          'cache.ttlSeconds': 300,
          'cache.maxEntries': 50,
          'gemini.maxTokensVariants': 900,
          'gemini.maxTokensScorecard': 1200,
          'gemini.temperature': 0.7,
          'gemini.temperatureScorecard': 0.3,
          'gemini.promptVersion': 'v1',
        };
        return map[key];
      }),
    } as unknown as ConfigService;

    cache = new MemoryCacheService(configService);
    service = new ProductService(aiProvider, repository, cache, configService);
  });

  it('generates 3 variants + scorecard in one AI call, persists, and serves repeats from local cache', async () => {
    aiProvider.complete.mockResolvedValueOnce({
      model: 'gemini-3.5-flash-lite',
      data: {
        variants: mockSavedRun.variants,
        scorecard: mockSavedRun.scorecard.map(({ variantId, scores, rationales }) => ({
          variantId,
          scores,
          rationales,
        })),
        winnerId: 'v1',
        whyThisWon: 'Highest clarity and persuasion scores.',
      },
    });

    const first = await service.generate({
      name: 'Wireless Mouse',
      category: 'Electronics',
      tone: 'Professional',
    });

    expect(first.cached).toBe(false);
    expect(first.winnerId).toBe('v1');
    expect(aiProvider.complete).toHaveBeenCalledTimes(1);
    expect(repository.create).toHaveBeenCalledTimes(1);

    const second = await service.generate({
      name: ' wireless mouse ',
      category: 'electronics',
      tone: 'Professional',
    });

    expect(second.cached).toBe(true);
    expect(aiProvider.complete).toHaveBeenCalledTimes(1);
  });

  it('serves L2 MongoDB cache hit when L1 memory cache is cold', async () => {
    repository.findLatestByInput.mockResolvedValueOnce(mockSavedRun);

    const result = await service.generate({
      name: 'Wireless Mouse',
      category: 'Electronics',
      tone: 'Professional',
    });

    expect(result.cached).toBe(true);
    expect(aiProvider.complete).not.toHaveBeenCalled();
  });

  it('computes exact weighted totals and verdict bands', () => {
    const total = service.computeWeightedTotal({
      clarity: 92,
      persuasion: 88,
      seo: 85,
      uniqueness: 78,
      brandFit: 90,
    });
    expect(total).toBe(87.2);
    expect(service.computeVerdict(85)).toBe('Strong hire');
    expect(service.computeVerdict(70)).toBe('Hire');
    expect(service.computeVerdict(55)).toBe('Borderline');
    expect(service.computeVerdict(54.9)).toBe('Needs improvement');
  });

  it('allows human override via pickWinner and rejects invalid variantId', async () => {
    repository.updatePick.mockResolvedValueOnce({ ...mockSavedRun, humanPickId: 'v2' });
    const updated = await service.pickWinner(mockSavedRun.id, 'v2');
    expect(updated.humanPickId).toBe('v2');

    await expect(service.pickWinner(mockSavedRun.id, 'v99')).rejects.toThrow(BadRequestException);
  });

  it('throws NotFoundException when run is missing', async () => {
    repository.findById.mockResolvedValueOnce(null);
    await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);
  });
});
