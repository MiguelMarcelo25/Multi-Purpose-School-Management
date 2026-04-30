// Seed Supabase with realistic mock data.
// Run AFTER 01_schema.sql and 02_policies.sql have been applied in the SQL Editor.
//
// Usage:
//   1. Copy .env.example to .env and fill in your Supabase URL + service role key
//   2. npm run seed

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { STUDENTS, TEACHERS, computeRisk } from '../src/data/mockData.js'

dotenv.config()

const url = process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

async function main() {
  console.log('Connecting to Supabase…')

  // 1. Load reference tables (subjects, sections) seeded by schema.sql
  const { data: subjects, error: subErr } = await supabase.from('subjects').select('id, name')
  if (subErr) throw subErr
  const subjectByName = Object.fromEntries(subjects.map((s) => [s.name, s.id]))

  const { data: sections, error: secErr } = await supabase.from('sections').select('id, grade_level, name')
  if (secErr) throw secErr
  const sectionByKey = Object.fromEntries(sections.map((s) => [`${s.grade_level}-${s.name}`, s.id]))

  console.log(`Loaded ${subjects.length} subjects, ${sections.length} sections`)

  // 2. Seed teachers
  console.log('Seeding teachers…')
  await supabase.from('teachers').delete().neq('employee_no', '__noop__')
  const teacherRows = TEACHERS.map((t) => ({
    employee_no: t.id,
    full_name: t.name,
    primary_subject_id: subjectByName[t.subject] || null,
    years_exp: t.yearsExp,
    rating: t.rating
  }))
  const { error: tErr } = await supabase.from('teachers').insert(teacherRows)
  if (tErr) throw tErr
  console.log(`  + ${teacherRows.length} teachers`)

  // 3. Seed students
  console.log(`Seeding ${STUDENTS.length} students…`)
  await supabase.from('students').delete().neq('lrn', '__noop__')
  const studentRows = STUDENTS.map((s) => ({
    lrn: s.id,
    full_name: s.name,
    gender: s.gender,
    age: s.age,
    guardian_name: s.guardian,
    guardian_contact: s.contact,
    address: s.address,
    household_income: s.householdIncome,
    parent_involvement: s.parentInvolvement,
    enrolled_year: s.enrolled
  }))

  // Insert in batches (Supabase has a payload limit)
  const inserted = []
  for (let i = 0; i < studentRows.length; i += 100) {
    const batch = studentRows.slice(i, i + 100)
    const { data, error } = await supabase.from('students').insert(batch).select('id, lrn')
    if (error) throw error
    inserted.push(...data)
    process.stdout.write(`  + ${inserted.length}/${studentRows.length}\r`)
  }
  console.log(`\n  Done: ${inserted.length} students`)

  const studentIdByLrn = Object.fromEntries(inserted.map((s) => [s.lrn, s.id]))

  // 4. Enrollments
  console.log('Seeding enrollments…')
  const enrollmentRows = STUDENTS.map((s) => ({
    student_id:  studentIdByLrn[s.id],
    section_id:  sectionByKey[`${s.grade}-${s.section}`],
    school_year: '2025-2026'
  })).filter((r) => r.student_id && r.section_id)
  for (let i = 0; i < enrollmentRows.length; i += 200) {
    await supabase.from('enrollments').insert(enrollmentRows.slice(i, i + 200))
  }
  console.log(`  + ${enrollmentRows.length} enrollments`)

  // 5. Grades (4 quarters × 7 subjects per student)
  console.log('Seeding grades (this may take a moment)…')
  const gradeRows = []
  for (const s of STUDENTS) {
    const sid = studentIdByLrn[s.id]
    if (!sid) continue
    for (const [subjectName, baseGrade] of Object.entries(s.grades)) {
      const subId = subjectByName[subjectName]
      if (!subId) continue
      for (let q = 1; q <= 4; q++) {
        gradeRows.push({
          student_id: sid,
          subject_id: subId,
          quarter: q,
          school_year: '2025-2026',
          grade: Math.max(60, Math.min(99, baseGrade + (Math.random() * 6 - 3))).toFixed(2)
        })
      }
    }
  }
  for (let i = 0; i < gradeRows.length; i += 500) {
    const { error } = await supabase.from('grades').insert(gradeRows.slice(i, i + 500))
    if (error) throw error
    process.stdout.write(`  + ${Math.min(i + 500, gradeRows.length)}/${gradeRows.length}\r`)
  }
  console.log(`\n  Done: ${gradeRows.length} grade rows`)

  // 6. Attendance (last 30 school days, weekday only)
  console.log('Seeding attendance (last 30 school days)…')
  const attendanceRows = []
  const today = new Date()
  for (const s of STUDENTS) {
    const sid = studentIdByLrn[s.id]
    if (!sid) continue
    let count = 0
    let d = new Date(today)
    while (count < 30) {
      d.setDate(d.getDate() - 1)
      const dow = d.getDay()
      if (dow === 0 || dow === 6) continue // skip weekends
      count++
      const r = Math.random() * 100
      let status
      if (r > s.attendance) status = 'absent'
      else if (r > s.attendance - (s.tardiness / 2)) status = 'tardy'
      else status = 'present'
      attendanceRows.push({
        student_id: sid,
        date: d.toISOString().slice(0, 10),
        status
      })
    }
  }
  for (let i = 0; i < attendanceRows.length; i += 1000) {
    const { error } = await supabase.from('attendance').insert(attendanceRows.slice(i, i + 1000))
    if (error) throw error
    process.stdout.write(`  + ${Math.min(i + 1000, attendanceRows.length)}/${attendanceRows.length}\r`)
  }
  console.log(`\n  Done: ${attendanceRows.length} attendance rows`)

  // 7. Predictions
  console.log('Computing & seeding risk predictions…')
  const predictionRows = STUDENTS.map((s) => {
    const r = computeRisk(s)
    return {
      student_id:        studentIdByLrn[s.id],
      risk_score:        r.score,
      risk_level:        r.level,
      projected_average: r.projectedAverage,
      failing_subjects:  r.failingSubjects,
      model_version:     'v2.3'
    }
  }).filter((r) => r.student_id)
  for (let i = 0; i < predictionRows.length; i += 200) {
    await supabase.from('predictions').insert(predictionRows.slice(i, i + 200))
  }
  console.log(`  + ${predictionRows.length} predictions`)

  // 8. Alerts for high-risk students
  console.log('Seeding alerts for high-risk students…')
  const highRisk = STUDENTS.filter((s) => computeRisk(s).level === 'High').slice(0, 20)
  const alertRows = highRisk.map((s) => {
    const r = computeRisk(s)
    return {
      student_id: studentIdByLrn[s.id],
      type: s.attendance < 80 ? 'Attendance' : s.average < 78 ? 'Academic' : s.tardiness > 10 ? 'Tardiness' : 'Behavior',
      severity: 'High',
      note: `Predictive model flagged ${s.name} — ${r.score}% risk score.`
    }
  }).filter((r) => r.student_id)
  await supabase.from('alerts').insert(alertRows)
  console.log(`  + ${alertRows.length} alerts`)

  console.log('\n✓ Seed complete.')
}

main().catch((err) => {
  console.error('\n✗ Seed failed:', err)
  process.exit(1)
})
