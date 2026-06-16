import React, { createContext, useContext, useState, useEffect } from 'react'
import { DEMO_USERS } from '../data/mockData'

const AuthContext = createContext({
  user: null,
  role: null,
  profile: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
})

const STORAGE_KEY = 'school_portal_user'

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null)
  const [role, setRole]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Rehydrate from localStorage on first load
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setUser(parsed)
        setRole(parsed.role)
        setProfile(parsed)
      }
    } catch (_) {
      localStorage.removeItem(STORAGE_KEY)
    } finally {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    setLoading(true)
    try {
      // Simulate a tiny network delay for realism
      await new Promise(r => setTimeout(r, 600))

      const match = DEMO_USERS.find(
        u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
      )

      if (!match) {
        throw new Error('Invalid email or password. Please check the demo credentials below.')
      }

      // Build a user object mimicking the shape the rest of the app expects
      const sessionUser = {
        id:         match.id,
        email:      match.email,
        role:       match.role,
        full_name:  match.name,
        created_at: match.created_at,
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionUser))
      setUser(sessionUser)
      setRole(sessionUser.role)
      setProfile(sessionUser)
      return sessionUser
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
    setRole(null)
    setProfile(null)
  }

  const refreshUser = async () => {
    // No-op for mock auth — user is already in memory
  }

  return (
    <AuthContext.Provider value={{ user, role, profile, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
