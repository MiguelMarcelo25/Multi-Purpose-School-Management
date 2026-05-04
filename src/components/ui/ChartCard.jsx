// src/components/ui/ChartCard.jsx
export default function ChartCard({ title, subtitle, action, children, className = '' }) {
  return (
    <div className={`bg-bi-card border border-bi-border rounded-[10px] p-3 sm:p-[14px] ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-bi-text">{title}</h3>
          {subtitle && <p className="text-xs text-bi-text-mute mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  )
}
