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

      // 1. Try to match DEMO_USERS first (including admin, demo student, demo teacher, demo parent)
      let match = DEMO_USERS.find(
        u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
      )

      let sessionUser = null;

      if (match) {
        sessionUser = {
          id:         match.id,
          email:      match.email,
          role:       match.role,
          full_name:  match.name,
          created_at: match.created_at,
        };
      } else {
        // 2. Try to match students in erp_students from localStorage
        try {
          const storedStudents = localStorage.getItem('erp_students');
          if (storedStudents) {
            const students = JSON.parse(storedStudents);
            const studentMatch = students.find(s => 
              (s.admission_number?.toLowerCase() === email.toLowerCase() || 
               s.username?.toLowerCase() === email.toLowerCase() || 
               s.email?.toLowerCase() === email.toLowerCase()) && 
              s.password === password
            );
            if (studentMatch) {
              sessionUser = {
                id:         studentMatch.id,
                email:      studentMatch.email || `${studentMatch.username}@school.com`,
                role:       'student',
                full_name:  `${studentMatch.name} ${studentMatch.surname}`,
                created_at: studentMatch.admission_date || new Date().toISOString(),
              };
            }
          }
        } catch (e) {
          console.error("Student login match error", e);
        }

        // 3. Try to match teachers/staff in erp_staff_list from localStorage
        if (!sessionUser) {
          try {
            const storedStaff = localStorage.getItem('erp_staff_list');
            if (storedStaff) {
              const staff = JSON.parse(storedStaff);
              const teacherMatch = staff.find(t => 
                (t.employee_id?.toLowerCase() === email.toLowerCase() || 
                 t.username?.toLowerCase() === email.toLowerCase() || 
                 t.email?.toLowerCase() === email.toLowerCase()) && 
                t.password === password
              );
              if (teacherMatch) {
                sessionUser = {
                  id:         teacherMatch.id,
                  email:      teacherMatch.email || `${teacherMatch.username}@school.com`,
                  role:       'teacher',
                  full_name:  `${teacherMatch.name} ${teacherMatch.surname}`,
                  created_at: teacherMatch.joining_date || new Date().toISOString(),
                };
              }
            }
          } catch (e) {
            console.error("Teacher login match error", e);
          }
        }
      }

      if (!sessionUser) {
        throw new Error('Invalid email, username, or password. Please verify your credentials.')
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
