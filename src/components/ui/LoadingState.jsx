// src/components/ui/LoadingState.jsx
import { School } from 'lucide-react'

// Subtle skeleton block — slightly tinted, slow pulse
function Skeleton({ className = '' }) {
  return <div className={`bg-bi-tint rounded animate-pulse ${className}`} />
}

export default function LoadingState({ rows = 3, variant = 'rows', label = 'Loading' }) {
  if (variant === 'page') {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className="min-h-[60vh] w-full flex flex-col items-center justify-center text-center"
      >
        <div className="w-12 h-12 rounded-xl bg-bi-primary-soft flex items-center justify-center">
          <School className="w-6 h-6 text-bi-primary" />
        </div>
        <p className="mt-4 text-sm text-bi-text-soft">{label}</p>
        <div className="mt-3 flex items-center gap-1.5" aria-hidden="true">
          <span
            className="w-1.5 h-1.5 rounded-full bg-bi-text-mute/60 animate-pulse"
            style={{ animationDelay: '0ms', animationDuration: '1200ms' }}
          />
          <span
            className="w-1.5 h-1.5 rounded-full bg-bi-text-mute/60 animate-pulse"
            style={{ animationDelay: '200ms', animationDuration: '1200ms' }}
          />
          <span
            className="w-1.5 h-1.5 rounded-full bg-bi-text-mute/60 animate-pulse"
            style={{ animationDelay: '400ms', animationDuration: '1200ms' }}
          />
        </div>
        <span className="sr-only">{label}</span>
      </div>
    )
  }

  if (variant === 'kpis') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5" role="status" aria-busy="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-bi-card border border-bi-border rounded-[10px] p-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-20 mt-2" />
            <Skeleton className="h-3 w-14 mt-1" />
          </div>
        ))}
        <span className="sr-only">{label}</span>
      </div>
    )
  }

  return (
    <div className="space-y-2" role="status" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10" />
      ))}
      <span className="sr-only">{label}</span>
    </div>
  )
}
