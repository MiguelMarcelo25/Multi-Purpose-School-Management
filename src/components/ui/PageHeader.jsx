// src/components/ui/PageHeader.jsx
export default function PageHeader({ title, subtitle, actions }) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-[28px] font-bold text-bi-text leading-tight tracking-tight break-words">{title}</h1>
        {subtitle && <p className="text-sm text-bi-text-soft mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap sm:flex-shrink-0">{actions}</div>}
    </header>
  )
}
