// Mock data for Bagong Ilog Elementary School
// Used for predictive analytics demonstration

const FIRST_NAMES = [
  'Juan', 'Maria', 'Jose', 'Ana', 'Pedro', 'Liza', 'Mark', 'Andrea', 'Paolo', 'Carla',
  'Miguel', 'Sofia', 'Rafael', 'Bea', 'Diego', 'Isabel', 'Luis', 'Trisha', 'Noel', 'Kim',
  'Joshua', 'Reyna', 'Aaron', 'Patricia', 'Daniel', 'Gabriela', 'Nathan', 'Ella', 'Ivan', 'Mikaela',
  'Ramon', 'Aira', 'Vince', 'Jasmine', 'Allan', 'Camille', 'Bryan', 'Erika', 'Elijah', 'Yana'
]
const LAST_NAMES = [
  'Santos', 'Reyes', 'Cruz', 'Bautista', 'Garcia', 'Mendoza', 'Torres', 'Flores', 'Ramos', 'Aquino',
  'Castillo', 'Villanueva', 'Domingo', 'Navarro', 'Hernandez', 'Pascual', 'Salazar', 'Rosario', 'Tan', 'Lim'
]
const SECTIONS = {
  1: ['Sampaguita', 'Rosal'],
  2: ['Mabini', 'Rizal'],
  3: ['Bonifacio', 'Aguinaldo'],
  4: ['Mahogany', 'Narra'],
  5: ['Saturn', 'Jupiter'],
  6: ['Galileo', 'Newton']
}
const SUBJECTS = ['Filipino', 'English', 'Math', 'Science', 'AralPan', 'MAPEH', 'ESP']

// Deterministic pseudo-random for stable mock data across renders
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rng = mulberry32(42)
const pick = (arr) => arr[Math.floor(rng() * arr.length)]
const between = (min, max) => Math.floor(rng() * (max - min + 1)) + min

// Generate student records
export const STUDENTS = (() => {
  const list = []
  let id = 1000
  for (let grade = 1; grade <= 6; grade++) {
    for (const section of SECTIONS[grade]) {
      const count = between(28, 36)
      for (let i = 0; i < count; i++) {
        const first = pick(FIRST_NAMES)
        const last = pick(LAST_NAMES)
        const attendance = Math.max(55, Math.min(100, Math.round(85 + (rng() - 0.4) * 30)))
        const baseGrade = Math.max(65, Math.min(98, Math.round(82 + (rng() - 0.45) * 25)))
        const grades = {}
        SUBJECTS.forEach((s) => {
          grades[s] = Math.max(60, Math.min(99, baseGrade + between(-6, 6)))
        })
        const average = Math.round(
          (Object.values(grades).reduce((a, b) => a + b, 0) / SUBJECTS.length) * 100
        ) / 100
        const behavior = pick(['Excellent', 'Very Good', 'Good', 'Satisfactory', 'Needs Improvement'])
        const tardiness = between(0, 18)
        const householdIncome = pick(['Low', 'Low', 'Middle', 'Middle', 'High'])
        const parentInvolvement = pick(['High', 'Medium', 'Medium', 'Low'])
        list.push({
          id: `BIES-${id++}`,
          name: `${first} ${last}`,
          gender: rng() > 0.5 ? 'M' : 'F',
          grade,
          section,
          age: 5 + grade + between(0, 1),
          attendance,
          tardiness,
          grades,
          average,
          behavior,
          householdIncome,
          parentInvolvement,
          enrolled: 2025 - between(0, 5),
          guardian: `${pick(FIRST_NAMES)} ${last}`,
          contact: `09${between(10, 99)}${between(1000000, 9999999)}`,
          address: `${between(1, 999)} Bagong Ilog, Pasig City`
        })
      }
    }
  }
  return list
})()

// Predictive risk model (simple rule-weighted; mimics a logistic regression output)
export function computeRisk(student) {
  let risk = 0
  // Attendance — biggest weight
  if (student.attendance < 75) risk += 35
  else if (student.attendance < 85) risk += 18
  else if (student.attendance < 92) risk += 6
  // Average grade
  if (student.average < 75) risk += 30
  else if (student.average < 80) risk += 18
  else if (student.average < 85) risk += 8
  // Tardiness
  if (student.tardiness > 12) risk += 12
  else if (student.tardiness > 6) risk += 6
  // Behavior
  if (student.behavior === 'Needs Improvement') risk += 10
  else if (student.behavior === 'Satisfactory') risk += 4
  // Socioeconomic factors
  if (student.householdIncome === 'Low') risk += 5
  if (student.parentInvolvement === 'Low') risk += 6
  // Subject failures
  const failing = Object.values(student.grades).filter((g) => g < 75).length
  risk += failing * 4

  risk = Math.max(0, Math.min(100, risk))
  let level
  if (risk >= 60) level = 'High'
  else if (risk >= 35) level = 'Medium'
  else level = 'Low'

  // Predicted next-quarter average using attendance & trend
  const projected = Math.round(
    Math.max(60, Math.min(99,
      student.average + (student.attendance - 88) * 0.18 - (student.tardiness * 0.25) + (rng() - 0.5) * 2
    )) * 10
  ) / 10

  return { score: risk, level, projectedAverage: projected, failingSubjects: failing }
}

