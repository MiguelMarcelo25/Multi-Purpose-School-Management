import {
  Users, GraduationCap, CalendarCheck, AlertTriangle, Brain, TrendingUp,
  ArrowRight, Sparkles
} from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts'
import {
  PageHeader, KPICard, ChartCard, AlertItem,
  EmptyState, LoadingState, ErrorState
} from '../components/ui'
import { useData } from '../context/DataContext.jsx'

export default function Dashboard({ onNavigate }) {
  const { metrics, alerts, charts, loading, error, retry } = useData()

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <PageHeader title="Dashboard" subtitle="School-wide overview" />
        <LoadingState variant="kpis" />
        <LoadingState rows={4} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <PageHeader title="Dashboard" subtitle="School-wide overview" />
        <ErrorState title="Failed to load dashboard" message={error} onRetry={retry} />
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <PageHeader title="Dashboard" subtitle="School-wide overview" />
        <EmptyState title="No metrics yet" message="School metrics will appear once data has been seeded." />
      </div>
    )
  }

  // Build risk distribution from current metrics so it stays in sync with live data
  const riskDistribution = [
    { name: 'Low Risk',    value: metrics.lowRisk,    color: '#15803d' },
    { name: 'Medium Risk', value: metrics.mediumRisk, color: '#b45309' },
    { name: 'High Risk',   value: metrics.highRisk,   color: '#b91c1c' }
  ]

  return (
    <div className="p-4 md:p-6 space-y-5">
      <PageHeader
        title="Dashboard"
        subtitle="School-wide overview · SY 2025–2026"
        actions={
          <button
            onClick={() => onNavigate?.('predictive')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-bi-primary text-white rounded hover:bg-bi-primary-hover"
          >
            <Sparkles className="w-3.5 h-3.5" /> View AI Predictions <ArrowRight className="w-3.5 h-3.5" />
          </button>
        }
      />

      {/* AI summary callout */}
      <div className="bg-bi-primary-soft border border-bi-primary/20 rounded-[10px] p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-bi-primary text-white flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="text-sm text-bi-text-soft">
          <span className="font-semibold text-bi-text">AI Insight — </span>
          The predictive model identifies <span className="font-semibold text-bi-bad">{metrics.highRisk} students</span> at
          high dropout risk this quarter. Attendance trend remains stable at{' '}
          <span className="font-semibold text-bi-text">{metrics.avgAttendance}%</span>. Recommended focus:
          Grade 4 Mathematics and Grade 6 attendance interventions.
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <KPICard
          label="Total Students"
          value={metrics.totalStudents}
          icon={Users}
          trend={{ direction: 'up', tone: 'good', text: `+4.2% · ${metrics.sections} sections` }}
        />
        <KPICard
          label="Avg. Performance"
          value={`${metrics.avgGrade}%`}
          icon={GraduationCap}
          trend={{ direction: 'up', tone: 'good', text: '+2.1% vs last quarter' }}
        />
        <KPICard
          label="Attendance Rate"
          value={`${metrics.avgAttendance}%`}
          icon={CalendarCheck}
          trend={{ direction: 'down', tone: 'bad', text: '-0.8% YTD' }}
        />
        <KPICard
          label="High-Risk Students"
          value={metrics.highRisk}
          icon={AlertTriangle}
          emphasis="danger"
          trend={{ direction: 'down', tone: 'good', text: `-6.2% · ${metrics.dropoutRiskPct}% of population` }}
        />
      </div>

      {/* Main charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2">
          <ChartCard
            title="Enrollment Trend & Forecast"
            subtitle="Linear projection for SY 2026–2027 and 2027–2028"
            action={
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-bi-primary-soft text-bi-primary px-1.5 py-0.5 rounded">
                <Brain className="w-3 h-3" /> AI Forecast
              </span>
            }
          >
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={charts.enrollmentForecast}>
                <defs>
                  <linearGradient id="grdActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#b45309" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#b45309" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="grdProj" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#92400e" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#92400e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e4dc" />
                <XAxis dataKey="year" stroke="#a8a29e" fontSize={11} />
                <YAxis stroke="#a8a29e" fontSize={11} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e8e4dc' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="students"  stroke="#b45309" strokeWidth={2.5} fill="url(#grdActual)" name="Actual" />
                <Area type="monotone" dataKey="projected" stroke="#92400e" strokeWidth={2.5} strokeDasharray="6 4" fill="url(#grdProj)" name="Projected" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <ChartCard title="Risk Distribution" subtitle="Predictive risk levels (current quarter)">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={riskDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                {riskDistribution.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {riskDistribution.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="text-bi-text-soft">{d.name}</span>
                </div>
                <span className="font-semibold text-bi-text tabular-nums">{d.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Secondary row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2">
          <ChartCard
            title="Monthly Attendance Trend"
            subtitle="School year 2025–2026"
            action={
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-bi-good-soft text-bi-good px-1.5 py-0.5 rounded">
                <TrendingUp className="w-3 h-3" /> Stable
              </span>
            }
          >
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={charts.attendanceByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e4dc" />
                <XAxis dataKey="month" stroke="#a8a29e" fontSize={11} />
                <YAxis stroke="#a8a29e" fontSize={11} domain={[80, 100]} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e8e4dc' }} />
                <Line type="monotone" dataKey="attendance" stroke="#15803d" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <ChartCard title="Performance by Grade" subtitle="Average across all subjects">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={charts.gradePerformance} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e4dc" />
              <XAxis type="number" stroke="#a8a29e" fontSize={11} domain={[70, 95]} />
              <YAxis type="category" dataKey="grade" stroke="#a8a29e" fontSize={11} width={70} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e8e4dc' }} />
              <Bar dataKey="average" fill="#b45309" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Alerts */}
      <ChartCard
        title="Recent AI-Generated Alerts"
        subtitle="High-priority interventions detected by predictive engine"
        action={
          <button
            onClick={() => onNavigate?.('alerts')}
            className="text-xs text-bi-primary font-semibold hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </button>
        }
      >
        {alerts.length === 0 ? (
          <EmptyState title="No alerts" message="No high-priority alerts at this time." />
        ) : (
          <div>
            {alerts.slice(0, 5).map((alert) => (
              <AlertItem
                key={alert.id}
                severity={alert.severity || 'High'}
                studentName={alert.student}
                type={`${alert.type} · Grade ${alert.grade}-${alert.section}`}
                detectedAt={alert.detectedAt}
                onClick={() => onNavigate?.('alerts')}
              />
            ))}
          </div>
        )}
      </ChartCard>
    </div>
  )
}
