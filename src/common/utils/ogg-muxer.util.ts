import { Transform, TransformCallback } from 'stream';

export class OggOpusWriter extends Transform {
  private pageSequence = 0;
  private granulePosition = 0;
  private serialNumber = Math.floor(Math.random() * 0xFFFFFFFF);

  constructor(private sampleRate: number = 16000, private channels: number = 1) {
    super();
    this.writeHeaders();
  }

  private writeOggPage(headerType: number, granule: number, segments: Buffer[]) {
    const segmentCount = segments.length;
    let payloadSize = 0;
    const segmentTable = Buffer.alloc(segmentCount);
    for (let i = 0; i < segmentCount; i++) {
      segmentTable[i] = segments[i]!.length;
      payloadSize += segments[i]!.length;
    }

    const page = Buffer.alloc(27 + segmentCount + payloadSize);
    
    // capture_pattern
    page.write('OggS', 0);
    // stream_structure_version
    page.writeUInt8(0, 4);
    // header_type_flag
    page.writeUInt8(headerType, 5);
    // granule_position (8 bytes, little endian)
    page.writeBigInt64LE(BigInt(granule), 6);
    // bitstream_serial_number (4 bytes, little endian)
    page.writeUInt32LE(this.serialNumber, 14);
    // page_sequence_number (4 bytes, little endian)
    page.writeUInt32LE(this.pageSequence++, 18);
    // CRC_checksum (calculated later)
    page.writeUInt32LE(0, 22);
    // number_page_segments
    page.writeUInt8(segmentCount, 26);
    // segment_table
    segmentTable.copy(page, 27);
    
    // payload
    let offset = 27 + segmentCount;
    for (const segment of segments) {
      segment.copy(page, offset);
      offset += segment.length;
    }

    // Compute CRC32
    const crc = this.crc32(page);
    page.writeUInt32LE(crc, 22);

    this.push(page);
  }

  private writeHeaders() {
    // OpusHead
    const opusHead = Buffer.alloc(19);
    opusHead.write('OpusHead', 0);
    opusHead.writeUInt8(1, 8); // version
    opusHead.writeUInt8(this.channels, 9); // channels
    opusHead.writeUInt16LE(0, 10); // pre-skip
    opusHead.writeUInt32LE(this.sampleRate, 12); // original sample rate
    opusHead.writeUInt16LE(0, 16); // output gain
    opusHead.writeUInt8(0, 18); // channel mapping family
    this.writeOggPage(0x02, 0, [opusHead]); // 0x02 = BOS

    // OpusTags
    const vendorString = Buffer.from('jabbelpin-backend', 'utf8');
    const opusTags = Buffer.alloc(8 + 4 + vendorString.length + 4);
    opusTags.write('OpusTags', 0);
    opusTags.writeUInt32LE(vendorString.length, 8);
    vendorString.copy(opusTags, 12);
    opusTags.writeUInt32LE(0, 12 + vendorString.length); // 0 comments
    this.writeOggPage(0x00, 0, [opusTags]);
  }

  private lastChunk: Buffer | null = null;

  _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback): void {
    // Each chunk is an opus packet. We assume each packet is exactly 20ms.
    if (this.lastChunk) {
      this.granulePosition += 960;
      this.writeOggPage(0x00, this.granulePosition, [this.lastChunk]);
    }
    this.lastChunk = chunk;
    callback();
  }

  _flush(callback: TransformCallback): void {
    if (this.lastChunk) {
      this.granulePosition += 960;
      // Send EOS page on the last packet
      this.writeOggPage(0x04, this.granulePosition, [this.lastChunk]);
    } else {
      // Send EOS page if no packets were written
      this.writeOggPage(0x04, this.granulePosition, []);
    }
    callback();
  }

  // Ogg CRC32 calculation
  private crc32(buffer: Buffer): number {
    let crc = 0;
    for (let i = 0; i < buffer.length; i++) {
      crc ^= buffer[i]! << 24;
      for (let j = 0; j < 8; j++) {
        if (crc & 0x80000000) {
          crc = (crc << 1) ^ 0x04C11DB7;
        } else {
          crc <<= 1;
        }
      }
    }
    return crc >>> 0;
  }
}
