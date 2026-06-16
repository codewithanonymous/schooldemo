import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

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

async function provision() {
  try {
    await client.connect();
    console.log("Connected to PostgreSQL database successfully.");

    // Enable pgcrypto extension for crypt function
    await client.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");
    console.log("pgcrypto extension checked/installed.");

    const demoUsers = [
      {
        email: 'admin@example.com',
        role: 'admin',
        name: 'Demo',
        surname: 'ADMIN'
      },
      {
        email: 'teacher@example.com',
        role: 'teacher',
        name: 'Demo',
        surname: 'TEACHER'
      },
      {
        email: 'parent@example.com',
        role: 'parent',
        name: 'Demo',
        surname: 'PARENT'
      },
      {
        email: 'student@example.com',
        role: 'student',
        name: 'Demo',
        surname: 'STUDENT'
      }
    ];

    const userIds = {};

    for (const u of demoUsers) {
      console.log(`\nProcessing user: ${u.email}...`);
      
      // Check if user exists in auth.users
      const { rows: existing } = await client.query(
        "SELECT id FROM auth.users WHERE email = $1",
        [u.email]
      );

      let userId;

      if (existing.length > 0) {
        userId = existing[0].id;
        console.log(`User already exists in auth.users with ID: ${userId}. Updating password and metadata...`);
        
        await client.query(
          `UPDATE auth.users SET 
            encrypted_password = crypt('12345678', gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            raw_user_meta_data = $1
           WHERE id = $2`,
          [JSON.stringify({ role: u.role, name: u.name, surname: u.surname }), userId]
        );
      } else {
        userId = crypto.randomUUID();
        console.log(`Creating user in auth.users with ID: ${userId}...`);
        
        await client.query(
          `INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at, is_anonymous
          ) VALUES (
            '00000000-0000-0000-0000-000000000000', $1, 'authenticated', 'authenticated', $2,
            crypt('12345678', gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}', $3,
            now(), now(), false
          )`,
          [userId, u.email, JSON.stringify({ role: u.role, name: u.name, surname: u.surname })]
        );
      }

      userIds[u.role] = userId;
    }

    // Now insert profiles in the public database schema
    console.log("\n=========================================");
    console.log("CREATING PUBLIC PROFILE ENTRIES IN DB...");
    console.log("=========================================");

    // 1. Admin Profile
    const adminId = userIds['admin'];
    const { rows: existingAdmin } = await client.query("SELECT id FROM public.\"Admin\" WHERE id = $1", [adminId]);
    if (existingAdmin.length === 0) {
      console.log("Creating Admin profile in public.Admin...");
      await client.query("INSERT INTO public.\"Admin\" (id, username) VALUES ($1, 'admin')", [adminId]);
    } else {
      console.log("Admin profile already exists.");
    }

    // 2. Teacher Profile
    const teacherId = userIds['teacher'];
    const { rows: existingTeacher } = await client.query("SELECT id FROM public.\"Teacher\" WHERE id = $1", [teacherId]);
    if (existingTeacher.length === 0) {
      console.log("Creating Teacher profile in public.Teacher...");
      await client.query(
        `INSERT INTO public.\"Teacher\" (
          id, username, name, surname, email, address, "bloodType", sex, birthday, "createdAt"
        ) VALUES ($1, 'teacher', 'Demo', 'Teacher', 'teacher@example.com', 'Demo Address', 'A+', 'MALE', '1980-01-01', now())`,
        [teacherId]
      );
    } else {
      console.log("Teacher profile already exists.");
    }

    // 3. Parent Profile
    const parentId = userIds['parent'];
    const { rows: existingParent } = await client.query("SELECT id FROM public.\"Parent\" WHERE id = $1", [parentId]);
    if (existingParent.length === 0) {
      console.log("Creating Parent profile in public.Parent...");
      await client.query(
        `INSERT INTO public.\"Parent\" (
          id, username, name, surname, email, phone, address
        ) VALUES ($1, 'parent', 'Demo', 'Parent', 'parent@example.com', '123456789', 'Demo Address')`,
        [parentId]
      );
    } else {
      console.log("Parent profile already exists.");
    }

    // 4. Student Profile dependencies (Grade & Class)
    console.log("Checking Student Profile dependencies (Grade & Class)...");
    
    // Find or create Grade
    let gradeId;
    const { rows: existingGrades } = await client.query("SELECT id FROM public.\"Grade\" LIMIT 1");
    if (existingGrades.length > 0) {
      gradeId = existingGrades[0].id;
      console.log(`Using existing Grade ID: ${gradeId}`);
    } else {
      console.log("Creating default Grade...");
      const { rows: newGrade } = await client.query("INSERT INTO public.\"Grade\" (level) VALUES (1) RETURNING id");
      gradeId = newGrade[0].id;
      console.log(`Created Grade ID: ${gradeId}`);
    }

    // Find or create Class
    let classId;
    const { rows: existingClasses } = await client.query("SELECT id FROM public.\"Class\" LIMIT 1");
    if (existingClasses.length > 0) {
      classId = existingClasses[0].id;
      console.log(`Using existing Class ID: ${classId}`);
    } else {
      console.log("Creating default Class...");
      const { rows: newClass } = await client.query(
        "INSERT INTO public.\"Class\" (name, capacity, \"gradeId\") VALUES ('DemoClassRef', 30, $1) RETURNING id",
        [gradeId]
      );
      classId = newClass[0].id;
      console.log(`Created Class ID: ${classId}`);
    }

    // Student Profile
    const studentId = userIds['student'];
    const { rows: existingStudent } = await client.query("SELECT id FROM public.\"Student\" WHERE id = $1", [studentId]);
    if (existingStudent.length === 0) {
      console.log("Creating Student profile in public.Student...");
      await client.query(
        `INSERT INTO public.\"Student\" (
          id, username, name, surname, email, address, "bloodType", sex, birthday, "parentId", "classId", "gradeId", "createdAt"
        ) VALUES ($1, 'student', 'Demo', 'Student', 'student@example.com', 'Demo Address', 'O-', 'FEMALE', '2015-01-01', $2, $3, $4, now())`,
        [studentId, parentId, classId, gradeId]
      );
    } else {
      console.log("Student profile already exists.");
    }

    console.log("\n✔ ALL DEMO ACCOUNTS PROVISIONED SUCCESSFULLY DIRECTLY IN THE DATABASE!");

  } catch (err) {
    console.error("Error during provisioning:", err);
  } finally {
    await client.end();
  }
}

provision();
