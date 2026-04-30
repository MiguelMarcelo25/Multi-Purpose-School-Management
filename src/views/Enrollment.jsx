import { useMemo, useState } from 'react'
import {
  Search, UserPlus, ArrowRightLeft, X, Users, GraduationCap,
  CalendarPlus, Filter, Download, CheckCircle
} from 'lucide-react'
import { useData } from '../context/DataContext.jsx'

const SECTIONS_BY_GRADE = {
  1: ['Sampaguita', 'Rosal'],
  2: ['Mabini', 'Rizal'],
  3: ['Bonifacio', 'Aguinaldo'],
  4: ['Mahogany', 'Narra'],
  5: ['Saturn', 'Jupiter'],
  6: ['Galileo', 'Newton']
}

export default function Enrollment() {
  const { students } = useData()
  const [query, setQuery] = useState('')
  const [grade, setGrade] = useState('all')
  const [section, setSection] = useState('all')
  const [transferTarget, setTransferTarget] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [toast, setToast] = useState(null)

  const filtered = useMemo(() => {
    let list = students
    if (grade !== 'all')   list = list.filter((s) => s.grade === Number(grade))
    if (section !== 'all') list = list.filter((s) => s.section === section)
    if (query) {
      const q = query.toLowerCase()
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q))
    }
    return list
  }, [students, grade, section, query])

  // Aggregated counts per section
  const sectionStats = useMemo(() => {
    const stats = {}
    students.forEach((s) => {
      const key = `Grade ${s.grade} – ${s.section}`
      stats[key] = (stats[key] || 0) + 1
    })
    return Object.entries(stats).sort(([a], [b]) => a.localeCompare(b))
  }, [students])

  function flash(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  return (
    <div className="p-8 space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-40 bg-emerald-600 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {toast}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Mini label="Total Enrolled" value={students.length} icon={Users} tone="brand" sub="School Year 2025–2026" />
        <Mini label="Sections"       value={sectionStats.length} icon={GraduationCap} tone="green" />
        <Mini label="New This Year"  value={students.filter((s) => s.enrolled === 2025).length} icon={CalendarPlus} tone="amber" />
        <Mini label="Transferees"    value={students.filter((s) => s.enrolled < 2025).length} icon={ArrowRightLeft} tone="purple" />
      </div>

      {/* Section overview */}
      <div className="card p-6">
        <h3 className="text-base font-bold text-slate-900 mb-4">Enrollment by Section</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {sectionStats.map(([key, count]) => (
            <div key={key} className="rounded-lg border border-slate-200 p-3 text-center">
              <p className="text-xs text-slate-500 leading-tight">{key}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{count}</p>
              <p className="text-[10px] text-slate-400 uppercase">students</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filter bar */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or LRN..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>
        <Filter className="w-4 h-4 text-slate-400" />
        <select value={grade} onChange={(e) => { setGrade(e.target.value); setSection('all') }} className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white">
          <option value="all">All Grades</option>
          {[1,2,3,4,5,6].map((g) => <option key={g} value={g}>Grade {g}</option>)}
        </select>
        <select value={section} onChange={(e) => setSection(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white">
          <option value="all">All Sections</option>
          {(grade === 'all' ? Object.values(SECTIONS_BY_GRADE).flat() : SECTIONS_BY_GRADE[grade] || []).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <div className="ml-auto flex items-center gap-2">
          <button className="btn-ghost"><Download className="w-4 h-4" /> Export</button>
          <button className="btn-primary" onClick={() => setAddOpen(true)}>
            <UserPlus className="w-4 h-4" /> Enroll Student
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Showing <span className="font-semibold text-slate-700">{filtered.length}</span> of {students.length} students
      </p>

      {/* Enrollment table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="table-th">Student</th>
                <th className="table-th">LRN</th>
                <th className="table-th">Current Section</th>
                <th className="table-th">Age / Gender</th>
                <th className="table-th">Enrolled Since</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.slice(0, 200).map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">
                        {s.name.split(' ').map(n => n[0]).slice(0,2).join('')}
                      </div>
                      <p className="font-semibold text-slate-900">{s.name}</p>
                    </div>
                  </td>
                  <td className="table-td font-mono text-xs">{s.id}</td>
                  <td className="table-td">
                    <span className="badge-blue">Grade {s.grade} – {s.section}</span>
                  </td>
                  <td className="table-td">{s.age} · {s.gender}</td>
                  <td className="table-td">SY {s.enrolled}–{s.enrolled + 1}</td>
                  <td className="table-td">
                    <button
                      onClick={() => setTransferTarget(s)}
                      className="btn-ghost text-xs py-1.5"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" /> Transfer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transfer modal */}
      {transferTarget && (
        <Modal title={`Transfer Student`} onClose={() => setTransferTarget(null)}>
          <p className="text-sm text-slate-600 mb-4">
            Transfer <b>{transferTarget.name}</b> (currently Grade {transferTarget.grade} – {transferTarget.section}) to another section.
          </p>
          <TransferForm
            current={transferTarget}
            onSubmit={(grade, section) => {
              flash(`${transferTarget.name} transferred to Grade ${grade} – ${section}`)
              setTransferTarget(null)
            }}
            onCancel={() => setTransferTarget(null)}
          />
        </Modal>
      )}

      {/* Add student modal */}
      {addOpen && (
        <Modal title="Enroll New Student" onClose={() => setAddOpen(false)}>
          <EnrollForm
            onSubmit={(data) => {
              flash(`${data.name} enrolled in Grade ${data.grade} – ${data.section}`)
              setAddOpen(false)
            }}
            onCancel={() => setAddOpen(false)}
          />
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function TransferForm({ current, onSubmit, onCancel }) {
  const [grade, setGrade] = useState(current.grade)
  const [section, setSection] = useState('')

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (section) onSubmit(grade, section) }} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-700">New Grade Level</label>
        <select value={grade} onChange={(e) => { setGrade(Number(e.target.value)); setSection('') }}
          className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
          {[1,2,3,4,5,6].map((g) => <option key={g} value={g}>Grade {g}</option>)}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700">New Section</label>
        <select value={section} onChange={(e) => setSection(e.target.value)} required
          className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
          <option value="">Choose a section…</option>
          {SECTIONS_BY_GRADE[grade].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
        <button type="submit" className="btn-primary"><ArrowRightLeft className="w-4 h-4" /> Transfer</button>
      </div>
    </form>
  )
}

function EnrollForm({ onSubmit, onCancel }) {
  const [name, setName] = useState('')
  const [lrn, setLrn] = useState('')
  const [gender, setGender] = useState('M')
  const [age, setAge] = useState(7)
  const [grade, setGrade] = useState(1)
  const [section, setSection] = useState(SECTIONS_BY_GRADE[1][0])
  const [guardian, setGuardian] = useState('')

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({ name, lrn, gender, age, grade, section, guardian })
      }}
      className="space-y-3"
    >
      <Field label="Full Name"><input required value={name} onChange={(e) => setName(e.target.value)} className="auth-input pl-3" /></Field>
      <Field label="LRN"><input required value={lrn} onChange={(e) => setLrn(e.target.value)} placeholder="BIES-1234" className="auth-input pl-3 font-mono" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Gender">
          <select value={gender} onChange={(e) => setGender(e.target.value)} className="auth-input pl-3">
            <option value="M">Male</option><option value="F">Female</option>
          </select>
        </Field>
        <Field label="Age">
          <input type="number" min="5" max="14" value={age} onChange={(e) => setAge(Number(e.target.value))} className="auth-input pl-3" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Grade Level">
          <select value={grade} onChange={(e) => { setGrade(Number(e.target.value)); setSection(SECTIONS_BY_GRADE[Number(e.target.value)][0]) }} className="auth-input pl-3">
            {[1,2,3,4,5,6].map((g) => <option key={g} value={g}>Grade {g}</option>)}
          </select>
        </Field>
        <Field label="Section">
          <select value={section} onChange={(e) => setSection(e.target.value)} className="auth-input pl-3">
            {SECTIONS_BY_GRADE[grade].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Parent / Guardian"><input required value={guardian} onChange={(e) => setGuardian(e.target.value)} className="auth-input pl-3" /></Field>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
        <button type="submit" className="btn-primary"><UserPlus className="w-4 h-4" /> Enroll</button>
      </div>
    </form>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-700">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  )
}

function Mini({ label, value, icon: Icon, tone, sub }) {
  const tones = {
    brand:  'bg-brand-50 text-brand-700',
    green:  'bg-emerald-50 text-emerald-700',
    amber:  'bg-amber-50 text-amber-700',
    purple: 'bg-purple-50 text-purple-700'
  }
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase text-slate-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tones[tone]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}
