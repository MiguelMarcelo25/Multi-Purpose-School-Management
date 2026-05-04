// src/components/ui/KPICard.jsx
import { TrendingUp, TrendingDown } from 'lucide-react'

export default function KPICard({ label, value, trend, icon: Icon, emphasis = 'default' }) {
  const valueColor = emphasis === 'danger' ? 'text-bi-bad' : 'text-bi-text'
  const trendColor = trend?.tone === 'good' ? 'text-bi-good' : trend?.tone === 'bad' ? 'text-bi-bad' : 'text-bi-text-mute'
  const TrendIcon = trend?.direction === 'up' ? TrendingUp : trend?.direction === 'down' ? TrendingDown : null

  return (
    <div className="bg-bi-card border border-bi-border rounded-[10px] p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-bi-text-mute uppercase tracking-wider">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-bi-text-mute" />}
      </div>
      <div className={`text-xl sm:text-2xl font-bold mt-1 tabular-nums tracking-tight break-words ${valueColor}`}>{value}</div>
      {trend && (
        <div className={`text-xs font-medium mt-0.5 flex items-center gap-1 ${trendColor}`}>
          {TrendIcon && <TrendIcon className="w-3 h-3" />}
          {trend.text}
        </div>
      )}
    </div>
  )
}
