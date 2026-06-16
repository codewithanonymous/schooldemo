// supabaseClient.js — kept for compatibility but no longer used for data queries.
// Auth has been migrated to localStorage-based mock auth.
// Remove this file once Supabase is fully decommissioned.

export const supabase = {
  from: () => ({ select: () => Promise.resolve({ data: [], error: null }), insert: () => Promise.resolve({ data: null, error: null }), update: () => Promise.resolve({ data: null, error: null }), delete: () => Promise.resolve({ data: null, error: null }) }),
  auth: { getSession: () => Promise.resolve({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }) },
  rpc: () => Promise.resolve({ data: null, error: null }),
  functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
}
