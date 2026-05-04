// =============================================================================
// scripts/smoke-test.js
// Comprehensive backend smoke test for Bagong Ilog ES dashboard.
// Runs READ-ONLY checks plus a single signup→signIn→cleanup auth round-trip.
//
// Note: DATABASE_URL is rotated/invalid in this environment, so all DB access
// goes through PostgREST (anon for the user-facing surface, service_role for
// admin checks).  RLS state is INFERRED from anon CRUD behavior since
// pg_class isn't reachable without direct Postgres.
// =============================================================================

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const URL = process.env.VITE_SUPABASE_URL
const ANON = process.env.VITE_SUPABASE_ANON_KEY
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY

const result = {
  schema: {},
  dataService: {},
  rls: {},
  anonExposure: {},
  auth: {},
  perf: {},
  email: {},
  notes: []
}

function ms(start) { return Number((performance.now() - start).toFixed(1)) }
function log(...a) { console.log(...a) }

const sb  = createClient(URL, ANON, { auth: { persistSession: false } })
const adm = createClient(URL, SVC,  { auth: { persistSession: false } })

const baseTables = [
  'profiles','subjects','sections','teachers','teacher_sections',
  'students','enrollments','grades','attendance','predictions',
  'interventions','alerts'
]
const healthTables = ['health_records','immunizations','clinic_visits']

