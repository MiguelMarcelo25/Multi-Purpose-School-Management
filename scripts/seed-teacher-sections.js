// scripts/seed-teacher-sections.js
// Assigns each seeded teacher to 1-2 sections so RLS-scoped teacher logins
// can see their students/grades/attendance.
//
// Strategy: each teacher's primary_subject_id implies a grade band (e.g.
// MAPEH teachers handle multiple grades; ESP/Filipino tend to be per grade).
// We just round-robin teachers across the 12 sections, ensuring every
// section gets at least one teacher.

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const c = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const { data: teachers, error: tErr } = await c.from('teachers').select('id, employee_no, full_name');
if (tErr) throw tErr;
const { data: sections, error: sErr } = await c.from('sections').select('id, grade_level, name').order('grade_level');
if (sErr) throw sErr;

console.log(`Found ${teachers.length} teachers, ${sections.length} sections`);

// Clear existing assignments
await c.from('teacher_sections').delete().neq('teacher_id', '00000000-0000-0000-0000-000000000000');

// Round-robin: each section gets a teacher; teachers can repeat
const rows = sections.map((sec, i) => ({
  teacher_id: teachers[i % teachers.length].id,
  section_id: sec.id
}));

const { error: insErr } = await c.from('teacher_sections').insert(rows);
if (insErr) throw insErr;
console.log(`Seeded ${rows.length} teacher_section assignments`);
