import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Model } from 'mongoose';
import { Run, RunDocument } from '../product/schemas/run.schema';

export class ToneWinRateDto {
  @ApiProperty({ example: 'Professional' })
  tone!: string;

  @ApiProperty({ example: 5 })
  wins!: number;

  @ApiProperty({ example: 50 })
  percentage!: number;
}

export class CategoryCountDto {
  @ApiProperty({ example: 'Electronics' })
  category!: string;

  @ApiProperty({ example: 4 })
  count!: number;
}

export class AnalyticsSummaryDto {
  @ApiProperty({ example: 10 })
  totalRuns!: number;

  @ApiProperty({ example: 2840 })
  avgLatencyMs!: number;

  @ApiProperty({ type: [ToneWinRateDto] })
  winRateByTone!: ToneWinRateDto[];

  @ApiProperty({ type: [CategoryCountDto] })
  topCategories!: CategoryCountDto[];
}

@Injectable()
export class AnalyticsService {
  constructor(@InjectModel(Run.name) private readonly runModel: Model<RunDocument>) {}

  async getSummary(): Promise<AnalyticsSummaryDto> {
    const [overviewAgg, categoryAgg, runsForWinTone] = await Promise.all([
      this.runModel
        .aggregate<{ totalRuns: number; avgLatencyMs: number }>([
          {
            $group: {
              _id: null,
              totalRuns: { $sum: 1 },
              avgLatencyMs: { $avg: '$latencyMs' },
            },
          },
        ])
        .exec(),
      this.runModel
        .aggregate<{ _id: string; count: number }>([
          { $group: { _id: '$input.category', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 },
        ])
        .exec(),
      this.runModel
        .find({}, { winnerId: 1, humanPickId: 1, variants: 1 })
        .lean()
        .exec(),
    ]);

    const totalRuns = overviewAgg[0]?.totalRuns ?? 0;
    const avgLatencyMs = Math.round(overviewAgg[0]?.avgLatencyMs ?? 0);

    const winCounts = new Map<string, number>();
    for (const run of runsForWinTone) {
      const effectiveWinnerId = run.humanPickId ?? run.winnerId;
      const winningVariant = run.variants.find((v) => v.id === effectiveWinnerId);
      if (winningVariant) {
        winCounts.set(winningVariant.tone, (winCounts.get(winningVariant.tone) ?? 0) + 1);
      }
    }

    const winRateByTone: ToneWinRateDto[] = Array.from(winCounts.entries())
      .map(([tone, wins]) => ({
        tone,
        wins,
        percentage: totalRuns > 0 ? Math.round((wins / totalRuns) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.wins - a.wins);

    const topCategories: CategoryCountDto[] = categoryAgg.map((entry) => ({
      category: entry._id,
      count: entry.count,
    }));

    return {
      totalRuns,
      avgLatencyMs,
      winRateByTone,
      topCategories,
    };
  }
}