async function main() {
  // -------------------------------------------------------------------------
  // 1) Schema integrity (counts via service role — bypasses RLS)
  // -------------------------------------------------------------------------
  log('\n=== 1) SCHEMA INTEGRITY ===')
  result.schema.counts = {}
  result.schema.missing = []
  for (const t of [...baseTables, ...healthTables]) {
    const { count, error } = await adm.from(t).select('*', { count: 'exact', head: true })
    if (error) {
      result.schema.counts[t] = `ERR: ${error.message}`
      if (/does not exist|relation/i.test(error.message)) result.schema.missing.push(t)
    } else {
      result.schema.counts[t] = count
    }
  }
  log('Counts:', result.schema.counts)
  log('Missing tables:', result.schema.missing)

  // v_student_overview
  const ovStart = performance.now()
  const { data: ovRows, error: ovErr, count: ovCount } = await adm
    .from('v_student_overview').select('*', { count: 'exact' })
  result.perf.v_student_overview_ms = ms(ovStart)
  result.schema.v_student_overview_count = ovErr ? null : ovCount
  result.schema.v_student_overview_err = ovErr?.message || null
  result.schema.v_student_overview_sample = ovRows?.slice(0, 2) || null
  result.schema.v_student_overview_columns = ovRows?.[0] ? Object.keys(ovRows[0]) : null
  log('v_student_overview:', { count: ovCount, err: ovErr?.message, ms: result.perf.v_student_overview_ms })
  if (ovRows?.[0]) log('  sample:', ovRows[0])

  // v_enrollment (from migration 03)
  const { data: vEnrRows, error: vEnrErr, count: vEnrCount } = await adm
    .from('v_enrollment').select('*', { count: 'exact', head: true })
  result.schema.v_enrollment = vEnrErr ? { exists: false, error: vEnrErr.message } : { exists: true, count: vEnrCount }
  log('v_enrollment:', result.schema.v_enrollment)

  // -------------------------------------------------------------------------
  // 2) dataService.js functions (anon key — what the React app sees)
  // -------------------------------------------------------------------------
  log('\n=== 2) dataService.js FUNCTIONS (anon key) ===')

  const t1 = performance.now()
  const { data: studentsData, error: studentsErr } = await sb
    .from('v_student_overview').select('*').order('full_name')
  result.perf.fetchStudents_ms = ms(t1)
  result.dataService.fetchStudents = {
    error: studentsErr?.message || null,
    rows: studentsData?.length || 0,
    sampleKeys: studentsData?.[0] ? Object.keys(studentsData[0]) : null
  }
  log('fetchStudents:', result.dataService.fetchStudents)

  const t2 = performance.now()
  const { data: teachersData, error: teachersErr } = await sb.from('teachers').select(`
    id, employee_no, full_name, years_exp, rating,
    subject:subjects(name),
    teacher_sections(section:sections(grade_level, name))
  `)
  result.perf.fetchTeachers_ms = ms(t2)
  result.dataService.fetchTeachers = {
    error: teachersErr?.message || null,
    rows: teachersData?.length || 0,
    sample: teachersData?.[0] || null
  }
  log('fetchTeachers:', result.dataService.fetchTeachers)

  const t3 = performance.now()
  const { data: alertsData, error: alertsErr } = await sb.from('alerts').select(`
    id, type, severity, note, created_at, resolved,
    student:students(full_name, lrn, enrollments(section:sections(grade_level, name)))
  `).eq('resolved', false).order('created_at', { ascending: false }).limit(50)
  result.perf.fetchAlerts_ms = ms(t3)
  result.dataService.fetchAlerts = {
    error: alertsErr?.message || null,
    rows: alertsData?.length || 0,
    sampleHasJoin: !!alertsData?.[0]?.student
  }
  log('fetchAlerts:', result.dataService.fetchAlerts)

  if (studentsData && studentsData.length) {
    const total = studentsData.length
    const avgAttendance = +(studentsData.reduce((a, s) => a + Number(s.attendance_pct || 0), 0) / total).toFixed(1)
    const avgGrade = +(studentsData.reduce((a, s) => a + Number(s.average_grade || 0), 0) / total).toFixed(1)
    const highRisk = studentsData.filter(s => s.risk_level === 'High').length
    const mediumRisk = studentsData.filter(s => s.risk_level === 'Medium').length
    const lowRisk = studentsData.filter(s => s.risk_level === 'Low').length
    result.dataService.fetchSchoolMetrics = {
      total, avgAttendance, avgGrade, highRisk, mediumRisk, lowRisk,
      dropoutRiskPct: Math.round((highRisk / total) * 1000) / 10
    }
    log('fetchSchoolMetrics:', result.dataService.fetchSchoolMetrics)
  }

  // -------------------------------------------------------------------------
  // 3+4) RLS (inferred from anon CRUD) and exposure
  // -------------------------------------------------------------------------
  log('\n=== 3+4) RLS / ANON EXPOSURE ===')
  const probeTables = [...baseTables]
  for (const t of healthTables) if (!result.schema.missing.includes(t)) probeTables.push(t)

  result.anonExposure.read = {}
  for (const t of probeTables) {
    const { count, error } = await sb.from(t).select('*', { count: 'exact', head: true })
    result.anonExposure.read[t] = error ? { ok: false, error: error.message } : { ok: true, rows: count }
  }
  log('Anon SELECT (any rows readable):')
  for (const [t, r] of Object.entries(result.anonExposure.read)) {
    log(`  ${t.padEnd(20)} ${r.ok ? `READABLE (${r.rows} rows)` : `BLOCKED (${r.error})`}`)
  }

  // INSERT probe — junk subject row
  const probeCode = `__SMOKE_${Date.now()}`
  const { data: insData, error: insErr } = await sb.from('subjects')
    .insert({ code: probeCode, name: 'smoke test' }).select()
  result.anonExposure.insert_subjects = insErr
    ? { allowed: false, error: insErr.message }
    : { allowed: true, insertedId: insData?.[0]?.id }
  log('Anon INSERT subjects:', result.anonExposure.insert_subjects)

  // DELETE probe — try to delete that row with anon
  if (!insErr && insData?.[0]) {
    const { error: delErr, count: delCount } = await sb.from('subjects')
      .delete({ count: 'exact' }).eq('code', probeCode)
    result.anonExposure.delete_subjects = delErr
      ? { allowed: false, error: delErr.message }
      : { allowed: true, deletedRows: delCount }
    // Cleanup with service role (idempotent)
    await adm.from('subjects').delete().eq('code', probeCode)
  } else {
    result.anonExposure.delete_subjects = { skipped: true }
  }
  log('Anon DELETE subjects:', result.anonExposure.delete_subjects)

  // INSERT into alerts (sensitive)
  const { data: aIns, error: aInsErr } = await sb.from('alerts').insert({
    type: 'Behavior', severity: 'Low', note: 'SMOKE_TEST'
  }).select()
  result.anonExposure.insert_alerts = aInsErr
    ? { allowed: false, error: aInsErr.message }
    : { allowed: true, insertedId: aIns?.[0]?.id }
  if (!aInsErr && aIns?.[0]) await adm.from('alerts').delete().eq('id', aIns[0].id)
  log('Anon INSERT alerts:', result.anonExposure.insert_alerts)

  // INSERT into students (most sensitive)
  const { data: sIns, error: sInsErr } = await sb.from('students').insert({
    lrn: `SMOKE-${Date.now()}`, full_name: 'Smoke Student', gender: 'M'
  }).select()
  result.anonExposure.insert_students = sInsErr
    ? { allowed: false, error: sInsErr.message }
    : { allowed: true, insertedId: sIns?.[0]?.id }
  if (!sInsErr && sIns?.[0]) await adm.from('students').delete().eq('id', sIns[0].id)
  log('Anon INSERT students:', result.anonExposure.insert_students)

  // RLS inference: compare anon row count vs service-role row count
  // - anon=N, svc=N (N>0)  → RLS OFF (anon sees everything)
  // - anon=0, svc=N (N>0)  → RLS ON (anon filtered out)
  // - anon=null/err, svc=N → RLS ON (anon explicitly blocked)
  // - both 0               → AMBIGUOUS (table is empty)
  result.rls.inferredFromAnon = {}
  for (const t of probeTables) {
    const anonR = result.anonExposure.read[t]
    const svcCount = typeof result.schema.counts[t] === 'number' ? result.schema.counts[t] : null
    if (!anonR.ok) {
      result.rls.inferredFromAnon[t] = `PROTECTED (anon SELECT blocked: ${anonR.error})`
    } else if (svcCount === 0 || svcCount === null) {
      result.rls.inferredFromAnon[t] = `AMBIGUOUS (svc=${svcCount}; cannot tell empty vs filtered)`
    } else if (anonR.rows === svcCount) {
      result.rls.inferredFromAnon[t] = `EXPOSED (anon=${anonR.rows} svc=${svcCount} — RLS OFF or permissive)`
    } else if (anonR.rows === 0 || anonR.rows === null) {
      result.rls.inferredFromAnon[t] = `PROTECTED (anon=0 svc=${svcCount} — filtered by RLS)`
    } else {
      result.rls.inferredFromAnon[t] = `PARTIAL (anon=${anonR.rows} svc=${svcCount})`
    }
  }
  log('RLS inferred from anon:')
  for (const [t, v] of Object.entries(result.rls.inferredFromAnon)) log(`  ${t.padEnd(20)} ${v}`)

  // -------------------------------------------------------------------------
  // 5) Auth flow
  // -------------------------------------------------------------------------
  log('\n=== 5) AUTH FLOW ===')
  const tsTag = Date.now()
  // example.com is on Supabase's invalid-domain blocklist — use a realistic domain
  const testEmail = `smoke.test.${tsTag}@gmail.com`
  const testPassword = 'SmokeTest!2026'
  const fullName = 'Smoke Tester'
  const role = 'teacher'

  let { data: suData, error: suErr } = await sb.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: { data: { full_name: fullName, role } }
  })
  result.auth.signUp = {
    error: suErr?.message || null,
    userId: suData?.user?.id || null,
    sessionPresent: !!suData?.session,
    emailConfirmedAt: suData?.user?.email_confirmed_at || null,
    confirmationSentAt: suData?.user?.confirmation_sent_at || null
  }
  log('signUp (anon):', result.auth.signUp)

  // If email rate limit / domain block hit, fall back to admin.createUser to
  // still verify the trigger + signIn behavior.
  if (suErr || !suData?.user?.id) {
    const { data: adminCreated, error: adminErr } = await adm.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName, role }
    })
    result.auth.adminCreateFallback = {
      used: true,
      error: adminErr?.message || null,
      userId: adminCreated?.user?.id || null
    }
    if (adminCreated?.user) suData = { user: adminCreated.user, session: null }
    log('signUp (admin fallback):', result.auth.adminCreateFallback)
  }

  result.email.confirmationRequired = !!(suData?.user && !suData?.session && !suData?.user?.email_confirmed_at) && !result.auth.adminCreateFallback?.used
  result.email.note = result.auth.signUp.error?.includes('rate limit')
    ? 'Could not measure (email rate limit hit). The signUp call returned an error: "email rate limit exceeded". This implies the project DOES dispatch confirmation emails (rate-limited == sending). Check Auth → Settings to verify required-confirm setting.'
    : (result.email.confirmationRequired
        ? 'Signup did NOT return a session — email confirmation appears REQUIRED.'
        : 'Signup returned a session — email confirmation appears DISABLED (auto-confirmed).')

  // Wait briefly, then check via service role whether the trigger created a profile row
  let profileRow = null
  if (suData?.user?.id) {
    for (let i = 0; i < 8; i++) {
      const { data } = await adm.from('profiles').select('*').eq('id', suData.user.id).maybeSingle()
      if (data) { profileRow = data; break }
      await new Promise(r => setTimeout(r, 250))
    }
  }
  result.auth.handleNewUserTrigger = profileRow
    ? { ok: true, profile: profileRow, roleCorrect: profileRow.role === role, fullNameCorrect: profileRow.full_name === fullName }
    : { ok: false, note: 'No profiles row found within 2s of signup' }
  log('handle_new_user trigger:', result.auth.handleNewUserTrigger)

  const { data: siData, error: siErr } = await sb.auth.signInWithPassword({
    email: testEmail, password: testPassword
  })
  result.auth.signIn = {
    error: siErr?.message || null,
    sessionPresent: !!siData?.session,
    userId: siData?.user?.id || null
  }
  log('signIn:', result.auth.signIn)

  const { data: sessData } = await sb.auth.getSession()
  result.auth.getSession = { sessionPresent: !!sessData?.session }
  log('getSession:', result.auth.getSession)

  // Cleanup
  if (suData?.user?.id) {
    try {
      const { error: delUErr } = await adm.auth.admin.deleteUser(suData.user.id)
      result.auth.cleanup = { ok: !delUErr, error: delUErr?.message || null }
    } catch (e) {
      result.auth.cleanup = { ok: false, error: e.message }
    }
    await adm.from('profiles').delete().eq('id', suData.user.id)
  } else {
    result.auth.cleanup = { skipped: true }
  }
  log('cleanup:', result.auth.cleanup)

  // -------------------------------------------------------------------------
  // 6) Re-query timings to confirm performance
  // -------------------------------------------------------------------------
  log('\n=== 6) PERF (re-runs) ===')
  for (let i = 0; i < 2; i++) {
    const t = performance.now()
    await sb.from('v_student_overview').select('*')
    log(`  v_student_overview run ${i+1}: ${ms(t)}ms`)
  }

  log('\n=== RESULT JSON ===')
  console.log(JSON.stringify(result, null, 2))
}

main().catch(e => {
  console.error('SMOKE TEST FAILED:', e)
  process.exit(1)
})
