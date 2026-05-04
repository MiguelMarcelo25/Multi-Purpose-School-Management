// src/components/Sidebar.jsx — full rewrite
import {
  Home, Users, Brain, BookOpen, Calendar, Heart, GraduationCap,
  Briefcase, FileText, AlertTriangle, Settings as SettingsIcon, School, LogOut
} from 'lucide-react'
import { NavItem, NavGroup } from './ui'
import { useAuth } from '../context/AuthContext.jsx'

const ITEMS = {
  dashboard:  { icon: Home,         label: 'Dashboard',  group: 'Overview' },
  myprogress: { icon: GraduationCap, label: 'My Progress', group: 'Overview' },
  students:   { icon: Users,        label: 'Students',   group: 'Overview' },
  predictive: { icon: Brain,        label: 'Predictive', group: 'Overview' },
  academics:  { icon: BookOpen,     label: 'Academics',  group: 'Records' },
  attendance: { icon: Calendar,     label: 'Attendance', group: 'Records' },
  health:     { icon: Heart,        label: 'Health',     group: 'Records' },
  enrollment: { icon: Briefcase,    label: 'Enrollment', group: 'Manage' },
  teachers:   { icon: School,       label: 'Teachers',   group: 'Manage' },
  alerts:     { icon: AlertTriangle, label: 'Alerts',     group: 'Manage' },
  reports:    { icon: FileText,     label: 'Reports',    group: 'Manage' },
  settings:   { icon: SettingsIcon, label: 'Settings',   group: 'System' }
}

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function Sidebar({ active, onNavigate, allowed, drawerOpen = false, setDrawerOpen }) {
  const groups = ['Overview', 'Records', 'Manage', 'System']
  const { profile, signOut } = useAuth()

  const handleNavigate = (key) => {
    onNavigate(key)
    if (setDrawerOpen) setDrawerOpen(false)
  }

  const handleSignOut = async () => {
    if (setDrawerOpen) setDrawerOpen(false)
    await signOut()
  }

  return (
    <>
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setDrawerOpen && setDrawerOpen(false)}
        />
      )}
      <aside
        className={`fixed md:sticky inset-y-0 left-0 top-0 z-50 w-[200px] bg-bi-card border-r border-bi-border h-screen flex-shrink-0 transition-transform flex flex-col ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand */}
        <div className="flex items-center gap-2 px-2 m-3 mb-4 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-bi-primary-soft text-bi-primary flex items-center justify-center">
            <School className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-bi-text leading-tight">Bagong Ilog</div>
            <div className="text-[10px] text-bi-text-mute">SY 25–26</div>
          </div>
        </div>

        {/* Nav (scrollable middle) */}
        <nav className="flex-1 overflow-y-auto px-3 min-h-0">
          {groups.map((group) => {
            const items = Object.entries(ITEMS).filter(([key, v]) => v.group === group && allowed.includes(key))
            if (items.length === 0) return null
            return (
              <NavGroup key={group} label={group}>
                {items.map(([key, v]) => (
                  <NavItem
                    key={key}
                    icon={v.icon}
                    label={v.label}
                    active={active === key}
                    onClick={() => handleNavigate(key)}
                  />
                ))}
              </NavGroup>
            )
          })}
        </nav>

        {/* User profile + sign out (sticky bottom) */}
        {profile && (
          <div className="border-t border-bi-border p-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-bi-tint text-bi-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                {getInitials(profile.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-bi-text truncate">{profile.full_name}</div>
                <div className="text-[10px] text-bi-text-mute capitalize">{profile.role}</div>
              </div>
              <button
                onClick={handleSignOut}
                title="Sign out"
                aria-label="Sign out"
                className="p-1.5 rounded text-bi-text-mute hover:text-bi-bad hover:bg-bi-bad-soft transition-colors flex-shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
