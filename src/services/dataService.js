// Data service: fetches from Supabase if configured, otherwise returns
// the in-memory mock data so the app keeps working before backend setup.

import { supabase, isSupabaseConfigured } from '../lib/supabase.js'
import {
  STUDENTS_WITH_RISK as MOCK_STUDENTS,
  TEACHERS as MOCK_TEACHERS,
  ALERTS as MOCK_ALERTS,
  SCHOOL_METRICS as MOCK_METRICS,
  ENROLLMENT_FORECAST,
  ATTENDANCE_BY_MONTH,
  GRADE_PERFORMANCE,
  SUBJECT_PERFORMANCE,
  RISK_DISTRIBUTION,
  computeRisk
} from '../data/mockData.js'

export const dataMode = isSupabaseConfigured ? 'live' : 'mock'

// ---------------------------------------------------------------------
// Students (with attendance %, average grade, latest risk)
// ---------------------------------------------------------------------
export async function fetchStudents() {
  if (!isSupabaseConfigured) return MOCK_STUDENTS

  const { data, error } = await supabase
    .from('v_student_overview')
    .select('*')
    .order('full_name')

  if (error) throw error

  // Reshape DB rows to match the shape the views already expect
  return data.map((r) => ({
    id: r.lrn,
    name: r.full_name,
    gender: r.gender,
    age: r.age,
    grade: r.grade_level,
    section: r.section_name,
    attendance: Number(r.attendance_pct) || 0,
    tardiness: r.tardiness_count || 0,
    average: Number(r.average_grade) || 0,
    behavior: 'Good',
    householdIncome: r.household_income,
    parentInvolvement: r.parent_involvement,
    enrolled: 2025,
    guardian: '',
    contact: '',
    address: '',
    grades: {},
    risk: r.risk_score != null
      ? { score: r.risk_score, level: r.risk_level, projectedAverage: Number(r.projected_average), failingSubjects: r.failing_subjects }
      : computeRisk({
          attendance: Number(r.attendance_pct) || 0,
          tardiness: r.tardiness_count || 0,
          average: Number(r.average_grade) || 0,
          grades: {},
          behavior: 'Good',
          householdIncome: r.household_income,
          parentInvolvement: r.parent_involvement
        })
  }))
}

// ---------------------------------------------------------------------
// Teachers
// ---------------------------------------------------------------------
export async function fetchTeachers() {
  if (!isSupabaseConfigured) return MOCK_TEACHERS

  const { data, error } = await supabase
    .from('teachers')
    .select(`
      id, employee_no, full_name, years_exp, rating,
      subject:subjects(name),
      teacher_sections(section:sections(grade_level, name))
    `)

  if (error) throw error

  return data.map((t) => {
    const sections = t.teacher_sections?.map((ts) => ts.section) || []
    const firstSection = sections[0]
    return {
      id: t.employee_no,
      name: t.full_name,
      subject: t.subject?.name || '—',
      grade: firstSection?.grade_level || '—',
      sections: sections.length,
      yearsExp: t.years_exp,
      rating: Number(t.rating) || 0
    }
  })
}

// ---------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------
export async function fetchAlerts({ onlyHigh = false } = {}) {
  if (!isSupabaseConfigured) return MOCK_ALERTS

  let query = supabase
    .from('alerts')
    .select(`
      id, type, severity, note, created_at, resolved,
      student:students(full_name, lrn,
        enrollments(section:sections(grade_level, name))
      )
    `)
    .eq('resolved', false)
    .order('created_at', { ascending: false })

  if (onlyHigh) query = query.eq('severity', 'High')

  const { data, error } = await query.limit(50)
  if (error) throw error

  return data.map((a) => {
    const sec = a.student?.enrollments?.[0]?.section
    return {
      id: `A-${a.id}`,
      student: a.student?.full_name,
      studentId: a.student?.lrn,
      grade: sec?.grade_level,
      section: sec?.name,
      type: a.type,
      severity: a.severity,
      detectedAt: a.created_at?.slice(0, 10),
      note: a.note
    }
  })
}

// ---------------------------------------------------------------------
// School-level metrics (computed client-side from students view)
// ---------------------------------------------------------------------
export async function fetchSchoolMetrics() {
  if (!isSupabaseConfigured) return MOCK_METRICS

  const students = await fetchStudents()
  const total = students.length
  const avgAttendance = round1(students.reduce((a, s) => a + s.attendance, 0) / total)
  const avgGrade      = round1(students.reduce((a, s) => a + s.average, 0)    / total)
  const highRisk      = students.filter((s) => s.risk.level === 'High').length
  const mediumRisk    = students.filter((s) => s.risk.level === 'Medium').length
  const lowRisk       = students.filter((s) => s.risk.level === 'Low').length

  return {
    totalStudents: total,
    teachers: 42,
    sections: 12,
    grades: 6,
    avgAttendance,
    avgGrade,
    highRisk,
    mediumRisk,
    lowRisk,
    dropoutRiskPct: Math.round((highRisk / total) * 1000) / 10
  }
}

