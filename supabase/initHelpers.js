import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load environment variables
const envPath = path.resolve(__dirname, '../.env')
const envContent = fs.readFileSync(envPath, 'utf8')
const env = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
  if (match) {
    let value = match[2] ? match[2].trim() : ''
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1)
    env[match[1]] = value
  }
})

const dbUrl = env.DATABASE_URL
if (!dbUrl) {
  console.error("Error: DATABASE_URL not found in .env file.")
  process.exit(1)
}

const client = new pg.Client({ connectionString: dbUrl })

const sql = `
-- Create SchemaMigrationHistory table
CREATE TABLE IF NOT EXISTS "SchemaMigrationHistory" (
  "id" serial PRIMARY KEY,
  "timestamp" timestamp with time zone DEFAULT now(),
  "sql" text NOT NULL,
  "success" boolean NOT NULL,
  "error" text,
  "before_snapshot" jsonb,
  "after_snapshot" jsonb
);

-- Disable RLS on history table for dev queries
ALTER TABLE IF EXISTS "SchemaMigrationHistory" DISABLE ROW LEVEL SECURITY;

-- Function to inspect schema
CREATE OR REPLACE FUNCTION inspect_schema()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tables_json jsonb;
  columns_json jsonb;
  fkeys_json jsonb;
  policies_json jsonb;
  migrations_json jsonb;
BEGIN
  -- Fetch tables
  SELECT jsonb_agg(jsonb_build_object('table_name', table_name)) INTO tables_json
  FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

  -- Fetch columns
  SELECT jsonb_agg(jsonb_build_object(
    'table_name', table_name,
    'column_name', column_name,
    'data_type', data_type,
    'is_nullable', is_nullable,
    'column_default', column_default
  )) INTO columns_json
  FROM information_schema.columns
  WHERE table_schema = 'public';

  -- Fetch foreign keys
  SELECT jsonb_agg(jsonb_build_object(
    'table_name', tc.table_name,
    'column_name', kcu.column_name,
    'foreign_table_name', ccu.table_name,
    'foreign_column_name', ccu.column_name
  )) INTO fkeys_json
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';

  -- Fetch RLS policies
  SELECT jsonb_agg(jsonb_build_object(
    'schemaname', schemaname,
    'tablename', tablename,
    'policyname', policyname,
    'permissive', permissive,
    'roles', roles,
    'cmd', cmd,
    'qual', qual,
    'with_check', with_check
  )) INTO policies_json
  FROM pg_policies
  WHERE schemaname = 'public';

  -- Fetch migrations
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'SchemaMigrationHistory') THEN
    SELECT jsonb_agg(jsonb_build_object(
      'id', id,
      'timestamp', timestamp,
      'sql', sql,
      'success', success,
      'error', error
    ) ORDER BY timestamp DESC) INTO migrations_json
    FROM "SchemaMigrationHistory";
  ELSE
    migrations_json := '[]'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'tables', COALESCE(tables_json, '[]'::jsonb),
    'columns', COALESCE(columns_json, '[]'::jsonb),
    'fkeys', COALESCE(fkeys_json, '[]'::jsonb),
    'policies', COALESCE(policies_json, '[]'::jsonb),
    'migrations', COALESCE(migrations_json, '[]'::jsonb)
  );
END;
$$;

-- Function to execute SQL
CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_query;
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
`

async function main() {
  try {
    console.log("Connecting to Supabase PostgreSQL database...")
    await client.connect()
    console.log("Connected. Deploying inspect_schema, exec_sql, and SchemaMigrationHistory table...")
    await client.query(sql)
    console.log("Deployment successful!")
  } catch (err) {
    console.error("Deployment failed:", err)
  } finally {
    await client.end()
  }
}

main()
