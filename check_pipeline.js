const { Client } = require('pg');
async function run() {
  const client = new Client({ connectionString: 'postgres://postgres:1234@localhost:5432/jabelpin' });
  await client.connect();
  const res = await client.query("SELECT status, error FROM pipeline_runs WHERE recording_id = 'b9b6e081-aa0b-42c0-8e4f-b43b861a17c2'");
  console.log(res.rows);
  await client.end();
}
run().catch(console.error);
