import { useMemo, useState } from 'react'
import {
  UserPlus, ArrowRightLeft, X, Users, GraduationCap,
  CalendarPlus, Download, CheckCircle
} from 'lucide-react'
import { useData } from '../context/DataContext.jsx'
import {
  PageHeader, KPICard, ChartCard, DataTable,
  EmptyState, LoadingState, ErrorState
} from '../components/ui'

const SECTIONS_BY_GRADE = {
  1: ['Sampaguita', 'Rosal'],
  2: ['Mabini', 'Rizal'],
  3: ['Bonifacio', 'Aguinaldo'],
  4: ['Mahogany', 'Narra'],
  5: ['Saturn', 'Jupiter'],
  6: ['Galileo', 'Newton']
}

export default function Enrollment() {
  const { students, loading, error, retry } = useData()
  const [grade, setGrade] = useState('all')
  const [section, setSection] = useState('all')
  const [transferTarget, setTransferTarget] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [toast, setToast] = useState(null)

  const filtered = useMemo(() => {
    let list = students
    if (grade !== 'all')   list = list.filter((s) => s.grade === Number(grade))
    if (section !== 'all') list = list.filter((s) => s.section === section)
    return list
  }, [students, grade, section])

  // Aggregated counts per section
  const sectionStats = useMemo(() => {
    const stats = {}
    students.forEach((s) => {
      const key = `Grade ${s.grade} – ${s.section}`
      stats[key] = (stats[key] || 0) + 1
    })
    return Object.entries(stats).sort(([a], [b]) => a.localeCompare(b))
  }, [students])

  const columns = useMemo(() => ([
    { key: 'id',   header: 'LRN',
      render: (r) => <span className="font-mono text-xs text-bi-text-soft">{r.id}</span>
    },
    { key: 'name', header: 'Student',
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-bi-primary-soft text-bi-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0">
            {r.name.split(' ').map(n => n[0]).slice(0,2).join('')}
          </div>
          <span className="font-medium text-bi-text">{r.name}</span>
        </div>
      )
    },
    { key: 'section', header: 'Current Section',
      render: (r) => (
        <span className="inline-block px-1.5 py-0.5 text-xs font-semibold bg-bi-primary-soft text-bi-primary rounded">
          Grade {r.grade} – {r.section}
        </span>
      )
    },
    { key: 'age',      header: 'Age / Gender', render: (r) => `${r.age} · ${r.gender}` },
    { key: 'enrolled', header: 'Enrolled',     render: (r) => `SY ${r.enrolled}–${r.enrolled + 1}` },
    { key: '_actions', header: '',
      render: (r) => (
        <button
          onClick={(e) => { e.stopPropagation(); setTransferTarget(r) }}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-bi-text-soft border border-bi-border rounded hover:bg-bi-tint"
        >
          <ArrowRightLeft className="w-3 h-3" /> Transfer
        </button>
      )
    }
  ]), [])

  function flash(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <PageHeader title="Enrollment" subtitle="Manage section assignments" />
        <LoadingState variant="kpis" />
        <LoadingState rows={5} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 space-y-4">
        <PageHeader title="Enrollment" subtitle="Manage section assignments" />
        <ErrorState title="Failed to load enrollment" message={error} onRetry={retry} />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-40 bg-bi-good text-white text-sm px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {toast}
        </div>
      )}

      <PageHeader
        title="Enrollment"
        subtitle="Section roster and enrollment management"
        actions={
          <>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-bi-text-soft bg-bi-card border border-bi-border rounded hover:bg-bi-tint">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-bi-primary text-white rounded hover:bg-bi-primary-hover"
            >
              <UserPlus className="w-3.5 h-3.5" /> Enroll Student
            </button>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <KPICard label="Total Enrolled" value={students.length} icon={Users} />
        <KPICard label="Sections"        value={sectionStats.length} icon={GraduationCap} />
        <KPICard label="New This Year"   value={students.filter((s) => s.enrolled === 2025).length} icon={CalendarPlus} />
        <KPICard label="Transferees"     value={students.filter((s) => s.enrolled < 2025).length} icon={ArrowRightLeft} />
      </div>

      {/* Section overview */}
      <ChartCard title="Enrollment by Section" subtitle="Current head count per section">
        {sectionStats.length === 0 ? (
          <EmptyState title="No sections" message="Sections will appear once students are enrolled." />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {sectionStats.map(([key, count]) => (
              <div key={key} className="rounded-[10px] border border-bi-border p-3 text-center bg-bi-bg/30">
                <p className="text-xs text-bi-text-mute leading-tight">{key}</p>
                <p className="text-2xl font-bold text-bi-text mt-1 tabular-nums">{count}</p>
                <p className="text-[10px] text-bi-text-mute uppercase tracking-wider">students</p>
              </div>
            ))}
          </div>
        )}
      </ChartCard>

      {/* Filter bar */}
      <div className="bg-bi-card border border-bi-border rounded-[10px] p-3 flex flex-wrap items-center gap-2">
        <select
          value={grade}
          onChange={(e) => { setGrade(e.target.value); setSection('all') }}
          className="text-xs border border-bi-border rounded px-2 py-1.5 bg-bi-bg text-bi-text"
        >
          <option value="all">All Grades</option>
          {[1,2,3,4,5,6].map((g) => <option key={g} value={g}>Grade {g}</option>)}
        </select>
        <select
          value={section}
          onChange={(e) => setSection(e.target.value)}
          className="text-xs border border-bi-border rounded px-2 py-1.5 bg-bi-bg text-bi-text"
        >
          <option value="all">All Sections</option>
          {(grade === 'all' ? Object.values(SECTIONS_BY_GRADE).flat() : SECTIONS_BY_GRADE[grade] || []).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {students.length === 0 ? (
        <EmptyState title="No students enrolled" message="Use the Enroll Student button to begin." />
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          searchable
          pageSize={25}
          emptyMessage="No students match the current filters"
        />
      )}

      {/* Transfer modal */}
      {transferTarget && (
        <Modal title="Transfer Student" onClose={() => setTransferTarget(null)}>
          <p className="text-sm text-bi-text-soft mb-4">
            Transfer <b className="text-bi-text">{transferTarget.name}</b> (currently Grade {transferTarget.grade} – {transferTarget.section}) to another section.
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
      <div className="absolute inset-0 bg-bi-text/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-bi-card rounded-xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-bi-border">
          <h3 className="text-lg font-bold text-bi-text">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-bi-tint rounded-lg"><X className="w-5 h-5 text-bi-text-soft" /></button>
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
        <label className="text-sm font-medium text-bi-text-soft">New Grade Level</label>
        <select value={grade} onChange={(e) => { setGrade(Number(e.target.value)); setSection('') }}
          className="mt-1 w-full border border-bi-border rounded px-3 py-2 text-sm bg-bi-bg">
          {[1,2,3,4,5,6].map((g) => <option key={g} value={g}>Grade {g}</option>)}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium text-bi-text-soft">New Section</label>
        <select value={section} onChange={(e) => setSection(e.target.value)} required
          className="mt-1 w-full border border-bi-border rounded px-3 py-2 text-sm bg-bi-bg">
          <option value="">Choose a section…</option>
          {SECTIONS_BY_GRADE[grade].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-xs font-semibold text-bi-text-soft border border-bi-border rounded hover:bg-bi-tint">Cancel</button>
        <button type="submit" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-bi-primary text-white rounded hover:bg-bi-primary-hover">
          <ArrowRightLeft className="w-3.5 h-3.5" /> Transfer
        </button>
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

  const inputClass = "w-full border border-bi-border rounded px-3 py-2 text-sm bg-bi-bg focus:outline-none focus:border-bi-primary"

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({ name, lrn, gender, age, grade, section, guardian })
      }}
      className="space-y-3"
    >
      <Field label="Full Name"><input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} /></Field>
      <Field label="LRN"><input required value={lrn} onChange={(e) => setLrn(e.target.value)} placeholder="BIES-1234" className={`${inputClass} font-mono`} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Gender">
          <select value={gender} onChange={(e) => setGender(e.target.value)} className={inputClass}>
            <option value="M">Male</option><option value="F">Female</option>
          </select>
        </Field>
        <Field label="Age">
          <input type="number" min="5" max="14" value={age} onChange={(e) => setAge(Number(e.target.value))} className={inputClass} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Grade Level">
          <select value={grade} onChange={(e) => { setGrade(Number(e.target.value)); setSection(SECTIONS_BY_GRADE[Number(e.target.value)][0]) }} className={inputClass}>
            {[1,2,3,4,5,6].map((g) => <option key={g} value={g}>Grade {g}</option>)}
          </select>
        </Field>
        <Field label="Section">
          <select value={section} onChange={(e) => setSection(e.target.value)} className={inputClass}>
            {SECTIONS_BY_GRADE[grade].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Parent / Guardian"><input required value={guardian} onChange={(e) => setGuardian(e.target.value)} className={inputClass} /></Field>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-xs font-semibold text-bi-text-soft border border-bi-border rounded hover:bg-bi-tint">Cancel</button>
        <button type="submit" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-bi-primary text-white rounded hover:bg-bi-primary-hover">
          <UserPlus className="w-3.5 h-3.5" /> Enroll
        </button>
      </div>
    </form>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-bi-text-soft">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  )
}
