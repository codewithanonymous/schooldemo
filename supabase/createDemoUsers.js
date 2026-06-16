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

const createUsersSql = `
-- Ensure pgcrypto extension is available
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;

DO $$
BEGIN
  -- Insert auth.users with pre-defined UUIDs (from seed.sql)
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES 
  ('00000000-0000-0000-0000-000000000000', 'a47dbc41-f303-45a8-ad0a-aa592cfbdcef', 'authenticated', 'authenticated', 'admin@example.com', public.crypt('12345678', public.gen_salt('bf')), NOW(), '{"provider": "email", "providers": ["email"]}', '{}', NOW(), NOW(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'cd332a11-15e7-42fe-a1c2-d57d1e28f117', 'authenticated', 'authenticated', 'teacher@example.com', public.crypt('12345678', public.gen_salt('bf')), NOW(), '{"provider": "email", "providers": ["email"]}', '{}', NOW(), NOW(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'f9aeb76e-bd88-49ae-9a82-c3103a95290f', 'authenticated', 'authenticated', 'parent@example.com', public.crypt('12345678', public.gen_salt('bf')), NOW(), '{"provider": "email", "providers": ["email"]}', '{}', NOW(), NOW(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '1435a3f7-f453-41dc-9331-15d98d592196', 'authenticated', 'authenticated', 'student@example.com', public.crypt('12345678', public.gen_salt('bf')), NOW(), '{"provider": "email", "providers": ["email"]}', '{}', NOW(), NOW(), '', '', '', '')
  ON CONFLICT (id) DO UPDATE SET encrypted_password = public.crypt('12345678', public.gen_salt('bf')), email_confirmed_at = NOW();

  -- Insert auth.identities
  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES
  (gen_random_uuid(), 'a47dbc41-f303-45a8-ad0a-aa592cfbdcef', 'a47dbc41-f303-45a8-ad0a-aa592cfbdcef', '{"sub": "a47dbc41-f303-45a8-ad0a-aa592cfbdcef", "email": "admin@example.com"}', 'email', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'cd332a11-15e7-42fe-a1c2-d57d1e28f117', 'cd332a11-15e7-42fe-a1c2-d57d1e28f117', '{"sub": "cd332a11-15e7-42fe-a1c2-d57d1e28f117", "email": "teacher@example.com"}', 'email', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'f9aeb76e-bd88-49ae-9a82-c3103a95290f', 'f9aeb76e-bd88-49ae-9a82-c3103a95290f', '{"sub": "f9aeb76e-bd88-49ae-9a82-c3103a95290f", "email": "parent@example.com"}', 'email', NOW(), NOW(), NOW()),
  (gen_random_uuid(), '1435a3f7-f453-41dc-9331-15d98d592196', '1435a3f7-f453-41dc-9331-15d98d592196', '{"sub": "1435a3f7-f453-41dc-9331-15d98d592196", "email": "student@example.com"}', 'email', NOW(), NOW(), NOW())
  ON CONFLICT DO NOTHING;

END $$;
`;

async function main() {
  try {
    console.log("Connecting to Supabase PostgreSQL database...");
    await client.connect();
    
    console.log("Inserting demo auth.users...");
    await client.query(createUsersSql);
    console.log("Auth users created successfully!");

    console.log("Running seed.sql to populate application data...");
    const seedSqlPath = path.resolve(__dirname, 'seed.sql');
    const seedSql = fs.readFileSync(seedSqlPath, 'utf8');
    await client.query(seedSql);
    console.log("Application data seeded successfully!");

    console.log("Done! You can now log in with the demo credentials.");
  } catch (err) {
    console.error("Error creating demo users or seeding:", err);
  } finally {
    await client.end();
  }
}

main();
