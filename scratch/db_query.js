import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
if (!dbUrl) {
  console.error("DATABASE_URL not found!");
  process.exit(1);
}

const client = new pg.Client({ connectionString: dbUrl });

async function queryUsers() {
  try {
    await client.connect();
    console.log("Connected to PostgreSQL database successfully.");

    // Query auth.users
    console.log("\n--- Active Auth Users in auth.users ---");
    const { rows: authUsers } = await client.query(
      "SELECT id, email, raw_user_meta_data, created_at, confirmed_at FROM auth.users"
    );
    if (authUsers.length === 0) {
      console.log("No users in auth.users table.");
    } else {
      authUsers.forEach(u => {
        console.log(`- ID: ${u.id} | Email: ${u.email} | Confirmed: ${u.confirmed_at ? 'YES' : 'NO'} | Metadata:`, u.raw_user_meta_data);
      });
    }

    // Query public.Admin
    console.log("\n--- Active Admins in public.Admin ---");
    const { rows: adminProfiles } = await client.query(
      "SELECT id, username FROM public.\"Admin\""
    );
    if (adminProfiles.length === 0) {
      console.log("No profiles in public.Admin table.");
    } else {
      adminProfiles.forEach(p => {
        console.log(`- ID: ${p.id} | Username: ${p.username}`);
      });
    }

    // Query public.Teacher
    console.log("\n--- Active Teachers in public.Teacher ---");
    const { rows: teacherProfiles } = await client.query(
      "SELECT id, username, email FROM public.\"Teacher\""
    );
    if (teacherProfiles.length === 0) {
      console.log("No profiles in public.Teacher table.");
    } else {
      teacherProfiles.forEach(p => {
        console.log(`- ID: ${p.id} | Username: ${p.username} | Email: ${p.email}`);
      });
    }

  } catch (err) {
    console.error("Error running DB query:", err);
  } finally {
    await client.end();
  }
}

queryUsers();
