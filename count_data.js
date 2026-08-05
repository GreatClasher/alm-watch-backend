const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: 'postgres://postgres:1234@localhost:5432/jabelpin' });
  await client.connect();

  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE';
  `);

  const tables = tablesRes.rows.map(r => r.table_name);
  console.log('Tables:', tables);

  const stats = {};
  for (const table of tables) {
    try {
      // Check if table has a timestamp column
      const colsRes = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = $1;
      `, [table]);
      const columns = colsRes.rows.map(r => r.column_name);

      let timeCol = null;
      if (columns.includes('created_at')) timeCol = 'created_at';
      else if (columns.includes('createdAt')) timeCol = 'createdAt';
      else if (columns.includes('received_at')) timeCol = 'received_at';
      else if (columns.includes('receivedAt')) timeCol = 'receivedAt';

      if (timeCol) {
        const res = await client.query(`SELECT count(*) FROM "${table}" WHERE "${timeCol}" >= NOW() - INTERVAL '2 hours'`);
        const count = parseInt(res.rows[0].count, 10);
        if (count > 0) {
          stats[table] = count;
        }
      } else {
        // Just for raw recordings check, they might not have a created_at column but segments do.
      }
    } catch (e) {
      console.error('Error on table', table, e.message);
    }
  }

  console.log('Data to be deleted (created in last 2 hours):', stats);

  await client.end();
}

main().catch(console.error);
