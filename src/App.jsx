import React from 'react'
import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom'
import DesktopOnlyGuard from './components/DesktopOnlyGuard'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Sidebar from './components/Sidebar'
import Navbar from './components/Navbar'

// Pages
import LoginPage from './pages/LoginPage'
import AdminDashboard from './pages/admin/Dashboard'
import TeacherDashboard from './pages/teacher/TeacherDashboard'
import TeacherAttendance from './pages/teacher/TeacherAttendance'
import TeacherMarks from './pages/teacher/TeacherMarks'
import TeacherPerformance from './pages/teacher/TeacherPerformance'
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
import StudentCredentials from './pages/admin/StudentCredentials'
import CredentialsManagement from './pages/admin/CredentialsManagement'

// Fee Management Workspace Components
import FeeLayout from './pages/admin/fee/FeeLayout'
import FeeDashboard from './pages/admin/fee/FeeDashboard'
import FeeStructure from './pages/admin/fee/FeeStructure'
import FeeStudents from './pages/admin/fee/FeeStudents'
import FeeCollections from './pages/admin/fee/FeeCollections'
import FeePending from './pages/admin/fee/FeePending'
import FeeTransactions from './pages/admin/fee/FeeTransactions'
import FeeReceipts from './pages/admin/fee/FeeReceipts'
import FeeReports from './pages/admin/fee/FeeReports'


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
    <DesktopOnlyGuard>
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
            <Route path="admin/students" element={<ProtectedRoute allowedRoles={['admin']}><StudentCredentials /></ProtectedRoute>} />
            <Route path="admin/credentials" element={<ProtectedRoute allowedRoles={['admin']}><CredentialsManagement /></ProtectedRoute>} />

            {/* Fee Management Mini-ERP Routing */}
            <Route path="admin/fee" element={<ProtectedRoute allowedRoles={['admin']}><FeeLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<FeeDashboard />} />
              <Route path="structure" element={<FeeStructure />} />
              <Route path="students" element={<FeeStudents />} />
              <Route path="collections" element={<FeeCollections />} />
              <Route path="pending" element={<FeePending />} />
              <Route path="transactions" element={<FeeTransactions />} />
              <Route path="receipts" element={<FeeReceipts />} />
              <Route path="reports" element={<FeeReports />} />
            </Route>
            <Route path="dashboard" element={<ProtectedRoute allowedRoles={['user']}><Dashboard /></ProtectedRoute>} />
            <Route path="teacher" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />
            <Route path="teacher/attendance" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherAttendance /></ProtectedRoute>} />
            <Route path="teacher/marks" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherMarks /></ProtectedRoute>} />
            <Route path="teacher/performance" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherPerformance /></ProtectedRoute>} />
            <Route path="student" element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} />
            <Route path="parent" element={<ProtectedRoute allowedRoles={['parent']}><ParentDashboard /></ProtectedRoute>} />

            {/* CRUD Resource Lists */}
            <Route path="list/teachers" element={<ProtectedRoute allowedRoles={['admin', 'teacher']}><Teachers mode="teachers" /></ProtectedRoute>} />
            <Route path="list/staff" element={<ProtectedRoute allowedRoles={['admin']}><Teachers mode="staff" /></ProtectedRoute>} />
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
    </DesktopOnlyGuard>
  )
}

export default App
