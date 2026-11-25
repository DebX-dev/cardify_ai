import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { ALLOWED_TONES } from './generate.dto';

export class QueryRunsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search query matching product name, title, or tags' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ enum: ALLOWED_TONES })
  @IsOptional()
  @IsString()
  @IsIn(ALLOWED_TONES)
  tone?: string;
}
