// src/components/ui/RiskBadge.jsx
const STYLES = {
  Low:    'bg-bi-good-soft text-bi-good',
  Medium: 'bg-bi-warn-soft text-bi-warn',
  High:   'bg-bi-bad-soft text-bi-bad'
}

export default function RiskBadge({ level }) {
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded ${STYLES[level] || STYLES.Low}`}>
      {level}
    </span>
  )
}
