import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ALLOWED_TONES } from './generate.dto';

export class RegenerateVariantDto {
  @ApiProperty({ example: 'shorter, warmer, emphasize battery life', maxLength: 200 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  feedback!: string;
}

export class TransformToneDto {
  @ApiProperty({ example: 'v1' })
  @IsString()
  @IsNotEmpty()
  variantId!: string;

  @ApiProperty({ enum: ALLOWED_TONES.filter((t) => t !== 'Auto'), example: 'Luxury' })
  @IsString()
  @IsIn(ALLOWED_TONES.filter((t) => t !== 'Auto'))
  tone!: string;
}

export class PickWinnerDto {
  @ApiProperty({ example: 'v2' })
  @IsString()
  @IsNotEmpty()
  variantId!: string;
}

export class AnalyzeSeoDto {
  @ApiProperty({ example: 'v1' })
  @IsString()
  @IsNotEmpty()
  variantId!: string;
}
