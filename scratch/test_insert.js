import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');

// Read env
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const dbUrl = env.DATABASE_URL;
const client = new pg.Client({ connectionString: dbUrl });

async function run() {
  try {
    await client.connect();
    console.log("Connected to DB.");

    // Get columns of auth.users
    const { rows: columns } = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users'"
    );
    console.log("auth.users columns:");
    columns.forEach(c => console.log(` - ${c.column_name}: ${c.data_type}`));

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
