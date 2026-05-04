// src/components/ui/NavItem.jsx
export function NavGroup({ label, children }) {
  // If all children render null (no permitted items), hide the group label too
  const visibleChildren = Array.isArray(children) ? children.filter(Boolean) : children
  if (!visibleChildren || (Array.isArray(visibleChildren) && visibleChildren.length === 0)) return null
  return (
    <div className="mt-3">
      <div className="text-[10px] font-semibold text-bi-text-mute uppercase tracking-wider px-3 mb-1">
        {label}
      </div>
      {children}
    </div>
  )
}

export default function NavItem({ icon: Icon, label, active, onClick, hidden = false }) {
  if (hidden) return null
  return (
    <button
      onClick={onClick}
      className={`relative w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors text-left
        ${active
          ? 'bg-bi-tint text-bi-text font-semibold'
          : 'text-bi-text-soft hover:bg-bi-tint/60 font-medium'}`}
    >
      {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-bi-primary rounded-r" />}
      {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
      <span className="truncate">{label}</span>
    </button>
  )
}
