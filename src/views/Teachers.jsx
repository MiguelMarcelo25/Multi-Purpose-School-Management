import { Star, Users, BookOpen, Award } from 'lucide-react'
import { TEACHERS } from '../data/mockData.js'

export default function Teachers() {
  return (
    <div className="p-8 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Mini label="Total Faculty" value={TEACHERS.length + 34} icon={Users} tone="brand" />
        <Mini label="Avg. Rating"   value="4.6 / 5" icon={Star} tone="amber" />
        <Mini label="Subjects Taught" value="7" icon={BookOpen} tone="green" />
        <Mini label="Master's Degree" value="68%" icon={Award} tone="purple" />
      </div>

      <div className="card p-6">
        <h3 className="text-base font-bold text-slate-900 mb-4">Faculty Directory</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {TEACHERS.map((t) => (
            <div key={t.id} className="rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center text-sm font-bold">
                  {t.name.split(' ').slice(-2).map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.id}</p>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <Row label="Subject"       value={t.subject} />
                <Row label="Grade Level"   value={`Grade ${t.grade}`} />
                <Row label="Sections"      value={t.sections} />
                <Row label="Years of Exp." value={`${t.yearsExp} years`} />
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map((i) => (
                    <Star key={i} className={`w-4 h-4 ${i <= Math.round(t.rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                  ))}
                </div>
                <span className="text-sm font-bold text-slate-900">{t.rating.toFixed(1)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-800">{value}</span>
    </div>
  )
}
function Mini({ label, value, icon: Icon, tone }) {
  const tones = {
    brand:  'bg-brand-50 text-brand-700',
    amber:  'bg-amber-50 text-amber-700',
    green:  'bg-emerald-50 text-emerald-700',
    purple: 'bg-purple-50 text-purple-700'
  }
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase text-slate-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tones[tone]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}
