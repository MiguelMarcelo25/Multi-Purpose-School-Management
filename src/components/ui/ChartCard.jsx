// src/components/ui/ChartCard.jsx
export default function ChartCard({ title, subtitle, action, children, className = '' }) {
  return (
    <div className={`bg-bi-card border border-bi-border rounded-[10px] p-[14px] ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-bi-text">{title}</h3>
          {subtitle && <p className="text-xs text-bi-text-mute mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  )
}
