import { ChecksumUtil } from './checksum.util';

describe('ChecksumUtil', () => {
  it('should calculate valid crc32', () => {
    // Vector from the docstring
    const buf = Buffer.from([0x01, 0x02, 0x03]);
    const crc = ChecksumUtil.calculateCrc32(buf);
    expect(crc).toBe(1438416925);
  });
});