// ---------------------------------------------------------------------
// Predictions (with student joins for the predictive view)
// ---------------------------------------------------------------------
export async function fetchPredictions() {
  if (!isSupabaseConfigured) return MOCK_STUDENTS.map((s) => ({ ...computeRisk(s), studentName: s.name, lrn: s.id }))

  const { data, error } = await supabase
    .from('predictions')
    .select(`
      id, risk_score, risk_level, projected_average, failing_subjects, computed_at,
      student:students(lrn, full_name, gender, age,
        enrollments(section:sections(grade_level, name))
      )
    `)
    .order('risk_score', { ascending: false })

  if (error) throw error
  return data.map((p) => ({
    id: p.id,
    riskScore: p.risk_score,
    riskLevel: p.risk_level,
    projectedAverage: Number(p.projected_average) || 0,
    failingSubjects: p.failing_subjects,
    computedAt: p.computed_at?.slice(0, 10),
    studentName: p.student?.full_name,
    lrn: p.student?.lrn,
    grade: p.student?.enrollments?.[0]?.section?.grade_level,
    section: p.student?.enrollments?.[0]?.section?.name
  }))
}

// ---------------------------------------------------------------------
// Academics (grade aggregates by subject + grade level)
// ---------------------------------------------------------------------
export async function fetchAcademics() {
  if (!isSupabaseConfigured) return { bySubject: SUBJECT_PERFORMANCE, byGrade: GRADE_PERFORMANCE, honorRoll: [] }

  const { data, error } = await supabase
    .from('grades')
    .select(`
      grade, quarter,
      subject:subjects(name),
      student:students(full_name, lrn,
        enrollments(section:sections(grade_level, name))
      )
    `)
  if (error) throw error

  // Aggregate by subject
  const bySubjectMap = {}
  for (const g of data) {
    const subj = g.subject?.name || 'Unknown'
    bySubjectMap[subj] ??= { subject: subj, sum: 0, count: 0 }
    bySubjectMap[subj].sum += Number(g.grade)
    bySubjectMap[subj].count++
  }
  const bySubject = Object.values(bySubjectMap).map((s) => ({ subject: s.subject, average: Math.round((s.sum / s.count) * 10) / 10 }))

  // Aggregate by grade level
  const byGradeMap = {}
  for (const g of data) {
    const gl = g.student?.enrollments?.[0]?.section?.grade_level
    if (!gl) continue
    byGradeMap[gl] ??= { grade: `Grade ${gl}`, sum: 0, count: 0 }
    byGradeMap[gl].sum += Number(g.grade)
    byGradeMap[gl].count++
  }
  const byGrade = Object.values(byGradeMap).sort((a, b) => a.grade.localeCompare(b.grade))
    .map((g) => ({ grade: g.grade, average: Math.round((g.sum / g.count) * 10) / 10 }))

  // Honor roll: students whose average across all subjects >= 90
  const studentMap = {}
  for (const g of data) {
    const name = g.student?.full_name
    if (!name) continue
    studentMap[name] ??= { name, lrn: g.student.lrn, sum: 0, count: 0 }
    studentMap[name].sum += Number(g.grade)
    studentMap[name].count++
  }
  const honorRoll = Object.values(studentMap)
    .map((s) => ({ name: s.name, lrn: s.lrn, average: Math.round((s.sum / s.count) * 10) / 10 }))
    .filter((s) => s.average >= 90)
    .sort((a, b) => b.average - a.average)

  return { bySubject, byGrade, honorRoll }
}

// ---------------------------------------------------------------------
// Attendance (daily aggregates and per-section breakdown)
// ---------------------------------------------------------------------
export async function fetchAttendance() {
  if (!isSupabaseConfigured) return { byDay: ATTENDANCE_BY_MONTH, bySection: [] }

  const { data, error } = await supabase
    .from('attendance')
    .select(`date, status, student:students(enrollments(section:sections(grade_level, name)))`)
    .gte('date', new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10))
  if (error) throw error

  // Daily aggregates
  const byDayMap = {}
  for (const a of data) {
    byDayMap[a.date] ??= { date: a.date, present: 0, total: 0 }
    byDayMap[a.date].total++
    if (a.status === 'present') byDayMap[a.date].present++
  }
  const byDay = Object.values(byDayMap).sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({ date: d.date, attendance_pct: Math.round((d.present / d.total) * 100 * 10) / 10 }))

  // Section aggregates
  const bySectionMap = {}
  for (const a of data) {
    const sec = a.student?.enrollments?.[0]?.section
    if (!sec) continue
    const key = `Grade ${sec.grade_level} ${sec.name}`
    bySectionMap[key] ??= { section: key, present: 0, total: 0 }
    bySectionMap[key].total++
    if (a.status === 'present') bySectionMap[key].present++
  }
  const bySection = Object.values(bySectionMap)
    .map((s) => ({ section: s.section, attendance_pct: Math.round((s.present / s.total) * 100 * 10) / 10 }))
    .sort((a, b) => a.section.localeCompare(b.section))

  return { byDay, bySection }
}

// ---------------------------------------------------------------------
// Static-ish chart data — re-exported for now; later move to live aggregations
// ---------------------------------------------------------------------
export const chartData = {
  enrollmentForecast: ENROLLMENT_FORECAST,
  attendanceByMonth:  ATTENDANCE_BY_MONTH,
  gradePerformance:   GRADE_PERFORMANCE,
  subjectPerformance: SUBJECT_PERFORMANCE,
  riskDistribution:   RISK_DISTRIBUTION
}

function round1(n) { return Math.round(n * 10) / 10 }
