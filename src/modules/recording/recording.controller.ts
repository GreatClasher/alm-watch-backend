import { Controller, Get, Param, Res, StreamableFile } from '@nestjs/common';
import { RecordingService } from './recording.service';

@Controller('recordings')
export class RecordingController {
  constructor(private readonly recordingService: RecordingService) {}

  @Get(':id/audio.ogg')
  async getRecordingAudio(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: any,
  ): Promise<StreamableFile> {
    const stream = await this.recordingService.getRecordingAudio(id);
    res.set({
      'Content-Type': 'audio/ogg',
      'Content-Disposition': `inline; filename="${id}.ogg"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });
    return new StreamableFile(stream);
  }

  @Get(':id/observations')
  async getRecordingObservations(@Param('id') id: string) {
    return this.recordingService.getRecordingObservations(id);
  }
}
