/**
 * adminUserService.js
 *
 * Secure user creation via Supabase Edge Function.
 * The service_role key NEVER touches the browser.
 * Role and school assignment happen server-side only.
 */

import { supabase } from './supabaseClient'

/**
 * Create a new school user (teacher, student, parent, or admin).
 * Only callable by admin or super_admin (enforced in Edge Function).
 *
 * @param {{
 *   email:     string,
 *   password:  string,
 *   role:      'admin'|'teacher'|'student'|'parent',
 *   name:      string,
 *   surname:   string,
 *   username:  string,
 *   school_id?: string   // defaults to caller's school; super_admin must provide
 * }} params
 * @returns {Promise<{ user_id: string, role: string, school_id: string }>}
 */
export async function createSchoolUser(params) {
  const { data, error } = await supabase.functions.invoke('create-user', {
    body: params
  })

  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)

  return data
}

/**
 * Promote an existing user to a new role.
 * Only callable by admin (within own school) or super_admin.
 *
 * @param {{ user_id: string, new_role: string, school_id?: string }} params
 */
export async function promoteUser({ user_id, new_role, school_id = null }) {
  const { data, error } = await supabase.rpc('promote_user', {
    p_user_id:   user_id,
    p_new_role:  new_role,
    p_school_id: school_id
  })

  if (error) throw new Error(error.message)
  return data
}

/**
 * Bootstrap the first admin for a school.
 * Only works when no admin exists yet for the school, or when called by super_admin.
 *
 * @param {{ user_id: string, school_id: string }} params
 */
export async function bootstrapSchoolAdmin({ user_id, school_id }) {
  const { data, error } = await supabase.rpc('bootstrap_school_admin', {
    p_user_id:   user_id,
    p_school_id: school_id
  })

  if (error) throw new Error(error.message)
  return data
}
