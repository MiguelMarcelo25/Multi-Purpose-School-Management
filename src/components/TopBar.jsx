// src/components/TopBar.jsx
import { PageHeader } from './ui'

export default function TopBar({ title, subtitle, actions }) {
  return (
    <div className="bg-bi-bg px-6 pt-6">
      <PageHeader title={title} subtitle={subtitle} actions={actions} />
    </div>
  )
}
