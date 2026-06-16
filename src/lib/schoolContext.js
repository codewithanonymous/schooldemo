/**
 * schoolContext.js
 *
 * Convenience helpers for building school-scoped Supabase queries.
 * Import `schoolQuery` and call it with a table name + schoolId to get
 * a pre-filtered query builder. This keeps every query explicitly scoped
 * to the current school — belt-and-suspenders on top of RLS.
 *
 * Usage:
 *   import { schoolQuery } from '../lib/schoolContext'
 *   const { data } = await schoolQuery(supabase, 'teachers', schoolId)
 *     .select('id, name, surname')
 *     .order('surname')
 */

/**
 * Returns a Supabase query builder pre-filtered by school_id.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 * @param {string} table
 * @param {string} schoolId
 */
export function schoolQuery(client, table, schoolId) {
  if (!schoolId) throw new Error(`schoolQuery: schoolId is required for table "${table}"`)
  return client.from(table).select().eq('school_id', schoolId)
}

/**
 * Returns a Supabase insert builder pre-populated with school_id.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 * @param {string} table
 * @param {object|object[]} values
 * @param {string} schoolId
 */
export function schoolInsert(client, table, values, schoolId) {
  if (!schoolId) throw new Error(`schoolInsert: schoolId is required for table "${table}"`)
  const rows = Array.isArray(values) ? values : [values]
  const withSchool = rows.map(r => ({ ...r, school_id: schoolId }))
  return client.from(table).insert(withSchool)
}
