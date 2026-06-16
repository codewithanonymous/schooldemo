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

// Check RLS on profiles
const rlsRes = await client.query(`
  SELECT relname, relrowsecurity, relforcerowsecurity
  FROM pg_class
  WHERE relname = 'profiles';
`);
console.log('RLS Status:', rlsRes.rows);

// Check Triggers on auth.users or profiles
const trigRes = await client.query(`
  SELECT tgname, tgtype, relname
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  WHERE relname IN ('users', 'profiles');
`);
console.log('Triggers (from pg_trigger):', trigRes.rows);

// Check Foreign Keys on profiles
const fkRes = await client.query(`
  SELECT
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
  FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'profiles';
`);
console.log('Foreign Keys on profiles:', fkRes.rows);

await client.end();
