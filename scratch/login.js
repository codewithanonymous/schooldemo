import { createClient } from '@supabase/supabase-js'
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

globalThis.WebSocket = class {}

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

async function testLogin() {
  const email = 'admin@example.com'
  const password = '12345678'
  console.log(`Attempting to sign in with email: ${email}...`)
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (error) {
    console.error("Login failed with error message:", error.message);
    console.error("Error status:", error.status);
    console.error("Full Error:", JSON.stringify(error, null, 2));
    
    if (error.message?.includes('Invalid login credentials') || error.message?.includes('User not found')) {
      console.log("Admin account not found or has incorrect credentials. Attempting to provision/sign up the admin user...");
      
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
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
      
      console.log("Sign up successful! User ID:", signUpData.user?.id);
      
      // Let's recheck/retry login now
      console.log("Retrying login after sign up...");
      const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (retryError) {
        console.error("Login retry failed:", retryError.message);
        return;
      }
      
      console.log("Login retry successful! User details:");
      console.log(`ID: ${retryData.user.id}`);
      console.log(`Email: ${retryData.user.email}`);
      console.log("Metadata role:", retryData.user.user_metadata?.role);
      return;
    }
    return;
  }
  
  console.log("Login successful! User details:")
  console.log(`ID: ${data.user.id}`)
  console.log(`Email: ${data.user.email}`)
  console.log("Metadata role:", data.user.user_metadata?.role)
  
  // Now fetch profile
  console.log("Retrieving user profile from database...")
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .maybeSingle()
    
  if (profileError) {
    console.error("Error retrieving profile:", profileError.message)
  } else if (profile) {
    console.log("Profile details:")
    console.log(JSON.stringify(profile, null, 2))
  } else {
    console.log("No profile record found in profiles table.")
  }
}

testLogin()
