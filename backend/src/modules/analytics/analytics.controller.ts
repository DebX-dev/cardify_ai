import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AnalyticsService, AnalyticsSummaryDto } from './analytics.service';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Return aggregate run statistics, average latency, and winning tones' })
  @ApiOkResponse({ type: AnalyticsSummaryDto })
  getSummary(): Promise<AnalyticsSummaryDto> {
    return this.analyticsService.getSummary();
  }
}
