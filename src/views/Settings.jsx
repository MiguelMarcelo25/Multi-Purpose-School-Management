import { useState } from 'react'
import { Save, School, Brain, Bell, Lock } from 'lucide-react'

export default function Settings() {
  const [riskThreshold, setRiskThreshold] = useState(60)
  const [retrain, setRetrain] = useState('monthly')

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div className="card p-6">
        <SectionHeader icon={School} title="School Profile" subtitle="Basic information for the school" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="School Name" value="Bagong Ilog Elementary School" />
          <Field label="School ID"   value="DepEd-NCR-PSG-1042" />
          <Field label="Division"    value="Pasig City" />
          <Field label="Region"      value="National Capital Region (NCR)" />
          <Field label="Address" full value="Bagong Ilog, Pasig City, Metro Manila" />
        </div>
      </div>

      <div className="card p-6">
        <SectionHeader icon={Brain} title="Predictive Model Configuration" subtitle="Tune the AI risk-detection engine" />
        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium text-slate-700">High-Risk Threshold</label>
            <div className="flex items-center gap-4 mt-2">
              <input
                type="range"
                min="40"
                max="80"
                value={riskThreshold}
                onChange={(e) => setRiskThreshold(Number(e.target.value))}
                className="flex-1 accent-brand-600"
              />
              <span className="text-lg font-bold text-brand-700 w-12 text-right">{riskThreshold}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Students scoring ≥ {riskThreshold} are flagged as high risk and trigger alerts.</p>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Retraining Cadence</label>
            <select
              value={retrain}
              onChange={(e) => setRetrain(e.target.value)}
              className="mt-2 w-full md:w-1/2 border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Model Version" value="v2.3" />
            <Field label="Last Trained"  value="April 18, 2026" />
          </div>
        </div>
      </div>

      <div className="card p-6">
        <SectionHeader icon={Bell} title="Alerts & Notifications" subtitle="Choose which events generate alerts" />
        <div className="space-y-3">
          <Toggle label="High-risk student detected" defaultOn />
          <Toggle label="Attendance falls below 80%" defaultOn />
          <Toggle label="Failing grade in any subject" defaultOn />
          <Toggle label="Tardiness exceeds 10 days" />
          <Toggle label="Weekly digest email" defaultOn />
        </div>
      </div>

      <div className="card p-6">
        <SectionHeader icon={Lock} title="Account Security" subtitle="Administrative access settings" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Administrator" value="Principal Reyes" />
          <Field label="Email"         value="principal@bagongilog-es.edu.ph" />
          <Field label="Last Login"    value="2026-04-30 08:14" />
          <Field label="MFA Status"    value="Enabled" />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button className="btn-ghost">Cancel</button>
        <button className="btn-primary"><Save className="w-4 h-4" /> Save Changes</button>
      </div>
    </div>
  )
}

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
    </div>
  )
}

function Field({ label, value, full }) {
  return (
    <div className={full ? 'md:col-span-2' : ''}>
      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</label>
      <input
        defaultValue={value}
        className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
      />
    </div>
  )
}

function Toggle({ label, defaultOn }) {
  const [on, setOn] = useState(!!defaultOn)
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200">
      <span className="text-sm text-slate-700">{label}</span>
      <button
        onClick={() => setOn((v) => !v)}
        className={`relative w-11 h-6 rounded-full transition-colors ${on ? 'bg-brand-600' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  )
}
