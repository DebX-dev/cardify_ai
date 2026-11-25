import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { ProductVariant, VariantScorecard } from '../../ai/ai.types';
import { RunResponseDto } from './dto/run-response.dto';
import { Run, RunDocument } from './schemas/run.schema';

export interface CreateRunRecord {
  input: {
    name: string;
    category: string;
    tone: string;
    extraContext?: string;
  };
  variants: ProductVariant[];
  scorecard: VariantScorecard[];
  winnerId: string;
  whyThisWon: string;
  aiModel: string;
  promptVersion: string;
  latencyMs: number;
}

export interface PaginatedRunsResult {
  items: RunResponseDto[];
  total: number;
  page: number;
  limit: number;
}

/**
 * MVC Repository: isolates all Mongoose queries and maps documents into clean
 * domain DTOs so the service and controller never touch raw Mongoose documents.
 */
@Injectable()
export class ProductRepository {
  constructor(@InjectModel(Run.name) private readonly runModel: Model<RunDocument>) {}

  async create(record: CreateRunRecord): Promise<RunResponseDto> {
    const created = await this.runModel.create(record);
    return this.toDto(created.toObject());
  }

  async findById(id: string): Promise<RunResponseDto | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.runModel.findById(id).lean().exec();
    return doc ? this.toDto(doc) : null;
  }

  async findLatestByInput(input: {
    name: string;
    category: string;
    tone: string;
    extraContext?: string;
  }): Promise<RunResponseDto | null> {
    const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const filter: FilterQuery<RunDocument> = {
      'input.name': new RegExp(`^${escape(input.name.trim())}$`, 'i'),
      'input.category': new RegExp(`^${escape(input.category.trim())}$`, 'i'),
      'input.tone': new RegExp(`^${escape(input.tone.trim())}$`, 'i'),
    };
    if (input.extraContext?.trim()) {
      filter['input.extraContext'] = new RegExp(`^${escape(input.extraContext.trim())}$`, 'i');
    } else {
      filter.$or = [{ 'input.extraContext': { $exists: false } }, { 'input.extraContext': '' }];
    }

    const doc = await this.runModel.findOne(filter).sort({ createdAt: -1 }).lean().exec();
    return doc ? this.toDto(doc) : null;
  }

  async findPaginated(params: {
    page: number;
    limit: number;
    q?: string;
    tone?: string;
  }): Promise<PaginatedRunsResult> {
    const filter: FilterQuery<RunDocument> = {};
    if (params.tone) {
      filter['input.tone'] = params.tone;
    }
    if (params.q) {
      const escaped = params.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [
        { 'input.name': regex },
        { 'input.category': regex },
        { 'variants.title': regex },
        { 'variants.tags': regex },
      ];
    }

    const skip = (params.page - 1) * params.limit;
    const [docs, total] = await Promise.all([
      this.runModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(params.limit).lean().exec(),
      this.runModel.countDocuments(filter).exec(),
    ]);

    return {
      items: docs.map((doc) => this.toDto(doc)),
      total,
      page: params.page,
      limit: params.limit,
    };
  }

  async updatePick(id: string, variantId: string): Promise<RunResponseDto | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const updated = await this.runModel
      .findByIdAndUpdate(id, { $set: { humanPickId: variantId } }, { new: true })
      .lean()
      .exec();
    return updated ? this.toDto(updated) : null;
  }

  async updateVariantAndScorecard(params: {
    id: string;
    variants: ProductVariant[];
    scorecard: VariantScorecard[];
    winnerId: string;
    whyThisWon: string;
    aiModel: string;
    latencyMs: number;
  }): Promise<RunResponseDto | null> {
    if (!Types.ObjectId.isValid(params.id)) return null;
    const updated = await this.runModel
      .findByIdAndUpdate(
        params.id,
        {
          $set: {
            variants: params.variants,
            scorecard: params.scorecard,
            winnerId: params.winnerId,
            whyThisWon: params.whyThisWon,
            aiModel: params.aiModel,
            latencyMs: params.latencyMs,
          },
        },
        { new: true },
      )
      .lean()
      .exec();
    return updated ? this.toDto(updated) : null;
  }

  private toDto(doc: Run & { _id: Types.ObjectId }): RunResponseDto {
    return {
      id: doc._id.toString(),
      input: {
        name: doc.input.name,
        category: doc.input.category,
        tone: doc.input.tone,
        ...(doc.input.extraContext ? { extraContext: doc.input.extraContext } : {}),
      },
      variants: doc.variants.map((v) => ({
        id: v.id,
        tone: v.tone,
        title: v.title,
        description: v.description,
        tags: [...v.tags],
      })),
      scorecard: doc.scorecard.map((s) => ({
        variantId: s.variantId,
        scores: { ...s.scores },
        rationales: { ...s.rationales },
        total: s.total,
        verdict: s.verdict as RunResponseDto['scorecard'][number]['verdict'],
      })),
      winnerId: doc.winnerId,
      ...(doc.humanPickId ? { humanPickId: doc.humanPickId } : {}),
      whyThisWon: doc.whyThisWon,
      aiModel: doc.aiModel,
      promptVersion: doc.promptVersion,
      latencyMs: doc.latencyMs,
      createdAt: new Date(doc.createdAt).toISOString(),
      updatedAt: new Date(doc.updatedAt).toISOString(),
    };
  }
}
