// src/components/TopBar.jsx
// Mobile-only thin bar containing the hamburger that opens the sidebar drawer.
// Each view manages its own PageHeader inside its content area, so this
// component intentionally renders NO title/subtitle (those would duplicate
// the view's PageHeader). On md+ screens the sidebar is always visible and
// this bar is hidden entirely.
import { Menu } from 'lucide-react'

export default function TopBar({ onMenuClick }) {
  if (!onMenuClick) return null
  return (
    <div className="md:hidden bg-bi-bg border-b border-bi-border px-4 py-3 flex items-center">
      <button
        type="button"
        onClick={onMenuClick}
        className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-bi-border bg-bi-card text-bi-text hover:bg-bi-primary-soft hover:text-bi-primary transition-colors"
        aria-label="Open navigation menu"
      >
        <Menu className="w-5 h-5" />
      </button>
    </div>
  )
}
