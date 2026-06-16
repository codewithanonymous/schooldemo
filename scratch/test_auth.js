import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env manually to avoid dependency on dotenv
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      process.env[key] = val;
    }
  });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log("Supabase URL:", supabaseUrl);
console.log("Supabase Key Length:", supabaseAnonKey?.length);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing environment variables!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("1. Attempting sign in with admin@example.com / 12345678...");
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'admin@example.com',
    password: '12345678'
  });

  if (signInError) {
    console.log("Sign in failed as expected on empty DB:", signInError.message);
    
    console.log("2. Attempting auto-provision signup...");
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: 'admin@example.com',
      password: '12345678',
      options: {
        data: {
          role: 'admin',
          name: 'Demo',
          surname: 'ADMIN'
        }
      }
    });

    if (signUpError) {
      console.error("Sign up failed:", signUpError.message);
      return;
    }

    const userId = signUpData.user?.id;
    console.log("Sign up successful! User ID:", userId);

    console.log("3. Inserting Admin profile record in DB...");
    const { error: dbError } = await supabase.from('Admin').insert({
      id: userId,
      username: 'admin'
    });

    if (dbError) {
      console.error("Failed to insert Admin DB profile:", dbError.message);
    } else {
      console.log("Admin DB profile inserted successfully!");
    }

    console.log("4. Retrying sign in...");
    const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
      email: 'admin@example.com',
      password: '12345678'
    });

    if (retryError) {
      console.error("Retry sign in failed:", retryError.message);
    } else {
      console.log("Sign in successful after auto-provisioning!", retryData.user.id);
    }
  } else {
    console.log("Sign in succeeded immediately! User ID:", signInData.user.id);
  }
}

run();
