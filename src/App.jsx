import React from 'react'
import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Sidebar from './components/Sidebar'
import Navbar from './components/Navbar'

// Pages
import LoginPage from './pages/LoginPage'
import AdminDashboard from './pages/admin/Dashboard'
import TeacherDashboard from './pages/teacher/TeacherDashboard'
import StudentDashboard from './pages/student/StudentDashboard'
import ParentDashboard from './pages/parent/ParentDashboard'
import Teachers from './pages/admin/Teachers'
import Students from './pages/admin/Students'
import Parents from './pages/admin/Parents'
import Classes from './pages/admin/Classes'
import Subjects from './pages/admin/Subjects'
import Exams from './pages/admin/Exams'
import AnnouncementsPage from './pages/admin/Announcements'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import Testing from './pages/Testing'
import SchemaChecker from './pages/SchemaChecker'
import Dashboard from './pages/Dashboard'

const Layout = () => {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <div className="page-container">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

const HomeRedirect = () => {
  const { role } = useAuth()
  if (role === 'super_admin') return <Navigate to="/admin" replace />
  if (role === 'admin') return <Navigate to="/admin" replace />
  if (role === 'teacher') return <Navigate to="/teacher" replace />
  if (role === 'student') return <Navigate to="/student" replace />
  if (role === 'parent') return <Navigate to="/parent" replace />
  if (role === 'user') return <Navigate to="/dashboard" replace />
  return <Navigate to="/login" replace />
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<LoginPage />} />
          {import.meta.env.DEV && <Route path="/testing" element={<Testing />} />}
          {import.meta.env.DEV && <Route path="/schema-checker" element={<SchemaChecker />} />}

          {/* Protected Portal Layout */}
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            {/* Decides which dashboard to show based on user role */}
            <Route index element={<HomeRedirect />} />

            {/* Dashboards */}
            <Route path="admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="dashboard" element={<ProtectedRoute allowedRoles={['user']}><Dashboard /></ProtectedRoute>} />
            <Route path="teacher" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />
            <Route path="student" element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} />
            <Route path="parent" element={<ProtectedRoute allowedRoles={['parent']}><ParentDashboard /></ProtectedRoute>} />

            {/* CRUD Resource Lists */}
            <Route path="list/teachers" element={<ProtectedRoute allowedRoles={['admin', 'teacher']}><Teachers /></ProtectedRoute>} />
            <Route path="list/students" element={<ProtectedRoute allowedRoles={['admin', 'teacher']}><Students /></ProtectedRoute>} />
            <Route path="list/parents" element={<ProtectedRoute allowedRoles={['admin', 'teacher']}><Parents /></ProtectedRoute>} />
            <Route path="list/classes" element={<ProtectedRoute allowedRoles={['admin', 'teacher']}><Classes /></ProtectedRoute>} />
            <Route path="list/subjects" element={<ProtectedRoute allowedRoles={['admin']}><Subjects /></ProtectedRoute>} />
            <Route path="list/exams" element={<ProtectedRoute allowedRoles={['admin', 'teacher', 'student', 'parent']}><Exams /></ProtectedRoute>} />
            <Route path="list/announcements" element={<ProtectedRoute allowedRoles={['admin', 'teacher', 'student', 'parent']}><AnnouncementsPage /></ProtectedRoute>} />

            {/* General Pages */}
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
