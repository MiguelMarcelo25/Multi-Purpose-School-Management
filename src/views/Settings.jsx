// src/views/Settings.jsx
import { PageHeader, ChartCard } from '../components/ui'
import { useAuth } from '../context/AuthContext.jsx'

export default function Settings() {
  const { profile, signOut } = useAuth()
  return (
    <div className="p-6 max-w-3xl">
      <PageHeader title="Settings" subtitle="Account and school configuration" />

      <div className="space-y-3">
        <ChartCard title="Account">
          <dl className="text-sm space-y-2">
            <div className="flex justify-between"><dt className="text-bi-text-mute">Name</dt><dd className="text-bi-text font-medium">{profile?.full_name || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-bi-text-mute">Email</dt><dd className="text-bi-text font-medium">{profile?.email || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-bi-text-mute">Role</dt><dd className="text-bi-text font-medium capitalize">{profile?.role || '—'}</dd></div>
          </dl>
          <button onClick={signOut} className="mt-4 px-3 py-1.5 text-xs font-semibold bg-bi-bad-soft text-bi-bad rounded hover:bg-bi-bad hover:text-white transition-colors">
            Sign out
          </button>
        </ChartCard>

        <ChartCard title="School profile" subtitle="Basic information shown across the dashboard">
          <dl className="text-sm space-y-2">
            <div className="flex justify-between"><dt className="text-bi-text-mute">School name</dt><dd className="text-bi-text font-medium">Bagong Ilog Elementary School</dd></div>
            <div className="flex justify-between"><dt className="text-bi-text-mute">Location</dt><dd className="text-bi-text font-medium">Pasig City</dd></div>
            <div className="flex justify-between"><dt className="text-bi-text-mute">School year</dt><dd className="text-bi-text font-medium">2025-2026</dd></div>
          </dl>
        </ChartCard>

        <ChartCard title="Risk model" subtitle="Predictive analytics configuration">
          <dl className="text-sm space-y-2">
            <div className="flex justify-between"><dt className="text-bi-text-mute">Model version</dt><dd className="text-bi-text font-medium">v2.3</dd></div>
            <div className="flex justify-between"><dt className="text-bi-text-mute">Last computed</dt><dd className="text-bi-text font-medium">On seed</dd></div>
          </dl>
        </ChartCard>
      </div>
    </div>
  )
}
