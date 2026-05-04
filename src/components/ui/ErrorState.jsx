// src/components/ui/ErrorState.jsx
import { AlertTriangle } from 'lucide-react'

export default function ErrorState({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div className="bg-bi-bad-soft border border-bi-bad/20 rounded-[10px] p-4 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-bi-bad flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-bi-bad">{title}</h3>
        {message && <p className="text-xs text-bi-bad/90 mt-1">{message}</p>}
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-3 text-xs font-semibold text-bi-bad hover:text-bi-primary-hover underline"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  )
}
