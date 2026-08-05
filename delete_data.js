const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: 'postgres://postgres:1234@localhost:5432/jabelpin' });
  await client.connect();

  const timeFilter = ` >= NOW() - INTERVAL '2 hours' `;

  try {
    const tables = [
      'episode_artifacts',
      'episodes',
      'observations',
      'memories',
      'conversations',
      'pipeline_runs',
      'recording_segments',
      'recordings',
      'speakers',
      'devices'
    ];

    for (const table of tables) {
      if (table === 'recording_segments') {
        const res = await client.query(`DELETE FROM recording_segments`);
        console.log(`Deleted ${res.rowCount} rows from recording_segments (ALL raw recordings)`);
        continue;
      }
      
      const colsRes = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1`, [table]);
      const columns = colsRes.rows.map(r => r.column_name);

      let timeCol = null;
      if (columns.includes('created_at')) timeCol = 'created_at';
      else if (columns.includes('createdAt')) timeCol = 'createdAt';
      else if (columns.includes('received_at')) timeCol = 'received_at';
      
      if (timeCol) {
        const res = await client.query(`DELETE FROM ${table} WHERE ${timeCol} ${timeFilter}`);
        console.log(`Deleted ${res.rowCount} rows from ${table}`);
      }
    }

    console.log('Cleanup completed successfully.');
  } catch (e) {
    console.error('Error during cleanup:', e);
  }

  await client.end();
}

main().catch(console.error);
