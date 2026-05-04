// scripts/seed-users.js
// Creates 6 demo accounts (one per role) with the same password "123123123".
// Email confirmation is bypassed via supabase.auth.admin.createUser, so the
// accounts are immediately usable on the deployed app.
//
// Also links the role accounts to actual data so they're not staring at empty
// dashboards:
//   - teacher@   → linked to the first seeded teachers row (gets that teacher's
//                  teacher_sections via my_section_ids())
//   - parent@    → set as parent_id on a specific student (sees that child's data)
//   - student@   → set as profile_id on a specific student (sees own record)
//
// Idempotent — re-running updates passwords and re-applies linkages without
// creating duplicates.
//
// Usage:
//   node scripts/seed-users.js

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const URL = process.env.VITE_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const c = createClient(URL, KEY, { auth: { persistSession: false } })

const PASSWORD = '123123123'
const USERS = [
  { email: 'admin@gmail.com',     role: 'admin',     full_name: 'Admin User' },
  { email: 'principal@gmail.com', role: 'principal', full_name: 'Principal Reyes' },
  { email: 'teacher@gmail.com',   role: 'teacher',   full_name: 'Teacher Santos' },
  { email: 'nurse@gmail.com',     role: 'nurse',     full_name: 'Nurse Aquino' },
  { email: 'parent@gmail.com',    role: 'parent',    full_name: 'Parent Cruz' },
  { email: 'student@gmail.com',   role: 'student',   full_name: 'Student Dela Cruz' }
]

// ---------------------------------------------------------------------------
// 1. Get existing user list (for idempotent updates)
// ---------------------------------------------------------------------------
console.log('Fetching existing users…')
const existingMap = {}
let page = 1
while (true) {
  const { data, error } = await c.auth.admin.listUsers({ page, perPage: 1000 })
  if (error) throw error
  for (const u of data.users) existingMap[u.email] = u
  if (data.users.length < 1000) break
  page++
}
console.log(`  ${Object.keys(existingMap).length} existing users in project`)

// ---------------------------------------------------------------------------
// 2. Create or update each role account
// ---------------------------------------------------------------------------
const userIds = {}
for (const u of USERS) {
  const existing = existingMap[u.email]
  if (existing) {
    // Update password (in case it changed) and metadata
    const { error: upErr } = await c.auth.admin.updateUserById(existing.id, {
      password: PASSWORD,
      user_metadata: { full_name: u.full_name, role: u.role },
      email_confirm: true
    })
    if (upErr) { console.error(`  ✗ updateUser ${u.email}: ${upErr.message}`); continue }
    userIds[u.email] = existing.id
    console.log(`  ↻ updated ${u.email.padEnd(24)} role=${u.role}`)
  } else {
    const { data, error } = await c.auth.admin.createUser({
      email: u.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: u.full_name, role: u.role }
    })
    if (error) { console.error(`  ✗ createUser ${u.email}: ${error.message}`); continue }
    userIds[u.email] = data.user.id
    console.log(`  + created ${u.email.padEnd(24)} role=${u.role}`)
  }
}

// ---------------------------------------------------------------------------
// 3. Force-set the profile row to the desired role (the handle_new_user trigger
//    sometimes runs before user_metadata fully propagates; upsert guarantees it).
// ---------------------------------------------------------------------------
console.log('\nUpserting profiles…')
for (const u of USERS) {
  const id = userIds[u.email]
  if (!id) continue
  const { error } = await c.from('profiles').upsert(
    { id, full_name: u.full_name, role: u.role, email: u.email },
    { onConflict: 'id' }
  )
  if (error) console.error(`  ✗ profile ${u.email}: ${error.message}`)
  else       console.log(`  ✓ profile ${u.email.padEnd(24)} role=${u.role}`)
}

// ---------------------------------------------------------------------------
// 4. Linkages so the role accounts see meaningful data
// ---------------------------------------------------------------------------
console.log('\nApplying linkages…')

// Teacher → link to first teacher row in DB
const teacherId = userIds['teacher@gmail.com']
if (teacherId) {
  const { data: teachers } = await c.from('teachers').select('id, full_name').order('employee_no').limit(1)
  if (teachers?.length) {
    const t = teachers[0]
    const { error } = await c.from('teachers').update({ profile_id: teacherId }).eq('id', t.id)
    if (error) console.error(`  ✗ teacher link: ${error.message}`)
    else       console.log(`  ✓ teacher@ linked to teachers row "${t.full_name}" (id=${t.id})`)
  } else {
    console.log('  - no teachers in DB to link teacher@ to')
  }
}

// Parent → set parent_id on first student
const parentId = userIds['parent@gmail.com']
if (parentId) {
  const { data: kids } = await c.from('students').select('id, lrn, full_name').order('lrn').limit(1)
  if (kids?.length) {
    const kid = kids[0]
    const { error } = await c.from('students').update({ parent_id: parentId }).eq('id', kid.id)
    if (error) console.error(`  ✗ parent link: ${error.message}`)
    else       console.log(`  ✓ parent@ now parent of "${kid.full_name}" (LRN ${kid.lrn})`)
  }
}

// Student → set profile_id on second student (so it doesn't collide with parent's child)
const studentId = userIds['student@gmail.com']
if (studentId) {
  const { data: kids } = await c.from('students').select('id, lrn, full_name').order('lrn').range(1, 1)
  if (kids?.length) {
    const kid = kids[0]
    const { error } = await c.from('students').update({ profile_id: studentId }).eq('id', kid.id)
    if (error) console.error(`  ✗ student link: ${error.message}`)
    else       console.log(`  ✓ student@ linked to "${kid.full_name}" (LRN ${kid.lrn})`)
  }
}

// ---------------------------------------------------------------------------
// 5. Final summary
// ---------------------------------------------------------------------------
console.log('\n────────────────────────────────────────────')
console.log('Demo accounts (password: ' + PASSWORD + ')')
console.log('────────────────────────────────────────────')
for (const u of USERS) {
  console.log(`  ${u.email.padEnd(28)} ${u.role}`)
}
console.log('\n✓ Seeding complete.')
