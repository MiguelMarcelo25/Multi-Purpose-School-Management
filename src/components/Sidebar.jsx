import {
  LayoutDashboard, Users, Brain, GraduationCap, CalendarCheck,
  UserCog, FileBarChart, Bell, Settings, School, ClipboardList, Heart, User
} from 'lucide-react'

const NAV = [
  { id: 'dashboard',  label: 'Dashboard',           icon: LayoutDashboard },
  { id: 'myprogress', label: 'My Progress',         icon: User },
  { id: 'students',   label: 'Students',            icon: Users },
  { id: 'enrollment', label: 'Enrollment',          icon: ClipboardList },
  { id: 'predictive', label: 'Predictive Analytics',icon: Brain },
  { id: 'academics',  label: 'Academic Performance',icon: GraduationCap },
  { id: 'attendance', label: 'Attendance',          icon: CalendarCheck },
  { id: 'health',     label: 'Health Records',      icon: Heart },
  { id: 'teachers',   label: 'Teachers',            icon: UserCog },
  { id: 'reports',    label: 'Reports',             icon: FileBarChart },
  { id: 'alerts',     label: 'Alerts',              icon: Bell },
  { id: 'settings',   label: 'Settings',            icon: Settings }
]

export default function Sidebar({ active, onNavigate, allowed }) {
  const items = allowed ? NAV.filter((n) => allowed.includes(n.id)) : NAV

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-slate-200 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow">
          <School className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-slate-900 leading-tight">Bagong Ilog ES</h1>
          <p className="text-[11px] text-slate-500">Predictive Dashboard</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = active === item.id
          return (
            <div
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </div>
          )
        })}
      </nav>

      <div className="p-3 border-t border-slate-200">
        <div className="rounded-lg bg-gradient-to-br from-brand-50 to-blue-50 p-3 border border-brand-100">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-4 h-4 text-brand-700" />
            <span className="text-xs font-semibold text-brand-800">AI Model Active</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-snug">
            Risk model v2.3 — last trained Apr 18, 2026
          </p>
        </div>
      </div>
    </aside>
  )
}
