// src/components/ui/AlertItem.jsx
const SEVERITY_STYLES = {
  High:   'bg-bi-bad-soft text-bi-bad',
  Medium: 'bg-bi-warn-soft text-bi-warn',
  Low:    'bg-bi-tint text-bi-text-soft'
}

export default function AlertItem({ severity, studentName, type, detectedAt, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2 py-2 -mx-2 rounded hover:bg-bi-tint transition-colors text-left border-b border-bi-tint last:border-b-0"
    >
      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${SEVERITY_STYLES[severity] || SEVERITY_STYLES.Low}`}>
        {severity}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-bi-text truncate">{studentName}</div>
        <div className="text-xs text-bi-text-mute">{type}{detectedAt ? ` · ${detectedAt}` : ''}</div>
      </div>
    </button>
  )
}
