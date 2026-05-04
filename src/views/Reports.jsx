// src/views/Reports.jsx
import { PageHeader, ChartCard } from '../components/ui'
import { useData } from '../context/DataContext.jsx'
import { Download } from 'lucide-react'

const REPORTS = [
  { id: 'attendance',  title: 'Attendance Summary',     desc: 'Last 30 days, by section', source: 'attendance.bySection' },
  { id: 'academics',   title: 'Academic Performance',   desc: 'Subject averages + grade trends', source: 'academics.bySubject' },
  { id: 'at-risk',     title: 'At-Risk Students',       desc: 'Students with risk_level = High', source: 'predictions' },
  { id: 'honor-roll',  title: 'Honor Roll',             desc: 'Students with avg ≥ 90',          source: 'academics.honorRoll' },
  { id: 'enrollment',  title: 'Enrollment Roster',      desc: 'Full student list by section',    source: 'students' }
]

function toCSV(rows) {
  if (!rows.length) return ''
  const keys = Object.keys(rows[0])
  return [keys.join(','), ...rows.map((r) => keys.map((k) => JSON.stringify(r[k] ?? '')).join(','))].join('\n')
}
function download(name, content) {
  const blob = new Blob([content], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function Reports() {
  const data = useData()

  function generate(report) {
    const path = report.source.split('.')
    let value = data
    for (const p of path) value = value?.[p]
    const rows = Array.isArray(value) ? value : []
    download(`${report.id}.csv`, toCSV(rows))
  }

  return (
    <div className="p-6">
      <PageHeader title="Reports" subtitle="Generate exports of school data" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
        {REPORTS.map((r) => (
          <ChartCard key={r.id} title={r.title} subtitle={r.desc}>
            <button
              onClick={() => generate(r)}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-bi-primary text-white rounded hover:bg-bi-primary-hover"
            >
              <Download className="w-3.5 h-3.5" /> Generate CSV
            </button>
          </ChartCard>
        ))}
      </div>
    </div>
  )
}
