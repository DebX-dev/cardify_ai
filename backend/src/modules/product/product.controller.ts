import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated.decorator';
import { RequestWithContext } from '../../common/interceptors/request-id.interceptor';
import { GenerateRunDto } from './dto/generate.dto';
import { QueryRunsDto } from './dto/query-runs.dto';
import {
  AnalyzeSeoDto,
  PickWinnerDto,
  RegenerateVariantDto,
  TransformToneDto,
} from './dto/regenerate.dto';
import { RunResponseDto } from './dto/run-response.dto';
import { SeoAnalysisResponseDto } from './dto/scorecard.dto';
import { PaginatedRunsResult } from './product.repository';
import { ProductService } from './product.service';

/**
 * MVC Controller: handles HTTP routing, DTO validation, and Swagger metadata only.
 */
@ApiTags('Runs')
@Controller('runs')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Generate 3 product card variants + AI Interview Scorecard + winner',
  })
  @ApiCreatedResponse({ type: RunResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid product input payload' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  generate(
    @Body() dto: GenerateRunDto,
    @Req() req: RequestWithContext,
  ): Promise<RunResponseDto> {
    return this.productService.generate(dto, req.requestId);
  }

  @Get()
  @ApiOperation({ summary: 'List paginated generation runs with optional search and tone filter' })
  @ApiPaginatedResponse(RunResponseDto)
  findAll(@Query() query: QueryRunsDto): Promise<PaginatedRunsResult> {
    return this.productService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch a single generation run by ID' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId of the run' })
  @ApiOkResponse({ type: RunResponseDto })
  @ApiNotFoundResponse({ description: 'Run not found' })
  findOne(@Param('id') id: string): Promise<RunResponseDto> {
    return this.productService.findOne(id);
  }

  @Patch(':id/pick')
  @ApiOperation({ summary: 'Override the AI winner with a human pick' })
  @ApiParam({ name: 'id', description: 'Run ID' })
  @ApiOkResponse({ type: RunResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid variantId' })
  @ApiNotFoundResponse({ description: 'Run not found' })
  pickWinner(@Param('id') id: string, @Body() dto: PickWinnerDto): Promise<RunResponseDto> {
    return this.productService.pickWinner(id, dto.variantId);
  }

  @Post(':id/regenerate/:variantId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Regenerate one variant using natural-language feedback and re-score it' })
  @ApiParam({ name: 'id', description: 'Run ID' })
  @ApiParam({ name: 'variantId', description: 'Variant ID (v1, v2, v3)' })
  @ApiOkResponse({ type: RunResponseDto })
  regenerateVariant(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @Body() dto: RegenerateVariantDto,
    @Req() req: RequestWithContext,
  ): Promise<RunResponseDto> {
    return this.productService.regenerateVariant(id, variantId, dto, req.requestId);
  }

  @Post(':id/transform')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Transform a variant to a new tone and re-score it' })
  @ApiParam({ name: 'id', description: 'Run ID' })
  @ApiOkResponse({ type: RunResponseDto })
  transformTone(
    @Param('id') id: string,
    @Body() dto: TransformToneDto,
    @Req() req: RequestWithContext,
  ): Promise<RunResponseDto> {
    return this.productService.transformTone(id, dto, req.requestId);
  }

  @Post(':id/seo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run SEO keyword density and missing-keyword analysis for a variant' })
  @ApiParam({ name: 'id', description: 'Run ID' })
  @ApiOkResponse({ type: SeoAnalysisResponseDto })
  analyzeSeo(
    @Param('id') id: string,
    @Body() dto: AnalyzeSeoDto,
    @Req() req: RequestWithContext,
  ): Promise<SeoAnalysisResponseDto> {
    return this.productService.analyzeSeo(id, dto.variantId, req.requestId);
  }
}
