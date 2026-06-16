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

console.log('--- Inspecting auth.users columns ---');
const columnsRes = await client.query(`
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'auth' AND table_name = 'users';
`);
console.log(columnsRes.rows.map(c => `${c.column_name} (${c.data_type}, nullable: ${c.is_nullable})`).join('\n'));

console.log('\n--- Inspecting auth.uid() definition ---');
const uidDef = await client.query(`
  SELECT pg_get_functiondef('auth.uid()'::regproc) AS definition;
`);
console.log(uidDef.rows[0]?.definition);

await client.end();
