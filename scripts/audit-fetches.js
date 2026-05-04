// scripts/audit-fetches.js
// Programmatic audit of every fetchX function in src/services/dataService.js.
// Re-implements the same queries against Supabase using:
//   1. an admin auth session (created via service_role) to verify what an
//      admin user actually sees through the user-facing PostgREST API
//   2. service_role for trigger-row checks and cleanup
//
// Asserts that each fetcher does not throw, returns the expected shape,
// and (for aggregates) yields plausible numeric values.

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const URL  = process.env.VITE_SUPABASE_URL
const ANON = process.env.VITE_SUPABASE_ANON_KEY
const SVC  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!URL || !ANON || !SVC) {
  console.error('Missing one of VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const adm = createClient(URL, SVC,  { auth: { persistSession: false } })

const audit = {
  auth:   {},
  fetch:  {},
  perf:   {},
  notes:  []
}
const stamp = Date.now()
const TEST_EMAIL = `audit.admin.${stamp}@gmail.com`
const TEST_PW    = 'AuditAdmin!2026'
const TEST_NAME  = 'Audit Admin'

function ms(t0) { return Number((performance.now() - t0).toFixed(1)) }
function ok(label, msg='ok') { console.log(`  ✓ ${label} — ${msg}`) }
function bad(label, err) { console.log(`  ✗ ${label} — ${err}`); audit.notes.push(`${label}: ${err}`) }

async function main() {
  console.log('\n=== 0) Provision test admin user ===')
  const { data: created, error: createErr } = await adm.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PW,
    email_confirm: true,
    user_metadata: { full_name: TEST_NAME, role: 'admin' }
  })
  if (createErr) { bad('createUser', createErr.message); process.exit(1) }
  audit.auth.userId = created.user.id
  ok('createUser', created.user.id)

  // Verify the trigger created a profile, then bump role to admin
  // (handle_new_user defaults to 'parent' if metadata role isn't passed —
  //  but we DID pass it, so the trigger should set role=admin already).
  let profileRow = null
  for (let i = 0; i < 8; i++) {
    const { data } = await adm.from('profiles').select('*').eq('id', created.user.id).maybeSingle()
    if (data) { profileRow = data; break }
    await new Promise(r => setTimeout(r, 200))
  }
  audit.auth.profileBeforeFix = profileRow
  if (!profileRow) { bad('profile trigger', 'no row'); }
  else if (profileRow.role !== 'admin') {
    // Force admin so RLS allows everything.
    const { error: upErr } = await adm.from('profiles').update({ role: 'admin' }).eq('id', created.user.id)
    if (upErr) bad('profile role fix', upErr.message)
    else ok('profile role fix', 'role bumped to admin')
  } else ok('profile trigger', 'role=admin')

  // Sign in as that admin and use the resulting session for all fetches.
  const sb = createClient(URL, ANON, { auth: { persistSession: false } })
  const { data: sess, error: sessErr } = await sb.auth.signInWithPassword({ email: TEST_EMAIL, password: TEST_PW })
  if (sessErr) { bad('signIn', sessErr.message); process.exit(1) }
  audit.auth.session = !!sess.session
  audit.auth.signInUserId = sess.user.id
  ok('signIn', `session present, uid=${sess.user.id}`)

  // -------------------------------------------------------------------
  // fetchStudents — v_student_overview
  // -------------------------------------------------------------------
  console.log('\n=== fetchStudents ===')
  let t = performance.now()
  const { data: studentRows, error: studentErr } = await sb
    .from('v_student_overview').select('*').order('full_name')
  audit.perf.fetchStudents_ms = ms(t)
  if (studentErr) bad('fetchStudents', studentErr.message)
  else {
    const sample = studentRows[0] || null
    audit.fetch.fetchStudents = {
      rows: studentRows.length,
      keys: sample ? Object.keys(sample) : [],
      sampleAvgAttendance: sample?.attendance_pct,
      sampleAvgGrade: sample?.average_grade
    }
    ok('fetchStudents', `${studentRows.length} rows in ${audit.perf.fetchStudents_ms}ms`)
    // Shape assertion: dataService.js maps these columns
    const required = ['lrn','full_name','gender','age','grade_level','section_name','attendance_pct','average_grade']
    const missing = required.filter(k => !(k in (sample || {})))
    if (missing.length) bad('fetchStudents shape', `missing keys: ${missing.join(',')}`)
    else ok('fetchStudents shape', 'all required columns present')
  }

  // -------------------------------------------------------------------
  // fetchTeachers
  // -------------------------------------------------------------------
  console.log('\n=== fetchTeachers ===')
  t = performance.now()
  const { data: teacherRows, error: teacherErr } = await sb.from('teachers').select(`
    id, employee_no, full_name, years_exp, rating,
    subject:subjects(name),
    teacher_sections(section:sections(grade_level, name))
  `)
  audit.perf.fetchTeachers_ms = ms(t)
  if (teacherErr) bad('fetchTeachers', teacherErr.message)
  else {
    audit.fetch.fetchTeachers = {
      rows: teacherRows.length,
      sample: teacherRows[0] || null
    }
    ok('fetchTeachers', `${teacherRows.length} rows in ${audit.perf.fetchTeachers_ms}ms`)
  }

  // -------------------------------------------------------------------
  // fetchAlerts (resolved=false, ordered desc, limit 50)
  // -------------------------------------------------------------------
  console.log('\n=== fetchAlerts ===')
  t = performance.now()
  const { data: alertRows, error: alertErr } = await sb.from('alerts').select(`
    id, type, severity, note, created_at, resolved,
    student:students(full_name, lrn,
      enrollments(section:sections(grade_level, name))
    )
  `).eq('resolved', false).order('created_at', { ascending: false }).limit(50)
  audit.perf.fetchAlerts_ms = ms(t)
  if (alertErr) bad('fetchAlerts', alertErr.message)
  else {
    audit.fetch.fetchAlerts = {
      rows: alertRows.length,
      sampleHasJoin: !!alertRows[0]?.student,
      severities: [...new Set(alertRows.map(a => a.severity))]
    }
    ok('fetchAlerts', `${alertRows.length} rows in ${audit.perf.fetchAlerts_ms}ms`)
  }

  // -------------------------------------------------------------------
  // fetchSchoolMetrics — derived from fetchStudents
  // -------------------------------------------------------------------
  console.log('\n=== fetchSchoolMetrics (computed) ===')
  if (studentRows && studentRows.length > 0) {
    const total = studentRows.length
    const avgAttendance = +(studentRows.reduce((a, s) => a + Number(s.attendance_pct || 0), 0) / total).toFixed(1)
    const avgGrade      = +(studentRows.reduce((a, s) => a + Number(s.average_grade || 0), 0) / total).toFixed(1)
    const highRisk      = studentRows.filter(s => s.risk_level === 'High').length
    const mediumRisk    = studentRows.filter(s => s.risk_level === 'Medium').length
    const lowRisk       = studentRows.filter(s => s.risk_level === 'Low').length
    audit.fetch.fetchSchoolMetrics = { total, avgAttendance, avgGrade, highRisk, mediumRisk, lowRisk }
    if (avgAttendance < 0 || avgAttendance > 100) bad('avgAttendance', `out of range: ${avgAttendance}`)
    else ok('fetchSchoolMetrics', `total=${total} avgAtt=${avgAttendance} avgGrade=${avgGrade}`)
    if (highRisk + mediumRisk + lowRisk > total) bad('risk counts', 'sum > total')
  } else bad('fetchSchoolMetrics', 'no students to compute from')

  // -------------------------------------------------------------------
  // fetchPredictions
  // -------------------------------------------------------------------
  console.log('\n=== fetchPredictions ===')
  t = performance.now()
  const { data: predRows, error: predErr } = await sb.from('predictions').select(`
    id, risk_score, risk_level, projected_average, failing_subjects, computed_at,
    student:students(lrn, full_name, gender, age,
      enrollments(section:sections(grade_level, name))
    )
  `).order('risk_score', { ascending: false })
  audit.perf.fetchPredictions_ms = ms(t)
  if (predErr) bad('fetchPredictions', predErr.message)
  else {
    audit.fetch.fetchPredictions = { rows: predRows.length }
    ok('fetchPredictions', `${predRows.length} rows in ${audit.perf.fetchPredictions_ms}ms`)
    // Verify projected_average is numeric (string vs number bug)
    const sample = predRows[0]
    if (sample) {
      audit.fetch.fetchPredictions.projectedAverageType = typeof sample.projected_average
      // Supabase numeric → string in JS — a known foot-gun for view code that calls .toFixed()
      if (typeof sample.projected_average === 'string') {
        audit.notes.push('predictions.projected_average comes back as STRING (numeric column). Views must coerce with Number() before .toFixed().')
      }
    }
  }

  // -------------------------------------------------------------------
  // fetchAcademics
  // -------------------------------------------------------------------
  console.log('\n=== fetchAcademics ===')
  t = performance.now()
  const { data: gradeRows, error: gradeErr } = await sb.from('grades').select(`
    grade, quarter,
    subject:subjects(name),
    student:students(full_name, lrn,
      enrollments(section:sections(grade_level, name))
    )
  `)
  audit.perf.fetchAcademics_ms = ms(t)
  if (gradeErr) bad('fetchAcademics', gradeErr.message)
  else {
    audit.fetch.fetchAcademics = { gradeRows: gradeRows.length }
    ok('fetchAcademics', `${gradeRows.length} grade rows in ${audit.perf.fetchAcademics_ms}ms`)
  }

  // -------------------------------------------------------------------
  // fetchAttendance
  // -------------------------------------------------------------------
  console.log('\n=== fetchAttendance ===')
  const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  t = performance.now()
  const { data: attRows, error: attErr } = await sb.from('attendance').select(
    `date, status, student:students(enrollments(section:sections(grade_level, name)))`
  ).gte('date', since)
  audit.perf.fetchAttendance_ms = ms(t)
  if (attErr) bad('fetchAttendance', attErr.message)
  else {
    audit.fetch.fetchAttendance = { rows: attRows.length, since }
    ok('fetchAttendance', `${attRows.length} rows since ${since} in ${audit.perf.fetchAttendance_ms}ms`)
  }

  // -------------------------------------------------------------------
  // fetchHealthRecords (split — health_records + clinic_visits)
  // -------------------------------------------------------------------
  console.log('\n=== fetchHealthRecords ===')
  t = performance.now()
  const [hrRes, cvRes] = await Promise.all([
    sb.from('health_records').select('*, student:students(full_name, lrn)').limit(100),
    sb.from('clinic_visits').select('*, student:students(full_name, lrn)').order('visit_date', { ascending: false }).limit(50)
  ])
  audit.perf.fetchHealthRecords_ms = ms(t)
  if (hrRes.error) bad('fetchHealthRecords.records', hrRes.error.message)
  else ok('health_records', `${hrRes.data.length} rows`)
  if (cvRes.error) bad('fetchHealthRecords.visits', cvRes.error.message)
  else ok('clinic_visits', `${cvRes.data.length} rows`)
  audit.fetch.fetchHealthRecords = {
    records: hrRes.data?.length || 0,
    visits:  cvRes.data?.length || 0,
    recordsErr: hrRes.error?.message || null,
    visitsErr:  cvRes.error?.message || null
  }

  // -------------------------------------------------------------------
  // signOut + cleanup
  // -------------------------------------------------------------------
  console.log('\n=== Cleanup ===')
  await sb.auth.signOut()
  const { data: sessAfter } = await sb.auth.getSession()
  audit.auth.signedOut = !sessAfter.session
  ok('signOut', `session cleared: ${audit.auth.signedOut}`)

  const { error: delErr } = await adm.auth.admin.deleteUser(created.user.id)
  if (delErr) bad('deleteUser', delErr.message)
  else ok('deleteUser', 'cleaned up')
  await adm.from('profiles').delete().eq('id', created.user.id)

  console.log('\n=== AUDIT JSON ===')
  console.log(JSON.stringify(audit, null, 2))
}

main().catch(e => {
  console.error('AUDIT FAILED:', e)
  process.exit(1)
})
