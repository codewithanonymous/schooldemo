import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext({
  user: null,
  role: null,
  profile: null,      // full profile row: { id, email, role, school_id }
  schoolId: null,     // shortcut: profile.school_id
  loading: true,
  login: async () => {},
  logout: async () => {},
  refreshUser: async () => {}
})

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null)
  const [role, setRole]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [schoolId, setSchoolId] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch profile from DB — role + school_id live here, NOT in localStorage
  const resolveProfile = async (currentUser) => {
    if (!currentUser) {
      setProfile(null)
      setRole(null)
      setSchoolId(null)
      return
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, role, school_id, created_at')
        .eq('id', currentUser.id)
        .maybeSingle()

      if (error) throw error
      setProfile(data)
      setRole(data?.role ?? null)
      setSchoolId(data?.school_id ?? null)
    } catch (err) {
      console.error('[AuthContext] resolveProfile error:', err.message)
      setProfile(null)
      setRole(null)
      setSchoolId(null)
    }
  }

  const handleSession = async (session) => {
    setLoading(true)
    if (session?.user) {
      setUser(session.user)
      await resolveProfile(session.user)
    } else {
      setUser(null)
      setProfile(null)
      setRole(null)
      setSchoolId(null)
    }
    setLoading(false)
  }

  useEffect(() => {
    // Initialize from existing session (handles page refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session)
    })

    // Keep in sync with Supabase auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email, password) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      // Resolve profile immediately so we can return the role to the caller
      // (onAuthStateChange will also fire, but we need the role right now for navigation)
      let resolvedRole = null
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, role, school_id, created_at')
          .eq('id', data.user.id)
          .maybeSingle()

        if (!profileError && profileData) {
          resolvedRole = profileData.role
          setProfile(profileData)
          setRole(profileData.role)
          setSchoolId(profileData.school_id)
          setUser(data.user)
        }
      } catch (_) {
        // profile fetch failed — onAuthStateChange will retry
      }

      setLoading(false)
      return { user: data.user, role: resolvedRole }
    } catch (err) {
      setLoading(false)
      throw err
    }
  }

  const logout = async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.warn('[AuthContext] signOut warning:', err.message)
    } finally {
      setUser(null)
      setProfile(null)
      setRole(null)
      setSchoolId(null)
      setLoading(false)
    }
  }

  const refreshUser = async () => {
    const { data: { user: updatedUser } } = await supabase.auth.getUser()
    if (updatedUser) {
      setUser(updatedUser)
      await resolveProfile(updatedUser)
    }
  }

  return (
    <AuthContext.Provider value={{ user, role, profile, schoolId, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
