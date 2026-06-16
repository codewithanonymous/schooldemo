// Define a dummy WebSocket class globally to prevent Node.js 20 Realtime WebSocket error
global.WebSocket = class DummyWebSocket {};

import { createClient } from '@supabase/supabase-js';
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

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Error: Supabase URL or Anon Key is missing in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
});

async function checkAdmin() {
  console.log("=========================================");
  console.log("DIAGNOSING ADMIN LOGIN ON SUPABASE...");
  console.log("=========================================");
  
  // 1. Check direct login
  console.log("\nStep 1: Attempting direct login as admin@example.com...");
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'admin@example.com',
    password: '12345678'
  });

  if (signInError) {
    console.log("❌ Direct login failed:", signInError.message);
    
    // 2. Try to signup
    console.log("\nStep 2: Account doesn't exist. Attempting SignUp / Registration...");
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
      console.error("❌ SignUp failed:", signUpError.message);
      return;
    }

    const userId = signUpData.user?.id;
    console.log("✔ Auth SignUp successful! New User ID:", userId);

    // 3. Insert Admin row
    console.log("\nStep 3: Checking and inserting Admin database row...");
    const { data: existingProfile } = await supabase.from('Admin').select('*').eq('id', userId).maybeSingle();
    if (existingProfile) {
      console.log("✔ Admin database profile already exists:", existingProfile);
    } else {
      const { error: dbError } = await supabase.from('Admin').insert({
        id: userId,
        username: 'admin'
      });

      if (dbError) {
        console.error("❌ Database profile insertion failed:", dbError.message);
        console.error("Full database error details:", dbError);
      } else {
        console.log("✔ Admin database profile created successfully!");
      }
    }

    // 4. Retry login
    console.log("\nStep 4: Retrying login...");
    const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
      email: 'admin@example.com',
      password: '12345678'
    });

    if (retryError) {
      console.error("❌ Retry login failed:", retryError.message);
    } else {
      console.log("🎉 SUCCESS: Admin logged in successfully!");
      console.log("User metadata role:", retryData.user.user_metadata?.role);
    }
  } else {
    console.log("✔ Direct login succeeded!");
    console.log("User ID:", signInData.user.id);
    console.log("User role:", signInData.user.user_metadata?.role);
    
    // Check if profile exists in DB
    const { data: dbAdmin, error: dbErr } = await supabase
      .from('Admin')
      .select('*')
      .eq('id', signInData.user.id)
      .maybeSingle();
      
    if (dbErr) {
      console.error("❌ Failed to query database Admin table:", dbErr.message);
    } else if (!dbAdmin) {
      console.log("⚠️ DB profile is missing! Creating it now...");
      const { error: insertErr } = await supabase.from('Admin').insert({
        id: signInData.user.id,
        username: 'admin'
      });
      if (insertErr) {
        console.error("❌ Failed to insert missing Admin profile:", insertErr.message);
      } else {
        console.log("✔ Missing Admin profile inserted successfully!");
      }
    } else {
      console.log("✔ Admin DB profile verified in the 'Admin' table.");
    }
  }
}

checkAdmin();