// Enriched student list (with risk scores)
export const STUDENTS_WITH_RISK = STUDENTS.map((s) => ({ ...s, risk: computeRisk(s) }))

// Aggregate metrics
export const SCHOOL_METRICS = (() => {
  const total = STUDENTS_WITH_RISK.length
  const avgAttendance = Math.round(
    (STUDENTS_WITH_RISK.reduce((a, s) => a + s.attendance, 0) / total) * 10
  ) / 10
  const avgGrade = Math.round(
    (STUDENTS_WITH_RISK.reduce((a, s) => a + s.average, 0) / total) * 10
  ) / 10
  const highRisk = STUDENTS_WITH_RISK.filter((s) => s.risk.level === 'High').length
  const mediumRisk = STUDENTS_WITH_RISK.filter((s) => s.risk.level === 'Medium').length
  const lowRisk = STUDENTS_WITH_RISK.filter((s) => s.risk.level === 'Low').length
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
})()

// Time-series: enrollment over recent years
export const ENROLLMENT_TREND = [
  { year: '2020', students: 612 },
  { year: '2021', students: 648 },
  { year: '2022', students: 695 },
  { year: '2023', students: 731 },
  { year: '2024', students: 768 },
  { year: '2025', students: SCHOOL_METRICS.totalStudents }
]
// Simple linear projection for the next 2 years
export const ENROLLMENT_FORECAST = (() => {
  const xs = ENROLLMENT_TREND.map((_, i) => i)
  const ys = ENROLLMENT_TREND.map((d) => d.students)
  const n = xs.length
  const sx = xs.reduce((a, b) => a + b, 0)
  const sy = ys.reduce((a, b) => a + b, 0)
  const sxy = xs.reduce((a, b, i) => a + b * ys[i], 0)
  const sxx = xs.reduce((a, b) => a + b * b, 0)
  const m = (n * sxy - sx * sy) / (n * sxx - sx * sx)
  const c = (sy - m * sx) / n
  return [
    ...ENROLLMENT_TREND.map((d) => ({ ...d, projected: null })),
    { year: '2026', students: null, projected: Math.round(m * n + c) },
    { year: '2027', students: null, projected: Math.round(m * (n + 1) + c) }
  ]
})()

// Attendance pattern by month (current school year)
export const ATTENDANCE_BY_MONTH = [
  { month: 'Jun', attendance: 96.2 },
  { month: 'Jul', attendance: 94.8 },
  { month: 'Aug', attendance: 92.4 },
  { month: 'Sep', attendance: 90.1 },
  { month: 'Oct', attendance: 88.3 },
  { month: 'Nov', attendance: 87.6 },
  { month: 'Dec', attendance: 84.2 },
  { month: 'Jan', attendance: 88.9 },
  { month: 'Feb', attendance: 90.4 },
  { month: 'Mar', attendance: 91.7 },
  { month: 'Apr', attendance: SCHOOL_METRICS.avgAttendance }
]

// Grade-level performance
export const GRADE_PERFORMANCE = (() => {
  const buckets = {}
  for (let g = 1; g <= 6; g++) buckets[g] = []
  STUDENTS_WITH_RISK.forEach((s) => buckets[s.grade].push(s.average))
  return Object.entries(buckets).map(([g, arr]) => ({
    grade: `Grade ${g}`,
    average: Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10,
    students: arr.length
  }))
})()

// Subject performance (average across school)
export const SUBJECT_PERFORMANCE = SUBJECTS.map((subj) => {
  const all = STUDENTS_WITH_RISK.map((s) => s.grades[subj])
  return {
    subject: subj,
    average: Math.round((all.reduce((a, b) => a + b, 0) / all.length) * 10) / 10,
    passing: Math.round((all.filter((g) => g >= 75).length / all.length) * 1000) / 10
  }
})

// Risk distribution breakdown
export const RISK_DISTRIBUTION = [
  { name: 'Low Risk', value: SCHOOL_METRICS.lowRisk, color: '#10b981' },
  { name: 'Medium Risk', value: SCHOOL_METRICS.mediumRisk, color: '#f59e0b' },
  { name: 'High Risk', value: SCHOOL_METRICS.highRisk, color: '#ef4444' }
]

// Teachers
export const TEACHERS = [
  { id: 'T-001', name: 'Mrs. Corazon Aquino',     subject: 'Filipino', grade: 1, sections: 2, yearsExp: 14, rating: 4.7 },
  { id: 'T-002', name: 'Mr. Andres Bonifacio',    subject: 'AralPan',  grade: 5, sections: 2, yearsExp: 9,  rating: 4.5 },
  { id: 'T-003', name: 'Ms. Gabriela Silang',     subject: 'English',  grade: 3, sections: 2, yearsExp: 11, rating: 4.8 },
  { id: 'T-004', name: 'Mr. Jose Rizal',          subject: 'Science',  grade: 6, sections: 2, yearsExp: 18, rating: 4.9 },
  { id: 'T-005', name: 'Ms. Melchora Aquino',     subject: 'MAPEH',    grade: 2, sections: 2, yearsExp: 6,  rating: 4.4 },
  { id: 'T-006', name: 'Mr. Apolinario Mabini',   subject: 'Math',     grade: 4, sections: 2, yearsExp: 12, rating: 4.6 },
  { id: 'T-007', name: 'Ms. Tandang Sora',        subject: 'ESP',      grade: 1, sections: 2, yearsExp: 22, rating: 4.9 },
  { id: 'T-008', name: 'Mr. Emilio Jacinto',      subject: 'Math',     grade: 6, sections: 1, yearsExp: 8,  rating: 4.3 }
]

