import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export const ALLOWED_TONES = [
  'Auto',
  'Professional',
  'Playful',
  'Luxury',
  'Minimal',
  'Technical',
] as const;

export class GenerateRunDto {
  @ApiProperty({ example: 'Wireless Mouse', maxLength: 100 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'Electronics', maxLength: 60 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  category!: string;

  @ApiPropertyOptional({ enum: ALLOWED_TONES, default: 'Auto' })
  @IsOptional()
  @IsString()
  @IsIn(ALLOWED_TONES)
  tone: (typeof ALLOWED_TONES)[number] = 'Auto';

  @ApiPropertyOptional({ example: 'target: remote workers, silent clicks', maxLength: 200 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(200)
  extraContext?: string;

  @ApiPropertyOptional({
    description: 'Set true to bypass the backend local TTL cache and force a fresh AI call.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  bypassCache?: boolean;
}
