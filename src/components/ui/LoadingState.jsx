// src/components/ui/LoadingState.jsx
export default function LoadingState({ rows = 3, variant = 'rows' }) {
  if (variant === 'kpis') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-bi-card border border-bi-border rounded-[10px] p-3 animate-pulse">
            <div className="h-3 w-16 bg-bi-tint rounded" />
            <div className="h-7 w-20 bg-bi-tint rounded mt-2" />
            <div className="h-3 w-14 bg-bi-tint rounded mt-1" />
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 bg-bi-tint rounded animate-pulse" />
      ))}
    </div>
  )
}
