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

async function checkDb() {
  console.log("Connecting to Database using DATABASE_URL...")
  try {
    await client.connect()
    console.log("Connected successfully!")
    
    // Select all profiles
    const { rows: profiles } = await client.query("SELECT * FROM public.profiles")
    console.log("All profiles:")
    console.log(JSON.stringify(profiles, null, 2))

    // Select auth users
    try {
      const { rows: users } = await client.query("SELECT id, email, encrypted_password, role, raw_user_meta_data FROM auth.users")
      console.log("Auth users:")
      console.log(JSON.stringify(users, null, 2))
    } catch (authErr) {
      console.warn("Could not query auth.users directly:", authErr.message)
    }
  } catch (err) {
    console.error("DB connection/query failed:", err)
  } finally {
    await client.end()
  }
}

checkDb()
