const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://postgres:1234@localhost:5432/jabelpin'
});

async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT sequence_no, length(payload), substring(payload::text from 1 for 20) as preview 
    FROM audio_packets 
    WHERE session_id = 'fa44e84e-34d7-4ec6-a425-c562bd8263b9' 
    ORDER BY sequence_no ASC 
    LIMIT 10
  `);
  console.table(res.rows);
  await client.end();
}

run().catch(console.error);
