import { Controller, Get } from '@nestjs/common';

@Controller('context')
export class ContextController {
  @Get('current')
  getCurrent() {
    return { activeEpisode: null, entities: [] };
  }
}
