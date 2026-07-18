import { Module, Global } from '@nestjs/common';
import { LlmProvider } from './llm.provider';
import { GeminiLlmProvider } from './gemini-llm.provider';

@Global()
@Module({
  providers: [
    {
      provide: LlmProvider,
      useClass: GeminiLlmProvider,
    },
  ],
  exports: [LlmProvider],
})
export class LlmModule {}
