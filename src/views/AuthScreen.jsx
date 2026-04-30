import { useState } from 'react'
import { School, Mail, Lock, User, Brain, BookOpen, Users, Sparkles, AlertCircle, Loader2, Briefcase, Heart, GraduationCap } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

const ROLES = [
  { value: 'admin',     label: 'Administrator', desc: 'Full system access',           icon: School },
  { value: 'principal', label: 'Principal',     desc: 'School-wide oversight',        icon: Briefcase },
  { value: 'teacher',   label: 'Teacher',       desc: 'Manage your sections',         icon: BookOpen },
  { value: 'nurse',     label: 'Nurse',         desc: 'Health & clinic records',      icon: Heart },
  { value: 'parent',    label: 'Parent',        desc: "View your child's progress",   icon: Users },
  { value: 'student',   label: 'Student',       desc: 'View my own grades',           icon: GraduationCap }
]

export default function AuthScreen() {
  const { signIn, signUp, isDemoMode } = useAuth()
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('teacher')
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null); setInfo(null); setLoading(true)
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password, role)
        if (error) setError(error.message)
      } else {
        if (!fullName.trim()) { setError('Full name is required'); return }
        if (password.length < 6) { setError('Password must be at least 6 characters'); return }
        const { error } = await signUp(email, password, fullName, role)
        if (error) setError(error.message)
        else setInfo('Account created. Check your email to confirm, then sign in.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-brand-700 via-brand-600 to-blue-500 text-white p-12 flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur">
            <School className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Bagong Ilog ES</h1>
            <p className="text-xs text-brand-100">Predictive Analytics Dashboard</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold leading-tight">
              Empowering education through AI-driven insights.
            </h2>
            <p className="text-brand-100 text-sm mt-3 max-w-md">
              Track student performance, predict academic risk, and intervene early — all in one
              modern, secure dashboard.
            </p>
          </div>

          <div className="space-y-3">
            <Feature icon={Brain}     title="Predictive Analytics"   desc="Identify at-risk students before grades slip" />
            <Feature icon={Sparkles}  title="Personalized Recommendations" desc="AI-generated intervention plans per student" />
            <Feature icon={BookOpen}  title="Multi-Purpose Tools"    desc="Grades, attendance, faculty, and reports in one place" />
          </div>
        </div>

        <p className="text-xs text-brand-100">© 2026 Bagong Ilog Elementary School · Pasig City</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-brand-600 text-white flex items-center justify-center">
              <School className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Bagong Ilog ES</h1>
              <p className="text-xs text-slate-500">Predictive Analytics Dashboard</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {mode === 'signin'
              ? 'Sign in to access the school dashboard.'
              : 'Choose your role and create an account to get started.'}
          </p>

          {isDemoMode && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Demo mode</p>
                <p>Supabase isn't configured. Pick a role below and click <b>Sign In</b> with any email/password to preview the dashboard for that role.</p>
              </div>
            </div>
          )}

          {isDemoMode && mode === 'signin' && (
            <div className="mt-4">
              <label className="text-sm font-medium text-slate-700">Preview as…</label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {ROLES.map((r) => {
                  const Icon = r.icon
                  const active = role === r.value
                  return (
                    <button
                      type="button"
                      key={r.value}
                      onClick={() => setRole(r.value)}
                      className={`p-2.5 rounded-lg border-2 text-center transition-all ${
                        active
                          ? 'border-brand-600 bg-brand-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <Icon className={`w-4 h-4 mx-auto mb-1 ${active ? 'text-brand-700' : 'text-slate-500'}`} />
                      <p className={`text-[11px] font-semibold leading-tight ${active ? 'text-brand-700' : 'text-slate-700'}`}>{r.label}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === 'signup' && (
              <>
                <Field label="Full Name" icon={User}>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Maria Santos"
                    className="auth-input"
                    autoComplete="name"
                  />
                </Field>

                <div>
                  <label className="text-sm font-medium text-slate-700">I am a…</label>
                  <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-3">
                    {ROLES.map((r) => {
                      const Icon = r.icon
                      const active = role === r.value
                      return (
                        <button
                          type="button"
                          key={r.value}
                          onClick={() => setRole(r.value)}
                          className={`p-2.5 rounded-lg border-2 text-center transition-all ${
                            active
                              ? 'border-brand-600 bg-brand-50'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <Icon className={`w-4 h-4 mx-auto mb-1 ${active ? 'text-brand-700' : 'text-slate-500'}`} />
                          <p className={`text-[11px] font-semibold leading-tight ${active ? 'text-brand-700' : 'text-slate-700'}`}>{r.label}</p>
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{ROLES.find(r => r.value === role)?.desc}</p>
                </div>
              </>
            )}

            <Field label="Email" icon={Mail}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="auth-input"
                autoComplete="email"
                required
              />
            </Field>

            <Field label="Password" icon={Lock}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="auth-input"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                required
              />
            </Field>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {info && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700">
                {info}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="text-sm text-slate-600 text-center mt-6">
            {mode === 'signin' ? (
              <>Don't have an account?{' '}
                <button onClick={() => { setMode('signup'); setError(null); setInfo(null) }} className="text-brand-700 font-semibold hover:underline">Create one</button>
              </>
            ) : (
              <>Already have an account?{' '}
                <button onClick={() => { setMode('signin'); setError(null); setInfo(null) }} className="text-brand-700 font-semibold hover:underline">Sign in</button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

function Field({ label, icon: Icon, children }) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="mt-1.5 relative">
        <Icon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        {children}
      </div>
    </div>
  )
}

function Feature({ icon: Icon, title, desc }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-sm font-bold">{title}</p>
        <p className="text-xs text-brand-100">{desc}</p>
      </div>
    </div>
  )
}
