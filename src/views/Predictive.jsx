import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  RadialBarChart, RadialBar, PolarAngleAxis, ScatterChart, Scatter, ZAxis, Legend
} from 'recharts'
import { Brain, AlertTriangle, Target, Activity, Sparkles, ArrowRight } from 'lucide-react'
import { STUDENTS_WITH_RISK, recommendInterventions } from '../data/mockData.js'

const FEATURE_IMPORTANCE = [
  { feature: 'Attendance Rate',     importance: 0.32 },
  { feature: 'Average Grade',       importance: 0.28 },
  { feature: 'Tardiness Count',     importance: 0.12 },
  { feature: 'Failing Subjects',    importance: 0.10 },
  { feature: 'Parent Involvement',  importance: 0.08 },
  { feature: 'Behavior Rating',     importance: 0.06 },
  { feature: 'Household Income',    importance: 0.04 }
]

const MODEL_METRICS = [
  { name: 'Accuracy',  value: 91.4, fill: '#2563eb' },
  { name: 'Precision', value: 88.7, fill: '#10b981' },
  { name: 'Recall',    value: 86.2, fill: '#a855f7' },
  { name: 'F1 Score',  value: 87.4, fill: '#f59e0b' }
]

export default function Predictive() {
  const [selected, setSelected] = useState(null)

  const highRisk = useMemo(
    () => STUDENTS_WITH_RISK.filter((s) => s.risk.level === 'High').sort((a, b) => b.risk.score - a.risk.score),
    []
  )
  const scatterData = useMemo(
    () => STUDENTS_WITH_RISK.map((s) => ({
      x: s.attendance,
      y: s.average,
      z: s.risk.score,
      name: s.name,
      level: s.risk.level
    })),
    []
  )

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-purple-700 via-brand-700 to-blue-600 p-6 text-white shadow-lg">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <Brain className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold">Predictive Analytics Engine</h2>
            <p className="text-purple-100 text-sm mt-1 max-w-2xl">
              The model uses logistic regression on attendance, academic performance, behavioral, and socioeconomic
              indicators to forecast academic risk and recommend early interventions.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-purple-100">Last trained</p>
            <p className="text-sm font-bold">Apr 18, 2026</p>
          </div>
        </div>
      </div>

      {/* Model performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Model Performance</h3>
              <p className="text-xs text-slate-500">Cross-validation on SY 2024–2025 data</p>
            </div>
            <Target className="w-5 h-5 text-brand-600" />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="100%" data={MODEL_METRICS} startAngle={180} endAngle={0}>
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar dataKey="value" background cornerRadius={6} />
              <Tooltip />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {MODEL_METRICS.map((m) => (
              <div key={m.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: m.fill }} />
                  <span className="text-slate-700">{m.name}</span>
                </div>
                <span className="font-bold text-slate-900">{m.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Feature importance */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Feature Importance</h3>
              <p className="text-xs text-slate-500">Which factors drive risk predictions?</p>
            </div>
            <Activity className="w-5 h-5 text-brand-600" />
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={FEATURE_IMPORTANCE} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" stroke="#64748b" fontSize={12} domain={[0, 0.4]} tickFormatter={(v) => `${(v*100).toFixed(0)}%`} />
              <YAxis type="category" dataKey="feature" stroke="#64748b" fontSize={12} width={140} />
              <Tooltip formatter={(v) => `${(v*100).toFixed(1)}%`} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <Bar dataKey="importance" fill="#a855f7" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Risk scatter */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Risk Map: Attendance vs. Average Grade</h3>
            <p className="text-xs text-slate-500">Each dot is a student. Bubble size = risk score. Lower-left quadrant = high concern.</p>
          </div>
          <Sparkles className="w-5 h-5 text-brand-600" />
        </div>
        <ResponsiveContainer width="100%" height={340}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" dataKey="x" name="Attendance" unit="%" stroke="#64748b" fontSize={12} domain={[55, 100]} />
            <YAxis type="number" dataKey="y" name="Average" stroke="#64748b" fontSize={12} domain={[60, 100]} />
            <ZAxis type="number" dataKey="z" range={[20, 200]} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: 8 }} />
            <Legend />
            <Scatter name="High Risk"   data={scatterData.filter((d) => d.level === 'High')}   fill="#ef4444" />
            <Scatter name="Medium Risk" data={scatterData.filter((d) => d.level === 'Medium')} fill="#f59e0b" />
            <Scatter name="Low Risk"    data={scatterData.filter((d) => d.level === 'Low')}    fill="#10b981" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* High-risk list with interventions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Highest-Risk Students</h3>
              <p className="text-xs text-slate-500">Sorted by predicted dropout probability</p>
            </div>
            <span className="badge-red"><AlertTriangle className="w-3 h-3" /> Immediate Action</span>
          </div>
          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {highRisk.slice(0, 15).map((s) => (
              <button
                key={s.id}
                onClick={() => setSelected(s)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selected?.id === s.id ? 'bg-brand-50 border-brand-300' : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{s.name}</p>
                    <p className="text-xs text-slate-500">Grade {s.grade}-{s.section} · Avg {s.average} · Att {s.attendance}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-600">{s.risk.score}</p>
                    <p className="text-[10px] uppercase text-slate-400">risk</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">Intervention Plan</h3>
            <p className="text-xs text-slate-500">{selected ? `Personalized for ${selected.name}` : 'Select a student to generate'}</p>
          </div>
          {!selected ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Brain className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">Select a student from the list to view AI-recommended interventions.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-gradient-to-br from-brand-50 to-purple-50 border border-brand-100 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-900">{selected.name}</p>
                  <span className="badge-red">Risk {selected.risk.score}/100</span>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3 text-xs">
                  <Stat label="Attendance" value={`${selected.attendance}%`} />
                  <Stat label="Average" value={selected.average.toFixed(1)} />
                  <Stat label="Predicted" value={selected.risk.projectedAverage} />
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-700 uppercase mb-2">Recommended Actions</h4>
                <ol className="space-y-2">
                  {recommendInterventions(selected).map((r, i) => (
                    <li key={i} className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{i+1}</span>
                      <span className="text-sm text-slate-700">{r}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <button className="btn-primary w-full justify-center">
                Assign to Counselor <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-slate-500">{label}</p>
      <p className="text-base font-bold text-slate-900">{value}</p>
    </div>
  )
}
