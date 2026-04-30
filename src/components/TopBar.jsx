import { useEffect, useRef, useState } from 'react'
import { Search, Bell, ChevronDown, LogOut, UserCircle, Shield } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

const ROLE_LABEL = {
  admin: 'Administrator',
  teacher: 'Teacher',
  parent: 'Parent'
}

export default function TopBar({ title, subtitle }) {
  const { profile, signOut, role } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const initials = (profile?.full_name || 'U U')
    .split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()

  return (
    <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
      <div>
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search students, teachers..."
            className="w-72 pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400"
          />
        </div>

        <button className="relative p-2 rounded-lg hover:bg-slate-100">
          <Bell className="w-5 h-5 text-slate-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <div ref={ref} className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg hover:bg-slate-100 border-l border-slate-200"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center text-sm font-semibold">
              {initials}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-semibold text-slate-800 leading-tight">{profile?.full_name || 'User'}</p>
              <p className="text-[11px] text-slate-500">{ROLE_LABEL[role] || 'User'}</p>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-20">
              <div className="p-4 border-b border-slate-100">
                <p className="text-sm font-bold text-slate-900 truncate">{profile?.full_name}</p>
                <p className="text-xs text-slate-500 truncate">{profile?.email}</p>
                <span className="badge-blue mt-2 capitalize"><Shield className="w-3 h-3" /> {ROLE_LABEL[role]}</span>
              </div>
              <button className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                <UserCircle className="w-4 h-4" /> Profile
              </button>
              <button
                onClick={signOut}
                className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-slate-100"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
