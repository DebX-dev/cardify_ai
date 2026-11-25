import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VariantScorecardDto } from './scorecard.dto';

export class RunInputDto {
  @ApiProperty({ example: 'Wireless Mouse' })
  name!: string;

  @ApiProperty({ example: 'Electronics' })
  category!: string;

  @ApiProperty({ example: 'Professional' })
  tone!: string;

  @ApiPropertyOptional({ example: 'target: remote workers' })
  extraContext?: string;
}

export class ProductVariantDto {
  @ApiProperty({ example: 'v1' })
  id!: string;

  @ApiProperty({ example: 'Professional' })
  tone!: string;

  @ApiProperty({ example: 'Ergonomic Wireless Mouse for Remote Work' })
  title!: string;

  @ApiProperty({ example: 'Stay productive all day with silent clicks and 6-month battery life.' })
  description!: string;

  @ApiProperty({ type: [String], example: ['ergonomic', 'wireless', 'silent-click', 'remote-work'] })
  tags!: string[];
}

export class RunResponseDto {
  @ApiProperty({ example: '673a9b5f12c34d567890abcd' })
  id!: string;

  @ApiProperty({ type: RunInputDto })
  input!: RunInputDto;

  @ApiProperty({ type: [ProductVariantDto] })
  variants!: ProductVariantDto[];

  @ApiProperty({ type: [VariantScorecardDto] })
  scorecard!: VariantScorecardDto[];

  @ApiProperty({ example: 'v1' })
  winnerId!: string;

  @ApiPropertyOptional({ example: 'v2' })
  humanPickId?: string;

  @ApiProperty({ example: 'Strongest clarity + persuasion while staying on-tone; modest SEO gap.' })
  whyThisWon!: string;

  @ApiProperty({ example: 'gemini-3.8-flash' })
  aiModel!: string;

  @ApiProperty({ example: 'v1' })
  promptVersion!: string;

  @ApiProperty({ example: 3421 })
  latencyMs!: number;

  @ApiPropertyOptional({ example: false })
  cached?: boolean;

  @ApiProperty({ example: '2025-11-24T10:15:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2025-11-24T10:15:00.000Z' })
  updatedAt!: string;
}
