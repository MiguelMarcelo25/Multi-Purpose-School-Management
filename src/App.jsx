import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { DataProvider, useData } from './context/DataContext.jsx'
import Sidebar from './components/Sidebar.jsx'
import TopBar from './components/TopBar.jsx'
import AuthScreen from './views/AuthScreen.jsx'
import Dashboard from './views/Dashboard.jsx'
import Students from './views/Students.jsx'
import Predictive from './views/Predictive.jsx'
import Academics from './views/Academics.jsx'
import Attendance from './views/Attendance.jsx'
import Teachers from './views/Teachers.jsx'
import Reports from './views/Reports.jsx'
import Alerts from './views/Alerts.jsx'
import Settings from './views/Settings.jsx'
import Enrollment from './views/Enrollment.jsx'
import HealthRecords from './views/HealthRecords.jsx'
import MyProgress from './views/MyProgress.jsx'
import { Loader2, AlertTriangle, Database } from 'lucide-react'

const META = {
  dashboard:  { title: 'Dashboard',             subtitle: 'Real-time overview of school performance and AI-driven insights' },
  myprogress: { title: 'My Progress',           subtitle: 'Your grades, attendance, and personal records' },
  students:   { title: 'Student Management',    subtitle: 'Browse, filter, and review individual student records' },
  enrollment: { title: 'Enrollment',            subtitle: 'Enroll new students, transfer between sections, view section rosters' },
  predictive: { title: 'Predictive Analytics',  subtitle: 'AI-powered risk detection and intervention recommendations' },
  academics:  { title: 'Academic Performance',  subtitle: 'Grade trends, subject-level analysis, and honor roll' },
  attendance: { title: 'Attendance Tracking',   subtitle: 'Daily attendance trends and absentee monitoring' },
  health:     { title: 'Health Records',        subtitle: 'BMI, immunizations, and clinic visit records' },
  teachers:   { title: 'Faculty Management',    subtitle: 'Teacher directory and performance summary' },
  reports:    { title: 'Reports',               subtitle: 'Generated analytics reports and exports' },
  alerts:     { title: 'Alerts & Notifications',subtitle: 'AI-generated warnings and intervention triggers' },
  settings:   { title: 'Settings',              subtitle: 'School profile, model tuning, and notifications' }
}

// Per-role view permissions (matches RLS in supabase/02_policies.sql + 04_policies_new_roles.sql)
const ROLE_VIEWS = {
  admin:     ['dashboard','students','enrollment','predictive','academics','attendance','health','teachers','reports','alerts','settings'],
  principal: ['dashboard','students','enrollment','predictive','academics','attendance','health','teachers','reports','alerts'],
  teacher:   ['dashboard','students','predictive','academics','attendance','reports','alerts'],
  nurse:     ['dashboard','students','health','reports'],
  parent:    ['dashboard','academics','attendance','health','alerts'],
  student:   ['myprogress','academics','attendance','alerts']
}

function ProtectedShell() {
  const { role } = useAuth()
  const allowed = ROLE_VIEWS[role] || ['dashboard']
  const [view, setView] = useState(allowed[0])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const data = useData()

  // Guard against deep linking to unauthorized views
  const safeView = allowed.includes(view) ? view : allowed[0]

  if (data.loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
          <p className="text-sm">Loading school data…</p>
        </div>
      </div>
    )
  }

  if (data.error) {
    return (
      <div className="h-screen flex items-center justify-center p-8">
        <div className="max-w-md bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-2 text-red-700 mb-2">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-bold">Failed to load data</h3>
          </div>
          <p className="text-sm text-red-700">{data.error}</p>
          <p className="text-xs text-slate-600 mt-3">Check your Supabase URL and anon key in <code>.env</code>, or verify the schema has been applied.</p>
        </div>
      </div>
    )
  }

  const render = () => {
    switch (safeView) {
      case 'dashboard':  return <Dashboard onNavigate={setView} />
      case 'myprogress': return <MyProgress />
      case 'students':   return <Students />
      case 'enrollment': return <Enrollment />
      case 'predictive': return <Predictive />
      case 'academics':  return <Academics />
      case 'attendance': return <Attendance />
      case 'health':     return <HealthRecords />
      case 'teachers':   return <Teachers />
      case 'reports':    return <Reports />
      case 'alerts':     return <Alerts />
      case 'settings':   return <Settings />
      default:           return <Dashboard onNavigate={setView} />
    }
  }

  const meta = META[safeView] || META.dashboard

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar
        active={safeView}
        onNavigate={setView}
        allowed={allowed}
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
      />
      <main className="flex-1 min-w-0">
        <TopBar onMenuClick={() => setDrawerOpen(true)} />
        {data.mode === 'mock' && <ModeBanner />}
        {render()}
      </main>
    </div>
  )
}

function ModeBanner() {
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 md:px-8 py-2 flex items-center gap-2 text-xs text-amber-800">
      <Database className="w-3.5 h-3.5" />
      <span><b>Mock data mode.</b> Add Supabase credentials to <code>.env</code> to switch to live database.</span>
    </div>
  )
}

function AuthGate() {
  const { loading, isAuthenticated } = useAuth()

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    )
  }

  if (!isAuthenticated) return <AuthScreen />

  return (
    <DataProvider>
      <ProtectedShell />
    </DataProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  )
}
