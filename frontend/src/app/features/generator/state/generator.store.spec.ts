import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Run } from '../../../core/models/run.model';
import { CacheService } from '../../../core/services/cache.service';
import { HistoryService } from '../../../core/services/history.service';
import { ProductService } from '../../../core/services/product.service';
import { ToastService } from '../../../core/services/toast.service';
import { GeneratorStore } from './generator.store';

describe('GeneratorStore', () => {
  let store: GeneratorStore;
  let productServiceMock: {
    generateRun: ReturnType<typeof vi.fn>;
    pickWinner: ReturnType<typeof vi.fn>;
  };

  const mockRun: Run = {
    id: 'run-1',
    input: { name: 'Wireless Mouse', category: 'Electronics', tone: 'Auto' },
    variants: [
      {
        id: 'v1',
        tone: 'Professional',
        title: 'Ergonomic Wireless Mouse',
        description: 'Silent clicks and 6-month battery life.',
        tags: ['ergonomic', 'wireless', 'silent'],
      },
      {
        id: 'v2',
        tone: 'Playful',
        title: 'Click Happy Mouse',
        description: 'Brighten your workspace with effortless glide.',
        tags: ['wireless', 'playful', 'desk'],
      },
      {
        id: 'v3',
        tone: 'Luxury',
        title: 'Atelier Wireless Mouse',
        description: 'Precision machined finish for quiet focus.',
        tags: ['luxury', 'wireless', 'precision'],
      },
    ],
    scorecard: [
      {
        variantId: 'v1',
        scores: { clarity: 92, persuasion: 88, seo: 85, uniqueness: 78, brandFit: 90 },
        rationales: {
          clarity: 'Clear headline',
          persuasion: 'Battery proof',
          seo: 'Strong keywords',
          uniqueness: 'Solid',
          brandFit: 'On tone',
        },
        total: 87.2,
        verdict: 'Strong hire',
      },
      {
        variantId: 'v2',
        scores: { clarity: 78, persuasion: 74, seo: 70, uniqueness: 80, brandFit: 76 },
        rationales: {
          clarity: 'Casual',
          persuasion: 'Light',
          seo: 'Fair',
          uniqueness: 'Playful',
          brandFit: 'Playful',
        },
        total: 75.5,
        verdict: 'Hire',
      },
      {
        variantId: 'v3',
        scores: { clarity: 82, persuasion: 80, seo: 68, uniqueness: 86, brandFit: 85 },
        rationales: {
          clarity: 'Refined',
          persuasion: 'Craft focus',
          seo: 'Niche',
          uniqueness: 'High',
          brandFit: 'Luxury',
        },
        total: 80.3,
        verdict: 'Hire',
      },
    ],
    winnerId: 'v1',
    whyThisWon: 'Best balance of clarity and persuasion.',
    aiModel: 'gemini-3.8-flash',
    promptVersion: 'v1',
    latencyMs: 2100,
    cached: false,
    createdAt: '2026-11-24T10:00:00.000Z',
    updatedAt: '2026-11-24T10:00:00.000Z',
  };

  beforeEach(() => {
    localStorage.clear();
    productServiceMock = {
      generateRun: vi.fn(() => of(mockRun)),
      pickWinner: vi.fn((_id: string, variantId: string) =>
        of({ ...mockRun, humanPickId: variantId }),
      ),
    };

    TestBed.configureTestingModule({
      providers: [
        GeneratorStore,
        CacheService,
        ToastService,
        { provide: ProductService, useValue: productServiceMock },
        {
          provide: HistoryService,
          useValue: {
            runs: () => [],
            prependOrUpdate: vi.fn(),
            refresh: vi.fn().mockResolvedValue(undefined),
          },
        },
      ],
    });

    store = TestBed.inject(GeneratorStore);
  });

  it('generates variants, ranks scorecard descending, and serves repeat queries from browser local cache', async () => {
    await store.generate({ name: 'Wireless Mouse', category: 'Electronics', tone: 'Auto' });

    expect(productServiceMock.generateRun).toHaveBeenCalledTimes(1);
    expect(store.rankedVariants().map((r) => r.variant.id)).toEqual(['v1', 'v3', 'v2']);
    expect(store.cacheSource()).toBe('live-ai');

    await store.generate({ name: ' wireless mouse ', category: 'electronics', tone: 'Auto' });
    expect(productServiceMock.generateRun).toHaveBeenCalledTimes(1);
    expect(store.cacheSource()).toBe('browser-cache');
  });

  it('updates effectiveWinnerId when human pick override is selected', async () => {
    await store.generate({ name: 'Wireless Mouse', category: 'Electronics', tone: 'Auto' });
    await store.pickWinner('v3');
    expect(store.effectiveWinnerId()).toBe('v3');
  });
});
