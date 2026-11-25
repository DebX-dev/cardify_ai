import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RunDocument = HydratedDocument<Run>;

@Schema({ _id: false })
export class RunInputSchema {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, trim: true })
  category!: string;

  @Prop({ required: true, trim: true })
  tone!: string;

  @Prop({ trim: true })
  extraContext?: string;
}

@Schema({ _id: false })
export class VariantSchema {
  @Prop({ required: true })
  id!: string;

  @Prop({ required: true })
  tone!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ type: [String], required: true })
  tags!: string[];
}

@Schema({ _id: false })
export class ScoreBreakdownSchema {
  @Prop({ required: true })
  clarity!: number;

  @Prop({ required: true })
  persuasion!: number;

  @Prop({ required: true })
  seo!: number;

  @Prop({ required: true })
  uniqueness!: number;

  @Prop({ required: true })
  brandFit!: number;
}

@Schema({ _id: false })
export class ScoreRationalesSchema {
  @Prop({ required: true })
  clarity!: string;

  @Prop({ required: true })
  persuasion!: string;

  @Prop({ required: true })
  seo!: string;

  @Prop({ required: true })
  uniqueness!: string;

  @Prop({ required: true })
  brandFit!: string;
}

@Schema({ _id: false })
export class ScorecardEntrySchema {
  @Prop({ required: true })
  variantId!: string;

  @Prop({ type: ScoreBreakdownSchema, required: true })
  scores!: ScoreBreakdownSchema;

  @Prop({ type: ScoreRationalesSchema, required: true })
  rationales!: ScoreRationalesSchema;

  @Prop({ required: true })
  total!: number;

  @Prop({ required: true, enum: ['Strong hire', 'Hire', 'Borderline', 'Needs improvement'] })
  verdict!: string;
}

@Schema({ collection: 'runs', timestamps: true })
export class Run {
  @Prop({ type: RunInputSchema, required: true })
  input!: RunInputSchema;

  @Prop({ type: [VariantSchema], required: true })
  variants!: VariantSchema[];

  @Prop({ type: [ScorecardEntrySchema], required: true })
  scorecard!: ScorecardEntrySchema[];

  @Prop({ required: true })
  winnerId!: string;

  @Prop()
  humanPickId?: string;

  @Prop({ required: true })
  whyThisWon!: string;

  @Prop({ required: true })
  aiModel!: string;

  @Prop({ required: true })
  promptVersion!: string;

  @Prop({ required: true })
  latencyMs!: number;

  createdAt!: Date;
  updatedAt!: Date;
}

export const RunSchema = SchemaFactory.createForClass(Run);

RunSchema.index({ createdAt: -1 });
RunSchema.index({ 'input.tone': 1 });
RunSchema.index({ winnerId: 1 });
RunSchema.index({ 'variants.title': 'text', 'variants.tags': 'text' });
