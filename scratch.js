const fs = require('fs');

function crc32(buffer) {
  let crc = 0;
  for (let i = 0; i < buffer.length; i++) {
    crc ^= buffer[i] << 24;
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

const testBuffer = Buffer.from('OggS\x00\x02\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x01\x13OpusHead\x01\x01\x00\x00\x80\x3e\x00\x00\x00\x00\x00', 'ascii');

// Wait, the crc must be calculated with the checksum bytes set to 0.
console.log(crc32(testBuffer).toString(16));
