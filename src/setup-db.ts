import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
  console.log('Created pgvector extension successfully.');
  await client.end();
}

run().catch(console.error);
