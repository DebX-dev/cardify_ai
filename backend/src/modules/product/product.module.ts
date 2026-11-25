import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiModule } from '../../ai/ai.module';
import { MemoryCacheService } from '../../common/cache/memory-cache.service';
import { ProductController } from './product.controller';
import { ProductRepository } from './product.repository';
import { ProductService } from './product.service';
import { Run, RunSchema } from './schemas/run.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Run.name, schema: RunSchema }]), AiModule],
  controllers: [ProductController],
  providers: [ProductService, ProductRepository, MemoryCacheService],
  exports: [ProductService, ProductRepository, MongooseModule, MemoryCacheService],
})
export class ProductModule {}
