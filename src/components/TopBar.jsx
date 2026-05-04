// src/components/TopBar.jsx
import { Menu } from 'lucide-react'
import { PageHeader } from './ui'

export default function TopBar({ title, subtitle, actions, onMenuClick }) {
  return (
    <div className="bg-bi-bg px-6 pt-6">
      <div className="flex items-start gap-3">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-md border border-bi-border bg-bi-card text-bi-text hover:bg-bi-primary-soft hover:text-bi-primary transition-colors flex-shrink-0 mt-1"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <PageHeader title={title} subtitle={subtitle} actions={actions} />
        </div>
      </div>
    </div>
  )
}
