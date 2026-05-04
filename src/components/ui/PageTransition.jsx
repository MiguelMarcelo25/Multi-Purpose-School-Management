// src/components/ui/PageTransition.jsx
// Wraps page content; on first mount fades from opacity-0 to opacity-100 over 200ms.
import { useEffect, useState } from 'react'

export default function PageTransition({ children, className = '' }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div
      className={`transition-opacity duration-200 ease-out ${visible ? 'opacity-100' : 'opacity-0'} ${className}`}
    >
      {children}
    </div>
  )
}
