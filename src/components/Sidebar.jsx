// src/components/Sidebar.jsx — full rewrite
import { Home, Users, Brain, BookOpen, Calendar, Heart, GraduationCap, Briefcase, FileText, AlertTriangle, Settings as SettingsIcon, School } from 'lucide-react'
import { NavItem, NavGroup } from './ui'

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

export default function Sidebar({ active, onNavigate, allowed, drawerOpen = false, setDrawerOpen }) {
  const groups = ['Overview', 'Records', 'Manage', 'System']

  const handleNavigate = (key) => {
    onNavigate(key)
    if (setDrawerOpen) setDrawerOpen(false)
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
        className={`fixed md:sticky inset-y-0 left-0 top-0 z-50 w-[200px] bg-bi-card border-r border-bi-border h-screen p-3 flex-shrink-0 transition-transform ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex items-center gap-2 px-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-bi-primary-soft text-bi-primary flex items-center justify-center">
            <School className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-bi-text leading-tight">Bagong Ilog</div>
            <div className="text-[10px] text-bi-text-mute">SY 25–26</div>
          </div>
        </div>
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
      </aside>
    </>
  )
}
