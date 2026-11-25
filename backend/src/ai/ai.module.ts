import { Module } from '@nestjs/common';
import { AI_PROVIDER } from './ai-provider.interface';
import { GeminiProvider } from './gemini.provider';

@Module({
  providers: [
    GeminiProvider,
    {
      provide: AI_PROVIDER,
      useExisting: GeminiProvider,
    },
  ],
  exports: [AI_PROVIDER, GeminiProvider],
})
export class AiModule {}
