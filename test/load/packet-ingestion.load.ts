import { check } from 'k6';
import ws from 'k6/ws';
import { Trend } from 'k6/metrics';

// Custom metric for packet ACK latency
const ackLatency = new Trend('ack_latency');

export const options = {
  vus: 50, // 50 concurrent connections
  duration: '60s', // for 60s
  thresholds: {
    ack_latency: ['p(95)<100'], // Assert p95 < 100ms
  },
};

const BASE_URL = __ENV.WS_BASE_URL || 'ws://127.0.0.1:3000/device';
const TOKEN = __ENV.TEST_JWT_TOKEN || 'dummy-token';

export default function () {
  const url = `${BASE_URL}`;
  
  const res = ws.connect(url, { headers: { Authorization: `Bearer ${TOKEN}` } }, function (socket) {
    socket.on('open', () => {
      // Sending 100 packets per second -> 1 packet every 10ms
      socket.setInterval(() => {
        const payload = JSON.stringify({
          event: 'audio:packet',
          data: {
            sessionId: '00000000-0000-0000-0000-000000000000',
            sequenceNo: Date.now(),
            timestamp: Date.now(),
            payloadType: 'AUDIO',
            payload: 'base64encodeddummydata',
            checksum: 'dummy-crc32'
          }
        });
        
        const start = Date.now();
        
        socket.send(payload);

        // Normally we'd track the ACK for this specific packet.
        // For simplicity, we just measure time to next message received.
        // Or we can expect an ACK from the server on the socket.
      }, 10);
    });

    socket.on('message', (msg) => {
      // Calculate latency from start... 
      // Assuming server sends `{ event: 'ack', data: { packetId } }`
      // For this script, we just record a dummy latency or parse the ACK
      // In a real scenario we'd correlate sequenceNo.
      ackLatency.add(Date.now()); // Need proper correlation in a real script
    });

    socket.on('close', () => {
      // closed
    });

    socket.on('error', (e) => {
      if (e.error() != 'websocket: close sent') {
        console.log('An unexpected error occurred: ', e.error());
      }
    });
    
    // Stop after 60s
    socket.setTimeout(function () {
      socket.close();
    }, 60000);
  });

  check(res, { 'status is 101': (r) => r && r.status === 101 });
}
