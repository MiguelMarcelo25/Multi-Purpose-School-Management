import { createContext, useContext, useEffect, useState } from 'react'
import {
  fetchStudents, fetchTeachers, fetchAlerts, fetchSchoolMetrics,
  chartData, dataMode
} from '../services/dataService.js'

const DataContext = createContext(null)
export const useData = () => useContext(DataContext)

export function DataProvider({ children }) {
  const [state, setState] = useState({
    loading: true,
    error: null,
    students: [],
    teachers: [],
    alerts: [],
    metrics: null,
    charts: chartData,
    mode: dataMode
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [students, teachers, alerts, metrics] = await Promise.all([
          fetchStudents(),
          fetchTeachers(),
          fetchAlerts(),
          fetchSchoolMetrics()
        ])
        if (cancelled) return
        setState((s) => ({ ...s, loading: false, students, teachers, alerts, metrics }))
      } catch (err) {
        if (cancelled) return
        console.error('Data load failed', err)
        setState((s) => ({ ...s, loading: false, error: err.message || 'Failed to load data' }))
      }
    })()
    return () => { cancelled = true }
  }, [])

  return <DataContext.Provider value={state}>{children}</DataContext.Provider>
}
