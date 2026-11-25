import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { AI_PROVIDER, AiCompletionRequest } from '../../../ai/ai-provider.interface';
import { HttpExceptionFilter } from '../../../common/filters/http-exception.filter';
import { RequestIdInterceptor } from '../../../common/interceptors/request-id.interceptor';
import configuration from '../../../config/configuration';
import { AnalyticsModule } from '../../analytics/analytics.module';
import { ProductModule } from '../product.module';

describe('ProductController (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let createdRunId = '';

  const fakeAiProvider = {
    model: 'gemini-3.8-flash',
    complete: jest.fn(async (args: AiCompletionRequest) => {
      if (args.user.includes('"variants"')) {
        return {
          model: 'gemini-3.8-flash',
          data: {
            scorecard: [
              {
                variantId: 'v1',
                scores: { clarity: 92, persuasion: 88, seo: 85, uniqueness: 78, brandFit: 90 },
                rationales: {
                  clarity: 'Benefit-led headline.',
                  persuasion: 'Silent clicks resonate.',
                  seo: 'Strong core terms.',
                  uniqueness: 'Clean value prop.',
                  brandFit: 'Matches Professional.',
                },
              },
              {
                variantId: 'v2',
                scores: { clarity: 78, persuasion: 74, seo: 70, uniqueness: 80, brandFit: 76 },
                rationales: {
                  clarity: 'Playful intro.',
                  persuasion: 'Light motivation.',
                  seo: 'Moderate keywords.',
                  uniqueness: 'Friendly tone.',
                  brandFit: 'Matches Playful.',
                },
              },
              {
                variantId: 'v3',
                scores: { clarity: 82, persuasion: 80, seo: 68, uniqueness: 86, brandFit: 85 },
                rationales: {
                  clarity: 'Refined headline.',
                  persuasion: 'Craftsmanship focus.',
                  seo: 'Lower search volume.',
                  uniqueness: 'Premium positioning.',
                  brandFit: 'Matches Luxury.',
                },
              },
            ],
            winnerId: 'v1',
            whyThisWon: 'Strongest clarity + persuasion while staying on-tone.',
          },
        };
      }

      if (args.user.includes('"currentVariant"')) {
        return {
          model: 'gemini-3.8-flash',
          data: {
            variant: {
              tone: 'Luxury',
              title: 'Sculpted Silent Wireless Mouse',
              description: 'Precision machined comfort built for quiet deep-work sessions.',
              tags: ['luxury', 'wireless', 'silent', 'ergonomic'],
            },
            score: {
              scores: { clarity: 94, persuasion: 91, seo: 86, uniqueness: 89, brandFit: 92 },
              rationales: {
                clarity: 'Crisp headline.',
                persuasion: 'Deep-work promise.',
                seo: 'High-intent tags.',
                uniqueness: 'Distinct luxury angle.',
                brandFit: 'True Luxury tone.',
              },
            },
            whyThisWon: 'Elevated clarity and persuasion after feedback.',
          },
        };
      }

      if (args.user.includes('"variant"')) {
        return {
          model: 'gemini-3.8-flash',
          data: {
            topKeywords: [
              { keyword: 'wireless mouse', densityPercent: 5.2, relevance: 'high' },
              { keyword: 'ergonomic', densityPercent: 3.1, relevance: 'high' },
              { keyword: 'silent', densityPercent: 2.5, relevance: 'medium' },
              { keyword: 'remote work', densityPercent: 2.1, relevance: 'medium' },
              { keyword: 'battery', densityPercent: 1.8, relevance: 'low' },
            ],
            missingKeywords: ['usb-c', 'bluetooth-5', 'mac-compatible'],
            summary: 'Good primary keywords; add connectivity terms.',
          },
        };
      }

      return {
        model: 'gemini-3.5-flash-lite',
        data: {
          variants: [
            {
              id: 'v1',
              tone: 'Professional',
              title: 'Ergonomic Wireless Mouse for Remote Work',
              description: 'Stay productive all day with silent clicks and 6-month battery life.',
              tags: ['ergonomic', 'wireless', 'silent-click', 'remote-work'],
            },
            {
              id: 'v2',
              tone: 'Playful',
              title: 'Glide Happy Wireless Mouse',
              description: 'Zero wires, zero click noise, pure desk joy.',
              tags: ['wireless', 'desk-gear', 'silent'],
            },
            {
              id: 'v3',
              tone: 'Luxury',
              title: 'Atelier Wireless Mouse',
              description: 'Crafted silhouette with whisper-quiet precision.',
              tags: ['luxury', 'wireless', 'precision'],
            },
          ],
          scorecard: [
            {
              variantId: 'v1',
              scores: { clarity: 92, persuasion: 88, seo: 85, uniqueness: 78, brandFit: 90 },
              rationales: {
                clarity: 'Benefit-led headline.',
                persuasion: 'Silent clicks resonate.',
                seo: 'Strong core terms.',
                uniqueness: 'Clean value prop.',
                brandFit: 'Matches Professional.',
              },
            },
            {
              variantId: 'v2',
              scores: { clarity: 78, persuasion: 74, seo: 70, uniqueness: 80, brandFit: 76 },
              rationales: {
                clarity: 'Playful intro.',
                persuasion: 'Light motivation.',
                seo: 'Moderate keywords.',
                uniqueness: 'Friendly tone.',
                brandFit: 'Matches Playful.',
              },
            },
            {
              variantId: 'v3',
              scores: { clarity: 82, persuasion: 80, seo: 68, uniqueness: 86, brandFit: 85 },
              rationales: {
                clarity: 'Refined headline.',
                persuasion: 'Craftsmanship focus.',
                seo: 'Lower search volume.',
                uniqueness: 'Premium positioning.',
                brandFit: 'Matches Luxury.',
              },
            },
          ],
          winnerId: 'v1',
          whyThisWon: 'Strongest clarity + persuasion while staying on-tone.',
        },
      };
    }),
  };

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              ...configuration(),
              mongo: { uri, dbName: 'cardify_test' },
              rateLimit: { ttlSeconds: 60, max: 8 },
            }),
          ],
        }),
        MongooseModule.forRoot(uri, { dbName: 'cardify_test' }),
        ThrottlerModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (cfg: ConfigService) => [
            {
              ttl: (cfg.get<number>('rateLimit.ttlSeconds') ?? 60) * 1000,
              limit: cfg.get<number>('rateLimit.max') ?? 8,
            },
          ],
        }),
        ProductModule,
        AnalyticsModule,
      ],
      providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
    })
      .overrideProvider(AI_PROVIDER)
      .useValue(fakeAiProvider)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new RequestIdInterceptor());
    await app.init();
  }, 60_000);

  afterAll(async () => {
    if (app) await app.close();
    if (mongod) await mongod.stop();
  });

  it('POST /api/v1/runs returns 400 envelope on invalid body', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/runs')
      .send({ name: '', category: 'Electronics' })
      .expect(400);

    expect(res.body).toHaveProperty('statusCode', 400);
    expect(res.body).toHaveProperty('requestId');
  });

  it('POST /api/v1/runs generates 3 variants + scorecard + persists to Mongo', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/runs')
      .send({
        name: 'Wireless Mouse',
        category: 'Electronics',
        tone: 'Professional',
        extraContext: 'target: remote workers',
      })
      .expect(201);

    expect(res.body.variants).toHaveLength(3);
    expect(res.body.scorecard).toHaveLength(3);
    expect(res.body.winnerId).toBe('v1');
    createdRunId = res.body.id;
  });

  it('PATCH /api/v1/runs/:id/pick updates humanPickId', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/runs/${createdRunId}/pick`)
      .send({ variantId: 'v2' })
      .expect(200);

    expect(res.body.humanPickId).toBe('v2');
  });

  it('POST /api/v1/runs/:id/regenerate/:variantId updates variant and re-scores', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/runs/${createdRunId}/regenerate/v2`)
      .send({ feedback: 'make it luxury and crisp' })
      .expect(200);

    expect(res.body.winnerId).toBe('v2');
  });

  it('POST /api/v1/runs/:id/seo returns top and missing keywords', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/runs/${createdRunId}/seo`)
      .send({ variantId: 'v1' })
      .expect(200);

    expect(res.body.topKeywords.length).toBeGreaterThanOrEqual(5);
    expect(res.body.missingKeywords).toHaveLength(3);
  });

  it('GET /api/v1/analytics/summary returns non-empty aggregate stats', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/analytics/summary').expect(200);

    expect(res.body.totalRuns).toBeGreaterThanOrEqual(1);
    expect(res.body.topCategories[0].category).toBe('Electronics');
  });

  it('enforces rate limiting with 429 after RATE_LIMIT_MAX requests', async () => {
    let hit429 = false;
    for (let i = 0; i < 12; i += 1) {
      const res = await request(app.getHttpServer()).get('/api/v1/runs');
      if (res.status === 429) {
        hit429 = true;
        break;
      }
    }
    expect(hit429).toBe(true);
  });
});
