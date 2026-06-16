import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
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

const client = new pg.Client({ connectionString: env.DATABASE_URL })

async function inspectTriggers() {
  console.log("Connecting to PostgreSQL...")
  try {
    await client.connect()
    
    // Query all triggers on auth schema or public schema related to auth
    console.log("--- TRIGGERS on auth.users ---")
    const { rows: authTriggers } = await client.query(`
      SELECT 
        tgname AS trigger_name,
        relname AS table_name,
        proname AS function_name
      FROM pg_trigger
      JOIN pg_class ON pg_class.oid = tgrelid
      JOIN pg_namespace ON pg_namespace.oid = relnamespace
      JOIN pg_proc ON pg_proc.oid = tgfoid
      WHERE nspname = 'auth' AND relname = 'users';
    `)
    console.log(JSON.stringify(authTriggers, null, 2))

    console.log("--- TRIGGERS on public.profiles ---")
    const { rows: profileTriggers } = await client.query(`
      SELECT 
        tgname AS trigger_name,
        relname AS table_name,
        proname AS function_name
      FROM pg_trigger
      JOIN pg_class ON pg_class.oid = tgrelid
      JOIN pg_namespace ON pg_namespace.oid = relnamespace
      JOIN pg_proc ON pg_proc.oid = tgfoid
      WHERE nspname = 'public' AND relname = 'profiles';
    `)
    console.log(JSON.stringify(profileTriggers, null, 2))

    // Query active postgres backend errors or status if available
    console.log("--- PG STAT ACTIVITY ---")
    const { rows: activity } = await client.query(`
      SELECT pid, state, query, wait_event_type, wait_event 
      FROM pg_stat_activity 
      WHERE state IS NOT NULL AND query NOT LIKE '%pg_stat_activity%'
      LIMIT 10;
    `)
    console.log(JSON.stringify(activity, null, 2))

  } catch (err) {
    console.error("Query failed:", err)
  } finally {
    await client.end()
  }
}

inspectTriggers()
