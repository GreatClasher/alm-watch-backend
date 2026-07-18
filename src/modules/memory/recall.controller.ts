import { Controller, Post, Body } from '@nestjs/common';

@Controller('recall')
export class RecallController {
  @Post()
  recall(@Body('query') query: string) {
    return { answer: 'Not implemented', citations: [] };
  }
}