// Recent alerts driven by predictive engine
export const ALERTS = STUDENTS_WITH_RISK
  .filter((s) => s.risk.level === 'High')
  .slice(0, 8)
  .map((s, i) => ({
    id: `A-${i + 1}`,
    student: s.name,
    studentId: s.id,
    grade: s.grade,
    section: s.section,
    type:
      s.attendance < 80 ? 'Attendance' :
      s.average < 78 ? 'Academic' :
      s.tardiness > 10 ? 'Tardiness' : 'Behavior',
    severity: 'High',
    detectedAt: `2026-04-${10 + i < 30 ? 10 + i : 28}`,
    note: `Predictive model flagged ${s.name} — ${Math.round(s.risk.score)}% risk score.`
  }))

// ---------------------------------------------------------------------
// Health records (mock) — one per student
// ---------------------------------------------------------------------
const BMI_CATEGORIES = ['Wasted', 'Normal', 'Normal', 'Normal', 'Overweight', 'Obese']
const BLOOD_TYPES   = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-']
const ALLERGIES     = ['None', 'None', 'Peanuts', 'Pollen', 'Dust', 'Shellfish']

export const HEALTH_RECORDS = STUDENTS_WITH_RISK.map((s, i) => {
  const heightCm = 100 + s.age * 5 + between(-6, 6)
  const weightKg = 18 + s.age * 2.4 + between(-3, 6)
  const bmi = Math.round((weightKg / Math.pow(heightCm / 100, 2)) * 10) / 10
  let category
  if (bmi < 14) category = 'Wasted'
  else if (bmi < 18) category = 'Normal'
  else if (bmi < 22) category = 'Overweight'
  else category = 'Obese'
  return {
    id: i + 1,
    studentId: s.id,
    measuredOn: '2026-04-15',
    heightCm: Math.round(heightCm * 10) / 10,
    weightKg: Math.round(weightKg * 10) / 10,
    bmi,
    bmiCategory: category,
    bloodType: BLOOD_TYPES[i % BLOOD_TYPES.length],
    allergies: ALLERGIES[i % ALLERGIES.length],
    medicalConditions: rng() > 0.92 ? 'Asthma' : '',
    vision: rng() > 0.85 ? '20/40' : '20/20',
    hearing: 'Normal'
  }
})

// Vaccines required by DepEd
const VACCINES = ['BCG', 'Hepatitis B', 'DPT', 'Polio', 'MMR', 'HPV', 'COVID-19']
export const IMMUNIZATIONS = STUDENTS_WITH_RISK.flatMap((s) =>
  VACCINES.map((v, i) => ({
    studentId: s.id,
    vaccine: v,
    doseNumber: 1,
    administeredOn: rng() > 0.15 ? `202${between(0, 4)}-${String(between(1, 12)).padStart(2, '0')}-${String(between(1, 28)).padStart(2, '0')}` : null,
    status: rng() > 0.15 ? 'completed' : (rng() > 0.5 ? 'pending' : 'overdue')
  }))
)

// Recent clinic visits
const VISIT_REASONS = ['Headache', 'Stomachache', 'Fever', 'Minor cut', 'Dizziness', 'Bruise from PE']
export const CLINIC_VISITS = STUDENTS_WITH_RISK.slice(0, 25).map((s, i) => ({
  id: i + 1,
  studentId: s.id,
  studentName: s.name,
  grade: s.grade,
  section: s.section,
  visitDate: `2026-04-${String(15 + (i % 15)).padStart(2, '0')}`,
  reason: VISIT_REASONS[i % VISIT_REASONS.length],
  treatment: 'Rest in clinic, paracetamol if needed',
  sentHome: rng() > 0.7
}))

// Quick recommendation engine
export function recommendInterventions(student) {
  const recs = []
  if (student.attendance < 85) recs.push('Schedule parent–teacher meeting to address attendance.')
  if (student.average < 80) recs.push('Enroll in after-school tutorial program.')
  if (student.tardiness > 8) recs.push('Issue tardiness notice; involve guidance counselor.')
  if (student.risk.failingSubjects > 0) recs.push(`Targeted remediation in ${Object.entries(student.grades).filter(([, v]) => v < 75).map(([k]) => k).join(', ')}.`)
  if (student.parentInvolvement === 'Low') recs.push('Send home Parent Engagement Kit.')
  if (recs.length === 0) recs.push('Maintain current learning plan and monitor monthly.')
  return recs
}
