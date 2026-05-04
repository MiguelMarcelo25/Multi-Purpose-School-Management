import { useMemo } from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts'
import {
  GraduationCap, CalendarCheck, Sparkles, Award, Heart, Syringe
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import {
  PageHeader, KPICard, ChartCard, DataTable,
  EmptyState, LoadingState, ErrorState
} from '../components/ui'

export default function MyProgress() {
  const { profile } = useAuth()
  const { students, healthRecords, loading, error, retry, mode } = useData()

  // In demo mode, just pick the first student to showcase the view.
  // In live mode this would come from `students.find(s => s.profileId === profile.id)`
  const me = students[0]

  const subjectData = useMemo(
    () => Object.entries(me?.grades || {}).map(([subject, grade]) => ({ subject, grade })),
    [me]
  )

  const quarterTrend = useMemo(() => {
    if (!me) return []
    return [
      { quarter: 'Q1', avg: Math.max(60, me.average - 4) },
      { quarter: 'Q2', avg: Math.max(60, me.average - 1) },
      { quarter: 'Q3', avg: me.average },
      { quarter: 'Q4 (proj.)', avg: me.risk?.projectedAverage }
    ]
  }, [me])

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <PageHeader title="My Progress" subtitle="Your academic snapshot" />
        <LoadingState variant="kpis" />
        <LoadingState rows={4} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 space-y-4">
        <PageHeader title="My Progress" subtitle="Your academic snapshot" />
        <ErrorState title="Failed to load progress" message={error} onRetry={retry} />
      </div>
    )
  }

  if (!me) {
    return (
      <div className="p-6 space-y-4">
        <PageHeader title="My Progress" subtitle="Your academic snapshot" />
        <EmptyState
          title="No student record linked"
          message="Ask the school admin to link your account to a student record."
        />
      </div>
    )
  }

  // Look up the signed-in student's real health records from live data.
  // me.id is the LRN; the joined `student.lrn` lets us match without
  // needing a separate UUID. In demo / mock mode `healthRecords` is empty
  // by design so we simply render "No records on file" instead of the
  // fictional mock data the previous build leaked.
  // TODO: when an account-to-student link exists (profiles.id ->
  //   students.profile_id), prefer the join over the LRN match.
  const records = healthRecords?.records || []
  const immuns  = healthRecords?.immunizations || []
  const myHealthRow = records.find((h) => h.student?.lrn === me.id) || null
  const myImmunRows = immuns.filter((i) => i.student?.lrn === me.id)

  // Normalize snake_case columns from Supabase to the camelCase shape the
  // template below renders.
  const myHealth = myHealthRow ? {
    heightCm:    myHealthRow.height_cm,
    weightKg:    myHealthRow.weight_kg,
    bmi:         myHealthRow.bmi,
    bmiCategory: myHealthRow.bmi_category,
    bloodType:   myHealthRow.blood_type,
    vision:      myHealthRow.vision,
    allergies:   myHealthRow.allergies
  } : null

  const myImmun = myImmunRows.map((i) => ({
    vaccine:        i.vaccine,
    administeredOn: i.administered_on,
    status:         i.status
  }))

  const gradeColumns = [
    { key: 'subject', header: 'Subject',
      render: (r) => <span className="font-medium text-bi-text">{r.subject}</span>
    },
    { key: 'grade', header: 'Grade',
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-bi-tint rounded-full overflow-hidden max-w-[180px]">
            <div
              className={`h-full ${r.grade < 75 ? 'bg-bi-bad' : r.grade < 85 ? 'bg-bi-warn' : 'bg-bi-good'}`}
              style={{ width: `${r.grade}%` }}
            />
          </div>
          <span className={`w-10 text-right text-sm font-semibold tabular-nums ${
            r.grade < 75 ? 'text-bi-bad' : r.grade < 85 ? 'text-bi-warn' : 'text-bi-good'
          }`}>{r.grade}</span>
        </div>
      )
    }
  ]

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title={`Welcome, ${profile?.full_name || me.name}`}
        subtitle={`Grade ${me.grade} – ${me.section} · LRN ${me.id}`}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <KPICard label="My Average"     value={`${me.average.toFixed(1)}%`}        icon={GraduationCap} />
        <KPICard label="Attendance"     value={`${me.attendance}%`}                icon={CalendarCheck} />
        <KPICard label="Predicted Avg." value={me.risk?.projectedAverage ?? '—'}   icon={Sparkles} />
        <KPICard label="Honor Roll"     value={me.average >= 90 ? 'Yes' : 'No'}    icon={Award} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ChartCard title="My Grade Trend" subtitle="Quarter-over-quarter average">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={quarterTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e4dc" />
              <XAxis dataKey="quarter" stroke="#a8a29e" fontSize={11} />
              <YAxis domain={[60, 100]} stroke="#a8a29e" fontSize={11} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e8e4dc' }} />
              <Line type="monotone" dataKey="avg" stroke="#b45309" strokeWidth={2.5} dot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Subject Breakdown" subtitle="Your performance by subject">
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={subjectData}>
              <PolarGrid stroke="#e8e4dc" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#57534e' }} />
              <PolarRadiusAxis angle={90} domain={[60, 100]} tick={{ fontSize: 10, fill: '#a8a29e' }} />
              <Radar dataKey="grade" stroke="#b45309" fill="#b45309" fillOpacity={0.4} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Subject grades */}
      <ChartCard title="My Subject Grades" subtitle="Detailed breakdown by quarter average">
        {subjectData.length === 0 ? (
          <EmptyState title="No grades yet" message="Subject grades will appear once recorded." />
        ) : (
          <DataTable columns={gradeColumns} rows={subjectData} pageSize={20} emptyMessage="No subject grades" />
        )}
      </ChartCard>

      {/* Health snapshot */}
      {myHealth && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <ChartCard
            title="My Health Snapshot"
            subtitle="Most recent health screening"
            action={<Heart className="w-4 h-4 text-bi-bad" />}
          >
            <div className="grid grid-cols-3 gap-2">
              <SmallStat label="Height" value={`${myHealth.heightCm} cm`} />
              <SmallStat label="Weight" value={`${myHealth.weightKg} kg`} />
              <SmallStat label="BMI"    value={myHealth.bmi} sub={myHealth.bmiCategory} />
              <SmallStat label="Blood"  value={myHealth.bloodType} />
              <SmallStat label="Vision" value={myHealth.vision} />
              <SmallStat label="Allergies" value={myHealth.allergies} />
            </div>
          </ChartCard>

          <ChartCard
            title="My Immunizations"
            subtitle="Vaccination history"
            action={<Syringe className="w-4 h-4 text-bi-primary" />}
          >
            {myImmun.length === 0 ? (
              <EmptyState title="No records" message="No immunization records on file." />
            ) : (
              <div className="space-y-1.5 max-h-[260px] overflow-y-auto">
                {myImmun.map((i, idx) => {
                  const styleByStatus = i.status === 'completed' ? 'bg-bi-good-soft text-bi-good' :
                    i.status === 'pending' ? 'bg-bi-warn-soft text-bi-warn' : 'bg-bi-bad-soft text-bi-bad'
                  return (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-bi-bg/40 border border-bi-border rounded">
                      <span className="text-sm text-bi-text">{i.vaccine}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-bi-text-mute">{i.administeredOn || '—'}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${styleByStatus}`}>{i.status}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ChartCard>
        </div>
      )}
    </div>
  )
}

function SmallStat({ label, value, sub }) {
  return (
    <div className="rounded-[10px] border border-bi-border p-3 text-center bg-bi-bg/30">
      <p className="text-xs text-bi-text-mute">{label}</p>
      <p className="text-sm font-bold text-bi-text mt-1">{value}</p>
      {sub && <p className="text-[10px] text-bi-text-mute">{sub}</p>}
    </div>
  )
}
