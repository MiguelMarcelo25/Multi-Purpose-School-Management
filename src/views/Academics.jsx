import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend
} from 'recharts'
import { GraduationCap, Award, BookOpen } from 'lucide-react'
import { SUBJECT_PERFORMANCE, GRADE_PERFORMANCE, STUDENTS_WITH_RISK } from '../data/mockData.js'

export default function Academics() {
  const honorRoll = STUDENTS_WITH_RISK.filter((s) => s.average >= 90).sort((a,b) => b.average - a.average).slice(0, 8)
  const failing = STUDENTS_WITH_RISK.filter((s) => s.risk.failingSubjects > 0).length

  return (
    <div className="p-8 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-slate-500 font-medium">School Average</p>
              <p className="text-2xl font-bold text-slate-900 mt-2">88.2%</p>
              <p className="text-xs text-emerald-600 font-semibold mt-1">+1.4% vs last quarter</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center"><GraduationCap className="w-5 h-5" /></div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-slate-500 font-medium">Honor Roll Students</p>
              <p className="text-2xl font-bold text-slate-900 mt-2">{STUDENTS_WITH_RISK.filter(s => s.average >= 90).length}</p>
              <p className="text-xs text-slate-500 mt-1">Average ≥ 90</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center"><Award className="w-5 h-5" /></div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-slate-500 font-medium">Need Remediation</p>
              <p className="text-2xl font-bold text-slate-900 mt-2">{failing}</p>
              <p className="text-xs text-slate-500 mt-1">≥ 1 failing subject</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-red-50 text-red-700 flex items-center justify-center"><BookOpen className="w-5 h-5" /></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-base font-bold text-slate-900 mb-1">Subject Performance</h3>
          <p className="text-xs text-slate-500 mb-4">Mean grade per subject across all grade levels</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={SUBJECT_PERFORMANCE}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="subject" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} domain={[70, 95]} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <Bar dataKey="average" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h3 className="text-base font-bold text-slate-900 mb-1">Subject Profile (Radar)</h3>
          <p className="text-xs text-slate-500 mb-4">Comparing average vs. passing rate</p>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={SUBJECT_PERFORMANCE}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#64748b' }} />
              <PolarRadiusAxis angle={90} domain={[60, 100]} tick={{ fontSize: 10 }} />
              <Radar name="Average"     dataKey="average" stroke="#2563eb" fill="#2563eb" fillOpacity={0.4} />
              <Radar name="Passing Rate" dataKey="passing" stroke="#a855f7" fill="#a855f7" fillOpacity={0.3} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-base font-bold text-slate-900 mb-4">Top Performers (Honor Roll)</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="table-th">Rank</th>
                <th className="table-th">Student</th>
                <th className="table-th">Grade & Section</th>
                <th className="table-th">Average</th>
                <th className="table-th">Attendance</th>
                <th className="table-th">Behavior</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {honorRoll.map((s, i) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="table-td">
                    <span className={`inline-flex w-7 h-7 rounded-full items-center justify-center text-xs font-bold ${
                      i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-200 text-slate-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'
                    }`}>{i+1}</span>
                  </td>
                  <td className="table-td font-semibold text-slate-900">{s.name}</td>
                  <td className="table-td">Grade {s.grade} – {s.section}</td>
                  <td className="table-td"><span className="font-bold text-emerald-600">{s.average.toFixed(1)}</span></td>
                  <td className="table-td">{s.attendance}%</td>
                  <td className="table-td"><span className="badge-green">{s.behavior}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
