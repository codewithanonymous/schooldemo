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

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
});

const domains = [
  'admin@gmail.com',
  'admin@school.com',
  'admin@test.com',
  'admin@example.com'
];

async function testDomains() {
  console.log("Testing which email domains are accepted by your Supabase project...");
  for (const email of domains) {
    console.log(`\nTrying signup for: ${email}`);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: 'lh-TestPassword123!',
      options: {
        data: {
          role: 'admin',
          name: 'Test',
          surname: 'Test'
        }
      }
    });
    if (error) {
      console.log(`❌ Failed: ${error.message}`);
    } else {
      console.log(`✔ Success! Created user: ${data.user?.id}`);
      // Clean up the created user if possible (we can't delete auth users easily without service role, but we know it worked!)
    }
  }
}

testDomains();
