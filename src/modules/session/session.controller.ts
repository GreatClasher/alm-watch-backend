import { Controller, Get, Param, Query, ParseIntPipe, DefaultValuePipe, Res, BadRequestException, StreamableFile } from '@nestjs/common';
import { SessionService } from './session.service';

@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get()
  async getSessions(
    @Query('deviceId') deviceId: string,
    @Query('where') whereStr: string,
    @Query('order') orderStr: string,
    @Query('select') selectStr: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    if (!deviceId) throw new BadRequestException('deviceId query param is required');

    let whereObj = undefined;
    let orderObj = undefined;
    let selectObj = undefined;

    if (whereStr) { try { whereObj = JSON.parse(whereStr); } catch (e) {} }
    if (orderStr) { try { orderObj = JSON.parse(orderStr); } catch (e) {} }
    if (selectStr) { try { selectObj = JSON.parse(selectStr); } catch (e) {} }

    return this.sessionService.getSessions(deviceId, whereObj, orderObj, selectObj, page, limit);
  }

  @Get(':sessionId/audio.ogg')
  async getSessionAudio(
    @Param('sessionId') sessionId: string,
    @Res({ passthrough: true }) res: any,
  ): Promise<StreamableFile> {
    const stream = await this.sessionService.getSessionAudio('', sessionId);
    res.set({
      'Content-Type': 'audio/ogg',
      'Content-Disposition': `inline; filename="${sessionId}.ogg"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });
    return new StreamableFile(stream);
  }

  @Get(':sessionId/packets')
  async getSessionPackets(
    @Param('sessionId') sessionId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.sessionService.getSessionPackets('', sessionId, page, limit);
  }

  @Get(':sessionId/utterances')
  async getSessionUtterances(
    @Param('sessionId') sessionId: string,
  ) {
    return this.sessionService.getSessionUtterances('', sessionId);
  }
}
