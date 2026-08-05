const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: 'postgres://postgres:1234@localhost:5432/jabelpin' });
  await client.connect();

  try {
    // Delete older pipeline runs that reference the recordings we want to delete
    await client.query(`DELETE FROM pipeline_runs WHERE recording_id IN (SELECT id FROM recordings WHERE created_at >= NOW() - INTERVAL '2 hours')`);
    await client.query(`DELETE FROM recordings WHERE created_at >= NOW() - INTERVAL '2 hours'`);
    await client.query(`DELETE FROM speakers WHERE created_at >= NOW() - INTERVAL '2 hours'`);
    await client.query(`DELETE FROM devices WHERE created_at >= NOW() - INTERVAL '2 hours'`);
    console.log('Final cleanup completed successfully.');
  } catch (e) {
    console.error('Error during final cleanup:', e.message);
  }

  await client.end();
}

main().catch(console.error);
