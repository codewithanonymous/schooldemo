import pg from 'pg'
const { Client } = pg

const client = new Client({
  connectionString: 'postgresql://postgres.rgcevwcnzptwmxmqindg:srV7-UukaAVv+6C@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
})

async function main() {
  await client.connect()

  // List tables
  const tables = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
  )
  console.log('\n=== EXISTING TABLES ===')
  tables.rows.forEach(r => console.log(' -', r.table_name))

  // List enums
  const enums = await client.query(`
    SELECT t.typname, e.enumlabel
    FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
    ORDER BY t.typname, e.enumsortorder
  `)
  console.log('\n=== EXISTING ENUMS ===')
  const enumMap = {}
  enums.rows.forEach(r => {
    if (!enumMap[r.typname]) enumMap[r.typname] = []
    enumMap[r.typname].push(r.enumlabel)
  })
  Object.entries(enumMap).forEach(([name, vals]) => console.log(` - ${name}: ${vals.join(', ')}`))

  // List functions
  const funcs = await client.query(`
    SELECT routine_name FROM information_schema.routines
    WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
    ORDER BY routine_name
  `)
  console.log('\n=== EXISTING FUNCTIONS ===')
  funcs.rows.forEach(r => console.log(' -', r.routine_name))

  // Check extensions
  const exts = await client.query(`SELECT extname FROM pg_extension ORDER BY extname`)
  console.log('\n=== EXTENSIONS ===')
  exts.rows.forEach(r => console.log(' -', r.extname))

  await client.end()
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1) })
