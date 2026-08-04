import { NonRealTimeVAD, utils } from '@ricky0123/vad-node';
import { OpusEncoder } from '@discordjs/opus';

async function run() {
  try {
    console.log('VAD loaded successfully!');
    const encoder = new OpusEncoder(16000, 1);
    console.log('Opus loaded successfully!');
  } catch (e) {
    console.error('Failed to load', e);
  }
}
run();
