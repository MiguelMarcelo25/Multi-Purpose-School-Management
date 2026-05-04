// src/components/ui/PageHeader.jsx
export default function PageHeader({ title, subtitle, actions }) {
  return (
    <header className="flex items-start justify-between mb-5">
      <div>
        <h1 className="text-[28px] font-bold text-bi-text leading-tight tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-bi-text-soft mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </header>
  )
}
