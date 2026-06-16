import pg from 'pg';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const client = new pg.Client({ connectionString: env.DATABASE_URL });
await client.connect();

const migrationSql = fs.readFileSync('supabase/01_create_profiles_table.sql', 'utf8');
console.log('Executing migration SQL...');
await client.query(migrationSql);
console.log('Migration SQL executed successfully!');

await client.end();
