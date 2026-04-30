import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

// Demo session used when Supabase isn't configured (mock mode)
const DEMO_PROFILES = {
  admin:     { id: 'demo-admin',     full_name: 'Principal Reyes (Admin)',  email: 'admin@bagongilog-es.demo',     role: 'admin' },
  principal: { id: 'demo-principal', full_name: 'Dr. Maria Santos',         email: 'principal@bagongilog-es.demo', role: 'principal' },
  teacher:   { id: 'demo-teacher',   full_name: 'Mr. Andres Bonifacio',     email: 'teacher@bagongilog-es.demo',   role: 'teacher' },
  nurse:     { id: 'demo-nurse',     full_name: 'Nurse Corazon Aquino',     email: 'nurse@bagongilog-es.demo',     role: 'nurse' },
  parent:    { id: 'demo-parent',    full_name: 'Ms. Liza Domingo',         email: 'parent@bagongilog-es.demo',    role: 'parent' },
  student:   { id: 'demo-student',   full_name: 'Juan Dela Cruz',           email: 'student@bagongilog-es.demo',   role: 'student' }
}

function demoSession(role = 'admin') {
  const profile = DEMO_PROFILES[role] || DEMO_PROFILES.admin
  return { user: { id: profile.id, email: profile.email }, profile }
}

export function AuthProvider({ children }) {
  const [state, setState] = useState({
    loading: true,
    user: null,
    profile: null,
    error: null
  })

  // Bootstrap session
  useEffect(() => {
    if (!isSupabaseConfigured) {
      const savedRole = typeof localStorage !== 'undefined' ? localStorage.getItem('demo_role') : null
      if (savedRole) {
        const s = demoSession(savedRole)
        setState({ loading: false, user: s.user, profile: s.profile, error: null })
      } else {
        setState({ loading: false, user: null, profile: null, error: null })
      }
      return
    }

    let mounted = true
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return
      if (session?.user) {
        const profile = await loadProfile(session.user.id)
        setState({ loading: false, user: session.user, profile, error: null })
      } else {
        setState({ loading: false, user: null, profile: null, error: null })
      }
    })()

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await loadProfile(session.user.id)
        setState({ loading: false, user: session.user, profile, error: null })
      } else {
        setState({ loading: false, user: null, profile: null, error: null })
      }
    })

    return () => {
      mounted = false
      sub.subscription?.unsubscribe()
    }
  }, [])

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('id', userId)
      .single()
    if (error) {
      console.warn('Profile load failed', error)
      return { id: userId, full_name: 'Unknown', role: 'parent' }
    }
    return data
  }

  async function signIn(email, password, demoRole = 'admin') {
    if (!isSupabaseConfigured) {
      const role = demoRole || 'admin'
      const s = demoSession(role)
      if (typeof localStorage !== 'undefined') localStorage.setItem('demo_role', role)
      setState({ loading: false, user: s.user, profile: s.profile, error: null })
      return { error: null }
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  function switchDemoRole(role) {
    if (isSupabaseConfigured) return
    const s = demoSession(role)
    if (typeof localStorage !== 'undefined') localStorage.setItem('demo_role', role)
    setState({ loading: false, user: s.user, profile: s.profile, error: null })
  }

  async function signUp(email, password, fullName, role) {
    if (!isSupabaseConfigured) {
      return { error: { message: 'Supabase is not configured. Cannot create real account in demo mode.' } }
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } }
    })
    return { error }
  }

  async function signOut() {
    if (isSupabaseConfigured) await supabase.auth.signOut()
    if (typeof localStorage !== 'undefined') localStorage.removeItem('demo_role')
    setState({ loading: false, user: null, profile: null, error: null })
  }

  const value = {
    ...state,
    role: state.profile?.role || null,
    isAuthenticated: !!state.user,
    isDemoMode: !isSupabaseConfigured,
    signIn,
    signUp,
    signOut,
    switchDemoRole
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
