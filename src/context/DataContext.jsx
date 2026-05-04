// src/context/DataContext.jsx — full rewrite
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import {
  fetchStudents, fetchTeachers, fetchAlerts, fetchSchoolMetrics,
  fetchPredictions, fetchAcademics, fetchAttendance, fetchHealthRecords,
  chartData, dataMode
} from '../services/dataService.js'
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'

const DataContext = createContext(null)
export const useData = () => useContext(DataContext)

const INITIAL = {
  loading: true,
  error: null,
  students: [],
  teachers: [],
  alerts: [],
  metrics: null,
  predictions: [],
  academics: { bySubject: [], byGrade: [], honorRoll: [] },
  attendance: { byDay: [], bySection: [] },
  healthRecords: { records: [], immunizations: [], visits: [] },
  charts: chartData,
  mode: dataMode
}

export function DataProvider({ children }) {
  const [state, setState] = useState(INITIAL)

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      // Pre-warm the auth session so all 8 parallel fetches below share a
      // single resolved token instead of each racing the auth lock.
      if (isSupabaseConfigured) {
        await supabase.auth.getSession()
      }
      const [students, teachers, alerts, metrics, predictions, academics, attendance, healthRecords] = await Promise.all([
        fetchStudents(),
        fetchTeachers(),
        fetchAlerts(),
        fetchSchoolMetrics(),
        fetchPredictions(),
        fetchAcademics(),
        fetchAttendance(),
        fetchHealthRecords()
      ])
      setState((s) => ({
        ...s,
        loading: false,
        students, teachers, alerts, metrics,
        predictions, academics, attendance, healthRecords
      }))
    } catch (err) {
      console.error('Data load failed', err)
      setState((s) => ({ ...s, loading: false, error: err.message || 'Failed to load data' }))
    }
  }, [])

  useEffect(() => { load() }, [load])

  return <DataContext.Provider value={{ ...state, retry: load }}>{children}</DataContext.Provider>
}
