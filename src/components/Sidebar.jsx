import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { 
  Home, 
  Users, 
  GraduationCap, 
  UserSquare2, 
  BookOpen, 
  BookOpenCheck,
  Award, 
  Calendar, 
  Megaphone, 
  User, 
  Settings, 
  LogOut 
} from 'lucide-react'

const Sidebar = () => {
  const { role, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const getHomeLink = () => {
    if (role === 'admin') return '/admin'
    if (role === 'user') return '/dashboard'
    if (role === 'teacher') return '/teacher'
    if (role === 'student') return '/student'
    if (role === 'parent') return '/parent'
    return '/login'
  }

  const menuItems = [
    {
      title: "MENU",
      items: [
        {
          icon: Home,
          label: "Home",
          href: getHomeLink(),
          visible: ["admin", "user", "teacher", "student", "parent"],
        },
        {
          icon: GraduationCap,
          label: "Teachers",
          href: "/list/teachers",
          visible: ["admin", "teacher"],
        },
        {
          icon: Users,
          label: "Students",
          href: "/list/students",
          visible: ["admin", "teacher"],
        },
        {
          icon: UserSquare2,
          label: "Parents",
          href: "/list/parents",
          visible: ["admin", "teacher"],
        },
        {
          icon: BookOpen,
          label: "Subjects",
          href: "/list/subjects",
          visible: ["admin"],
        },
        {
          icon: BookOpenCheck,
          label: "Classes",
          href: "/list/classes",
          visible: ["admin", "teacher"],
        },
        {
          icon: Award,
          label: "Exams",
          href: "/list/exams",
          visible: ["admin", "teacher", "student", "parent"],
        },
        {
          icon: Megaphone,
          label: "Announcements",
          href: "/list/announcements",
          visible: ["admin", "teacher", "student", "parent"],
        },
      ],
    },
    {
      title: "OTHER",
      items: [
        {
          icon: User,
          label: "Profile",
          href: "/profile",
          visible: ["admin", "user", "teacher", "student", "parent"],
        },
        {
          icon: Settings,
          label: "Settings",
          href: "/settings",
          visible: ["admin", "user", "teacher", "student", "parent"],
        },
      ],
    },
  ]

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  return (
    <div className="sidebar">
      <Link to={getHomeLink()} className="sidebar-logo">
        <GraduationCap size={28} />
        <span>SchoolPortal</span>
      </Link>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flexGrow: 1 }}>
        {menuItems.map((group) => (
          <div key={group.title}>
            <div className="sidebar-menu-title">{group.title}</div>
            <ul className="sidebar-menu">
              {group.items.map((item) => {
                if (!item.visible.includes(role)) return null
                const IconComponent = item.icon
                const isActive = location.pathname === item.href

                return (
                  <li key={item.label}>
                    <Link 
                      to={item.href} 
                      className={`sidebar-link ${isActive ? 'active' : ''}`}
                    >
                      <IconComponent size={20} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 'auto' }}>
        <button 
          onClick={handleLogout} 
          className="sidebar-link" 
          style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer' }}
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  )
}

export default Sidebar
