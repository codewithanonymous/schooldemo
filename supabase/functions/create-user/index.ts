/**
 * Supabase Edge Function: create-user
 *
 * Replaces the old pattern of calling supabase.auth.signUp() from the browser
 * with a role injected in options.data (which was the critical security hole).
 *
 * This function:
 *   1. Verifies the caller is an admin (via their JWT → profiles check)
 *   2. Uses the service_role key to call supabase.auth.admin.createUser()
 *   3. Calls set_user_profile() RPC to assign role + school_id + role table row
 *
 * Deploy: supabase functions deploy create-user
 * Env vars needed in Supabase dashboard:
 *   SUPABASE_URL            (auto-injected)
 *   SUPABASE_ANON_KEY       (auto-injected)
 *   SUPABASE_SERVICE_ROLE_KEY  ← set this in Functions → Secrets
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // -------------------------------------------------------------------------
    // 1. Extract caller JWT (anon key client — used to verify caller identity)
    // -------------------------------------------------------------------------
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return Response.json({ error: 'Missing Authorization header' }, { status: 401, headers: corsHeaders })
    }

    // Client scoped to the calling user's JWT
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    // Verify caller is authenticated and is admin/super_admin
    const { data: { user: callerUser }, error: callerErr } = await callerClient.auth.getUser()
    if (callerErr || !callerUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
    }

    const { data: callerProfile, error: profileErr } = await callerClient
      .from('profiles')
      .select('role, school_id')
      .eq('id', callerUser.id)
      .single()

    if (profileErr || !callerProfile) {
      return Response.json({ error: 'Could not verify caller profile' }, { status: 403, headers: corsHeaders })
    }

    if (!['admin', 'super_admin'].includes(callerProfile.role)) {
      return Response.json({ error: 'Permission denied: only admin or super_admin can create users' }, { status: 403, headers: corsHeaders })
    }

    // -------------------------------------------------------------------------
    // 2. Parse and validate request body
    // -------------------------------------------------------------------------
    const body = await req.json()
    const { email, password, role, name, surname, username, school_id } = body

    if (!email || !password || !role || !name || !surname || !username) {
      return Response.json({ error: 'Missing required fields: email, password, role, name, surname, username' }, { status: 400, headers: corsHeaders })
    }

    if (!['admin', 'teacher', 'student', 'parent'].includes(role)) {
      return Response.json({ error: 'Invalid role. Must be admin, teacher, student, or parent' }, { status: 400, headers: corsHeaders })
    }

    // Resolve target school_id
    const targetSchoolId: string = school_id ?? callerProfile.school_id
    if (!targetSchoolId && role !== 'super_admin') {
      return Response.json({ error: 'school_id is required' }, { status: 400, headers: corsHeaders })
    }

    // Admin can only create users in their own school
    if (callerProfile.role === 'admin' && targetSchoolId !== callerProfile.school_id) {
      return Response.json({ error: 'Admin can only create users in their own school' }, { status: 403, headers: corsHeaders })
    }

    if (password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400, headers: corsHeaders })
    }

    // -------------------------------------------------------------------------
    // 3. Create auth user via Admin API (service_role key — NEVER exposed to browser)
    // -------------------------------------------------------------------------
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,         // admin-created accounts are pre-confirmed
      user_metadata: { name, surname }  // metadata only — NOT used for role assignment
    })

    if (createErr || !newUser?.user) {
      return Response.json({ error: createErr?.message ?? 'Failed to create auth user' }, { status: 400, headers: corsHeaders })
    }

    const newUserId = newUser.user.id

    // -------------------------------------------------------------------------
    // 4. Provision profile + role-specific row via DB function (caller JWT)
    // -------------------------------------------------------------------------
    const { data: profileData, error: profileSetErr } = await callerClient.rpc('set_user_profile', {
      p_user_id:   newUserId,
      p_email:     email,
      p_role:      role,
      p_school_id: targetSchoolId,
      p_name:      name,
      p_surname:   surname,
      p_username:  username
    })

    if (profileSetErr) {
      // Rollback: delete the auth user we just created to avoid orphaned accounts
      await adminClient.auth.admin.deleteUser(newUserId)
      return Response.json({ error: profileSetErr.message }, { status: 400, headers: corsHeaders })
    }

    return Response.json(
      { success: true, user_id: newUserId, role, school_id: targetSchoolId },
      { status: 201, headers: corsHeaders }
    )

  } catch (err) {
    console.error('[create-user]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders })
  }
})
