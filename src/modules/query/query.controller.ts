import { Controller, Post, Body } from '@nestjs/common';
import { QueryService } from './query.service';
import { AskDto } from './dto/ask.dto';

@Controller('v1/query')
export class QueryController {
  constructor(private readonly queryService: QueryService) {}

  @Post('ask')
  async ask(@Body() dto: AskDto) {
    return this.queryService.ask(dto.query, dto.userId);
  }
}
