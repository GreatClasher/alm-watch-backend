import { Controller, Post, Body } from '@nestjs/common';
import { QueryService } from '../query/query.service';

@Controller('recall')
export class RecallController {
  constructor(private readonly queryService: QueryService) {}

  @Post()
  async recall(@Body('query') query: string) {
    if (!query) {
      return { answer: 'Please provide a query.', citations: [] };
    }

    // Using the hardcoded user ID from your Data Inspector screenshots
    const userId = 'ef26c7d5-5edc-4f24-b9a5-38f6752c8975';
    
    try {
      const result = await this.queryService.ask(query, userId);
      return { 
        answer: result.answer, 
        citations: result.usedMemoryIds.map(id => `Memory ${id}`) 
      };
    } catch (error) {
      console.error('Error during recall:', error);
      return { answer: 'Sorry, I encountered an error searching your memories.', citations: [] };
    }
  }
}
