import { ApiProperty } from '@nestjs/swagger';

export class ScoreBreakdownDto {
  @ApiProperty({ example: 92 })
  clarity!: number;

  @ApiProperty({ example: 88 })
  persuasion!: number;

  @ApiProperty({ example: 85 })
  seo!: number;

  @ApiProperty({ example: 78 })
  uniqueness!: number;

  @ApiProperty({ example: 90 })
  brandFit!: number;
}

export class ScoreRationalesDto {
  @ApiProperty({ example: 'Benefit-led headline; easy to grasp.' })
  clarity!: string;

  @ApiProperty({ example: 'Silent-click + battery are concrete motivators.' })
  persuasion!: string;

  @ApiProperty({ example: "'ergonomic' and 'wireless' are high-intent." })
  seo!: string;

  @ApiProperty({ example: 'Category-standard; modest differentiation.' })
  uniqueness!: string;

  @ApiProperty({ example: "On-tone for 'Professional'." })
  brandFit!: string;
}

export class VariantScorecardDto {
  @ApiProperty({ example: 'v1' })
  variantId!: string;

  @ApiProperty({ type: ScoreBreakdownDto })
  scores!: ScoreBreakdownDto;

  @ApiProperty({ type: ScoreRationalesDto })
  rationales!: ScoreRationalesDto;

  @ApiProperty({ example: 87.4 })
  total!: number;

  @ApiProperty({
    enum: ['Strong hire', 'Hire', 'Borderline', 'Needs improvement'],
    example: 'Strong hire',
  })
  verdict!: 'Strong hire' | 'Hire' | 'Borderline' | 'Needs improvement';
}

export class SeoKeywordMetricDto {
  @ApiProperty({ example: 'wireless mouse' })
  keyword!: string;

  @ApiProperty({ example: 4.5 })
  densityPercent!: number;

  @ApiProperty({ enum: ['high', 'medium', 'low'], example: 'high' })
  relevance!: 'high' | 'medium' | 'low';
}

export class SeoAnalysisResponseDto {
  @ApiProperty({ example: 'v1' })
  variantId!: string;

  @ApiProperty({ type: [SeoKeywordMetricDto] })
  topKeywords!: SeoKeywordMetricDto[];

  @ApiProperty({ type: [String], example: ['usb-c rechargeable', 'mac-compatible', 'low-latency'] })
  missingKeywords!: string[];

  @ApiProperty({ example: 'Strong primary keyword coverage; adding connectivity terms improves long-tail reach.' })
  summary!: string;

  @ApiProperty({ example: false })
  cached!: boolean;
}
