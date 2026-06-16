import pg from 'pg';
import fs from 'fs';
import crypto from 'crypto';

// Read .env file to get DATABASE_URL
const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const dbUrl = env.DATABASE_URL;
if (!dbUrl) {
  console.error("Error: DATABASE_URL not found in .env file.");
  process.exit(1);
}

async function verifyAuthAndRLS() {
  const client = new pg.Client({ connectionString: dbUrl });
  console.log("Connecting to the database...");
  await client.connect();
  console.log("Connected successfully.\n");

  const regularUid = crypto.randomUUID();
  const adminUid = crypto.randomUUID();

  const regularEmail = `test_regular_${regularUid.slice(0, 8)}@example.com`;
  const adminEmail = `test_admin_${adminUid.slice(0, 8)}@example.com`;

  console.log("-----------------------------------------------------------------");
  console.log("1. PREPARATION & CLEANUP");
  console.log("-----------------------------------------------------------------");
  // Clean up any existing leftover test entries if any
  await client.query("DELETE FROM auth.users WHERE email LIKE 'test_regular_%@example.com' OR email LIKE 'test_admin_%@example.com'");
  console.log("Cleaned up any previous test users.");
  
  console.log(`Generated Test Regular User UUID: ${regularUid}`);
  console.log(`Generated Test Admin User UUID:   ${adminUid}\n`);

  try {
    console.log("-----------------------------------------------------------------");
    console.log("2. SIMULATING SIGN UP (INSERTING INTO auth.users)");
    console.log("-----------------------------------------------------------------");

    // Insert regular user
    console.log(`Inserting regular user: ${regularEmail}`);
    await client.query(`
      INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role, is_anonymous, is_sso_user)
      VALUES ($1, $2, $3, 'authenticated', 'authenticated', false, false)
    `, [regularUid, regularEmail, JSON.stringify({ role: 'user' })]);
    console.log("Regular user inserted successfully.");

    // Insert admin user
    console.log(`Inserting admin user: ${adminEmail}`);
    await client.query(`
      INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role, is_anonymous, is_sso_user)
      VALUES ($1, $2, $3, 'authenticated', 'authenticated', false, false)
    `, [adminUid, adminEmail, JSON.stringify({ role: 'admin' })]);
    console.log("Admin user inserted successfully.\n");

    console.log("-----------------------------------------------------------------");
    console.log("3. VERIFYING TRIGGER (public.profiles automatic provisioning)");
    console.log("-----------------------------------------------------------------");

    // Fetch corresponding profile for regular user
    const regularProfileRes = await client.query("SELECT * FROM public.profiles WHERE id = $1", [regularUid]);
    if (regularProfileRes.rows.length === 1) {
      const p = regularProfileRes.rows[0];
      console.log(`✔ SUCCESS: Profile automatically created for regular user.`);
      console.log(`  Profile ID: ${p.id}`);
      console.log(`  Profile Email: ${p.email}`);
      console.log(`  Profile Role: ${p.role} (Expected: user)`);
      if (p.role !== 'user') {
        throw new Error(`Invalid role assigned. Expected 'user', got '${p.role}'`);
      }
    } else {
      throw new Error("FAIL: No profile automatically created for regular user.");
    }

    // Fetch corresponding profile for admin user
    const adminProfileRes = await client.query("SELECT * FROM public.profiles WHERE id = $1", [adminUid]);
    if (adminProfileRes.rows.length === 1) {
      const p = adminProfileRes.rows[0];
      console.log(`✔ SUCCESS: Profile automatically created for admin user.`);
      console.log(`  Profile ID: ${p.id}`);
      console.log(`  Profile Email: ${p.email}`);
      console.log(`  Profile Role: ${p.role} (Expected: admin)`);
      if (p.role !== 'admin') {
        throw new Error(`Invalid role assigned. Expected 'admin', got '${p.role}'`);
      }
    } else {
      throw new Error("FAIL: No profile automatically created for admin user.");
    }
    console.log("");

    console.log("-----------------------------------------------------------------");
    console.log("4. TESTING ROW LEVEL SECURITY (RLS) POLICIES");
    console.log("-----------------------------------------------------------------");

    // RLS Policy Test Scenario A: Act as Regular User
    console.log("Scenario A: Acting as REGULAR USER");
    console.log("Executing transaction as Regular User...");
    await client.query("BEGIN");
    
    // Simulate user identity by setting the JWT claims context
    await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify({ sub: regularUid, role: 'authenticated' })
    ]);
    await client.query("SET LOCAL ROLE authenticated");

    // Test A1: Try to read own profile (should succeed)
    console.log("  Test A1: Read own profile...");
    const ownReadRes = await client.query("SELECT * FROM public.profiles WHERE id = $1", [regularUid]);
    console.log(`    Result: Found ${ownReadRes.rows.length} row(s)`);
    if (ownReadRes.rows.length === 1 && ownReadRes.rows[0].id === regularUid) {
      console.log("    ✔ PASSED: Regular user can read their own profile.");
    } else {
      console.error("    ✘ FAILED: Regular user could not read their own profile.");
    }

    // Test A2: Try to read other user's profile directly (should return 0 rows)
    console.log("  Test A2: Read another user's profile...");
    const otherReadRes = await client.query("SELECT * FROM public.profiles WHERE id = $1", [adminUid]);
    console.log(`    Result: Found ${otherReadRes.rows.length} row(s)`);
    if (otherReadRes.rows.length === 0) {
      console.log("    ✔ PASSED: RLS successfully blocked reading another user's profile.");
    } else {
      console.error("    ✘ FAILED: RLS did not block reading another user's profile!");
    }

    // Test A3: Try to read all profiles (should only return own profile)
    console.log("  Test A3: Read all profiles...");
    const allReadRes = await client.query("SELECT * FROM public.profiles");
    console.log(`    Result: Found ${allReadRes.rows.length} row(s)`);
    const containsOthers = allReadRes.rows.some(r => r.id !== regularUid);
    if (!containsOthers) {
      console.log("    ✔ PASSED: Regular user can only see their own profile when querying all profiles.");
    } else {
      console.error("    ✘ FAILED: Regular user could see other profiles when querying all profiles!");
    }

    await client.query("ROLLBACK");
    console.log("Transaction rolled back (regular user context cleared).\n");


    // RLS Policy Test Scenario B: Act as Admin User
    console.log("Scenario B: Acting as ADMIN USER");
    console.log("Executing transaction as Admin User...");
    await client.query("BEGIN");
    
    // Simulate user identity by setting the JWT claims context
    await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify({ sub: adminUid, role: 'authenticated' })
    ]);
    await client.query("SET LOCAL ROLE authenticated");

    // Test B1: Try to read own profile (should succeed)
    console.log("  Test B1: Read own profile...");
    const adminOwnReadRes = await client.query("SELECT * FROM public.profiles WHERE id = $1", [adminUid]);
    console.log(`    Result: Found ${adminOwnReadRes.rows.length} row(s)`);
    if (adminOwnReadRes.rows.length === 1 && adminOwnReadRes.rows[0].id === adminUid) {
      console.log("    ✔ PASSED: Admin user can read their own profile.");
    } else {
      console.error("    ✘ FAILED: Admin user could not read their own profile.");
    }

    // Test B2: Try to read all profiles (should succeed and return all profiles)
    console.log("  Test B2: Read all profiles (Admin bypass check)...");
    const adminAllReadRes = await client.query("SELECT * FROM public.profiles");
    console.log(`    Result: Found ${adminAllReadRes.rows.length} row(s)`);
    
    const hasRegularUser = adminAllReadRes.rows.some(r => r.id === regularUid);
    const hasAdminUser = adminAllReadRes.rows.some(r => r.id === adminUid);
    
    if (hasRegularUser && hasAdminUser) {
      console.log("    ✔ PASSED: Admin user can read all profiles (including other users).");
    } else {
      console.error("    ✘ FAILED: Admin user could not read other profiles!");
    }

    await client.query("ROLLBACK");
    console.log("Transaction rolled back (admin user context cleared).\n");

  } catch (error) {
    console.error("An error occurred during verification:", error);
    try {
      await client.query("ROLLBACK");
    } catch (e) {
      // Ignore rollback errors if not inside an active transaction
    }
  } finally {
    console.log("-----------------------------------------------------------------");
    console.log("5. CLEANUP");
    console.log("-----------------------------------------------------------------");
    console.log("Deleting test users from database...");
    await client.query("DELETE FROM auth.users WHERE id IN ($1, $2)", [regularUid, adminUid]);
    console.log("Test users deleted successfully.");
    
    await client.end();
    console.log("Database connection closed.");
  }
}

verifyAuthAndRLS().catch(console.error);
