const { Client } = require('pg');
const client = new Client({ connectionString: 'postgres://postgres:1234@localhost:5432/jabelpin' });
client.connect()
  .then(() => client.query("SELECT sequence_no FROM recording_segments WHERE recording_id = 'e240132a-c567-4ef6-bd75-ad1fb6f6d409' ORDER BY sequence_no ASC"))
  .then(res => { 
    console.log(res.rows.map(r => r.sequence_no).join(', '));
    client.end(); 
  });
