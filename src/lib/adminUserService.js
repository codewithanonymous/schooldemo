/**
 * adminUserService.js — Mock version (no backend needed)
 * User creation is handled in-memory only.
 */
import { genId } from '../data/mockData'

export async function createSchoolUser(params) {
  // Simulate a small delay
  await new Promise(r => setTimeout(r, 500))
  return { user_id: genId('usr'), role: params.role }
}

export async function promoteUser({ user_id, new_role }) {
  await new Promise(r => setTimeout(r, 300))
  return { user_id, new_role }
}

export async function bootstrapSchoolAdmin({ user_id, school_id }) {
  await new Promise(r => setTimeout(r, 300))
  return { user_id, school_id }
}
