export class ChecksumUtil {
  private static crcTable: Uint32Array | null = null;

  private static makeCRCTable(): Uint32Array {
    let c: number;
    const crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      crcTable[n] = c;
    }
    return crcTable;
  }

  /**
   * Calculates the CRC32 of a given Buffer matching java.util.zip.CRC32
   * 
   * Cross-platform verification vector:
   * CRC32([0x01, 0x02, 0x03]) = 1438416925 (0x55BC801D)
   * 
   * @param buffer The payload buffer to checksum
   * @returns The CRC32 checksum as an unsigned 32-bit integer
   */
  public static calculateCrc32(buffer: Buffer | Uint8Array): number {
    if (!this.crcTable) {
      this.crcTable = this.makeCRCTable();
    }
    const crcTable = this.crcTable;
    let crc = 0xffffffff;

    for (let i = 0; i < buffer.length; i++) {
      crc = crcTable[(crc ^ buffer[i]!) & 0xff]! ^ (crc >>> 8);
    }

    return (crc ^ 0xffffffff) >>> 0;
  }
}
