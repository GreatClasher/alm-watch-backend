const { Client } = require('pg');

async function clearDb() {
  const client = new Client({
    connectionString: 'postgres://postgres:1234@localhost:5432/jabelpin'
  });
  
  await client.connect();
  console.log('Connected to DB. Fetching all table names...');
  
  const result = await client.query(`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public';
  `);
  
  const tables = result.rows.map(r => `"${r.tablename}"`);
  
  if (tables.length === 0) {
    console.log('No tables found.');
  } else {
    console.log(`Found ${tables.length} tables. Truncating...`);
    const query = `TRUNCATE TABLE ${tables.join(', ')} CASCADE;`;
    await client.query(query);
    console.log('All data successfully cleared from all tables.');
  }
  
  await client.end();
}

clearDb().catch(console.error);
