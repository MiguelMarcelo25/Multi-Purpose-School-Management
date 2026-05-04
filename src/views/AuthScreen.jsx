import { useState } from 'react'
import { School, Mail, Lock, User, AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

const ROLES = [
  { value: 'admin',     label: 'Administrator' },
  { value: 'principal', label: 'Principal' },
  { value: 'teacher',   label: 'Teacher' },
  { value: 'nurse',     label: 'Nurse' },
  { value: 'parent',    label: 'Parent' },
  { value: 'student',   label: 'Student' }
]

export default function AuthScreen() {
  const { signIn, signUp, isDemoMode } = useAuth()
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  // Default role: admin (sensible first-user default; sign-up offers a select)
  const [role, setRole] = useState('admin')
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

  const inputBase =
    "w-full text-sm bg-bi-card border border-bi-border rounded-md py-2.5 " +
    "text-bi-text placeholder:text-bi-text-mute " +
    "transition-colors duration-150 ease-out " +
    "focus:outline-none focus:ring-2 focus:ring-bi-primary/20 focus:border-bi-primary"
  const inputWithIcon = `${inputBase} pl-9 pr-3`
  const inputPlain = `${inputBase} px-3`

  return (
    <div className="min-h-screen flex flex-col bg-bi-bg">
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[440px]">
          {/* Brand mark */}
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-bi-primary-soft flex items-center justify-center">
              <School className="w-6 h-6 text-bi-primary" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight text-bi-text">
              Bagong Ilog ES
            </h1>
            <p className="mt-1 text-sm text-bi-text-mute">
              Predictive Analytics Dashboard
            </p>
          </div>

          {/* Demo-mode notice (no role grid; a sensible default is used) */}
          {isDemoMode && (
            <div className="mt-6 p-3 bg-bi-warn-soft border border-bi-warn/20 rounded-md text-xs text-bi-warn flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Demo mode</p>
                <p className="mt-0.5 leading-relaxed">
                  Supabase isn't configured. Sign in with any email and password to
                  preview the dashboard.
                </p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {mode === 'signup' && (
              <>
                <Field label="Full name" icon={User}>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Maria Santos"
                    className={inputWithIcon}
                    autoComplete="name"
                  />
                </Field>

                <div>
                  <label className="block text-sm font-medium text-bi-text-soft">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className={`${inputPlain} mt-1.5 appearance-none bg-no-repeat bg-right pr-9`}
                    style={{
                      backgroundImage:
                        "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23a8a29e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
                      backgroundPosition: 'right 12px center'
                    }}
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <Field label="Email" icon={Mail}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputWithIcon}
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
                className={inputWithIcon}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                required
              />
            </Field>

            {error && (
              <div className="p-3 bg-bi-bad-soft border border-bi-bad/20 rounded-md text-xs text-bi-bad flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {info && (
              <div className="p-3 bg-bi-good-soft border border-bi-good/20 rounded-md text-xs text-bi-good">
                {info}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-bi-primary hover:bg-bi-primary-hover disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-md transition-colors duration-150 ease-out flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          {/* Mode toggle */}
          <p className="text-sm text-bi-text-mute text-center mt-6">
            {mode === 'signin' ? (
              <>Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setError(null); setInfo(null) }}
                  className="text-bi-primary font-medium hover:text-bi-primary-hover transition-colors duration-150 ease-out"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setError(null); setInfo(null) }}
                  className="text-bi-primary font-medium hover:text-bi-primary-hover transition-colors duration-150 ease-out"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </main>

      <footer className="py-6 text-center">
        <p className="text-xs text-bi-text-mute">
          © Bagong Ilog Elementary School · Pasig City
        </p>
      </footer>
    </div>
  )
}

function Field({ label, icon: Icon, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-bi-text-soft">{label}</label>
      <div className="mt-1.5 relative">
        <Icon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-bi-text-mute pointer-events-none" />
        {children}
      </div>
    </div>
  )
}
