const { Client } = require('pg');
const client = new Client({ connectionString: 'postgres://postgres:1234@localhost:5432/jabelpin' });
client.connect()
  .then(() => client.query("SELECT sequence_no FROM recording_segments WHERE recording_id = 'e240132a-c567-4ef6-bd75-ad1fb6f6d409' ORDER BY sequence_no ASC"))
  .then(res => { 
    const seqs = res.rows.map(r => r.sequence_no);
    let gaps = [];
    for (let i = 1; i < seqs.length; i++) {
        if (seqs[i] - seqs[i-1] > 1) {
            gaps.push(`Gap between ${seqs[i-1]} and ${seqs[i]} (missed ${seqs[i] - seqs[i-1] - 1})`);
        }
    }
    console.log(`Total segments: ${seqs.length}`);
    console.log(`Min seq: ${seqs[0]}, Max seq: ${seqs[seqs.length - 1]}`);
    if (gaps.length > 0) {
        console.log('Found gaps:');
        gaps.forEach(g => console.log(g));
    } else {
        console.log('No gaps found!');
    }
    client.end(); 
  });
