
=== 1) SCHEMA INTEGRITY ===
Counts: {
  profiles: 1,
  subjects: 7,
  sections: 12,
  teachers: 8,
  teacher_sections: 12,
  students: 382,
  enrollments: 382,
  grades: 10696,
  attendance: 11460,
  predictions: 382,
  interventions: 0,
  alerts: 20,
  health_records: null,
  immunizations: null,
  clinic_visits: null
}
Missing tables: []
v_student_overview: { count: 382, err: undefined, ms: 424.3 }
  sample: {
  id: '00991f73-e729-4e36-a6c6-c738208ac5b4',
  lrn: 'BIES-1210',
  full_name: 'Allan Rosario',
  gender: 'F',
  age: 9,
  household_income: 'Middle',
  parent_involvement: 'High',
  grade_level: 4,
  section_name: 'Mahogany',
  attendance_pct: 70,
  tardiness_count: 0,
  average_grade: 90.07,
  risk_score: 22,
  risk_level: 'Low',
  projected_average: 89.3,
  failing_subjects: 0
}
v_enrollment: { exists: true, count: null }

=== 2) dataService.js FUNCTIONS (anon key) ===
fetchStudents: { error: null, rows: 0, sampleKeys: null }
fetchTeachers: { error: null, rows: 0, sample: null }
fetchAlerts: { error: null, rows: 0, sampleHasJoin: false }

=== 3+4) RLS / ANON EXPOSURE ===
Anon SELECT (any rows readable):
  profiles             READABLE (0 rows)
  subjects             READABLE (0 rows)
  sections             READABLE (0 rows)
  teachers             READABLE (0 rows)
  teacher_sections     READABLE (0 rows)
  students             READABLE (0 rows)
  enrollments          READABLE (0 rows)
  grades               READABLE (0 rows)
  attendance           READABLE (0 rows)
  predictions          READABLE (0 rows)
  interventions        READABLE (0 rows)
  alerts               READABLE (0 rows)
  health_records       READABLE (null rows)
  immunizations        READABLE (null rows)
  clinic_visits        READABLE (null rows)
Anon INSERT subjects: {
  allowed: false,
  error: 'new row violates row-level security policy for table "subjects"'
}
Anon DELETE subjects: { skipped: true }
Anon INSERT alerts: {
  allowed: false,
  error: 'new row violates row-level security policy for table "alerts"'
}
Anon INSERT students: {
  allowed: false,
  error: 'new row violates row-level security policy for table "students"'
}
RLS inferred from anon:
  profiles             PROTECTED (anon=0 svc=1 — filtered by RLS)
  subjects             PROTECTED (anon=0 svc=7 — filtered by RLS)
  sections             PROTECTED (anon=0 svc=12 — filtered by RLS)
  teachers             PROTECTED (anon=0 svc=8 — filtered by RLS)
  teacher_sections     PROTECTED (anon=0 svc=12 — filtered by RLS)
  students             PROTECTED (anon=0 svc=382 — filtered by RLS)
  enrollments          PROTECTED (anon=0 svc=382 — filtered by RLS)
  grades               PROTECTED (anon=0 svc=10696 — filtered by RLS)
  attendance           PROTECTED (anon=0 svc=11460 — filtered by RLS)
  predictions          PROTECTED (anon=0 svc=382 — filtered by RLS)
  interventions        AMBIGUOUS (svc=0; cannot tell empty vs filtered)
  alerts               PROTECTED (anon=0 svc=20 — filtered by RLS)
  health_records       AMBIGUOUS (svc=null; cannot tell empty vs filtered)
  immunizations        AMBIGUOUS (svc=null; cannot tell empty vs filtered)
  clinic_visits        AMBIGUOUS (svc=null; cannot tell empty vs filtered)

=== 5) AUTH FLOW ===
signUp (anon): {
  error: null,
  userId: 'cce7ea81-bb12-457c-aa95-2e2f07d5a537',
  sessionPresent: false,
  emailConfirmedAt: null,
  confirmationSentAt: '2026-05-04T10:59:49.548522473Z'
}
handle_new_user trigger: {
  ok: true,
  profile: {
    id: 'cce7ea81-bb12-457c-aa95-2e2f07d5a537',
    full_name: 'Smoke Tester',
    role: 'teacher',
    email: 'smoke.test.1777892389283@gmail.com',
    created_at: '2026-05-04T10:59:49.525432+00:00'
  },
  roleCorrect: true,
  fullNameCorrect: true
}
signIn: { error: 'Email not confirmed', sessionPresent: false, userId: null }
getSession: { sessionPresent: false }
cleanup: { ok: true, error: null }

=== 6) PERF (re-runs) ===
  v_student_overview run 1: 212ms
  v_student_overview run 2: 200ms

=== RESULT JSON ===
{
  "schema": {
    "counts": {
      "profiles": 1,
      "subjects": 7,
      "sections": 12,
      "teachers": 8,
      "teacher_sections": 12,
      "students": 382,
      "enrollments": 382,
      "grades": 10696,
      "attendance": 11460,
      "predictions": 382,
      "interventions": 0,
      "alerts": 20,
      "health_records": null,
      "immunizations": null,
      "clinic_visits": null
    },
    "missing": [],
    "v_student_overview_count": 382,
    "v_student_overview_err": null,
    "v_student_overview_sample": [
      {
        "id": "00991f73-e729-4e36-a6c6-c738208ac5b4",
        "lrn": "BIES-1210",
        "full_name": "Allan Rosario",
        "gender": "F",
        "age": 9,
        "household_income": "Middle",
        "parent_involvement": "High",
        "grade_level": 4,
        "section_name": "Mahogany",
        "attendance_pct": 70,
        "tardiness_count": 0,
        "average_grade": 90.07,
        "risk_score": 22,
        "risk_level": "Low",
        "projected_average": 89.3,
        "failing_subjects": 0
      },
      {
        "id": "009d4296-f6dd-4fe0-bcf1-3177c75492ef",
        "lrn": "BIES-1340",
        "full_name": "Ella Salazar",
        "gender": "F",
        "age": 12,
        "household_income": "Low",
        "parent_involvement": "Low",
        "grade_level": 6,
        "section_name": "Galileo",
        "attendance_pct": 76.7,
        "tardiness_count": 0,
        "average_grade": 79.76,
        "risk_score": 51,
        "risk_level": "Medium",
        "projected_average": 78.9,
        "failing_subjects": 1
      }
    ],
    "v_student_overview_columns": [
      "id",
      "lrn",
      "full_name",
      "gender",
      "age",
      "household_income",
      "parent_involvement",
      "grade_level",
      "section_name",
      "attendance_pct",
      "tardiness_count",
      "average_grade",
      "risk_score",
      "risk_level",
      "projected_average",
      "failing_subjects"
    ],
    "v_enrollment": {
      "exists": true,
      "count": null
    }
  },
  "dataService": {
    "fetchStudents": {
      "error": null,
      "rows": 0,
      "sampleKeys": null
    },
    "fetchTeachers": {
      "error": null,
      "rows": 0,
      "sample": null
    },
    "fetchAlerts": {
      "error": null,
      "rows": 0,
      "sampleHasJoin": false
    }
  },
  "rls": {
    "inferredFromAnon": {
      "profiles": "PROTECTED (anon=0 svc=1 — filtered by RLS)",
      "subjects": "PROTECTED (anon=0 svc=7 — filtered by RLS)",
      "sections": "PROTECTED (anon=0 svc=12 — filtered by RLS)",
      "teachers": "PROTECTED (anon=0 svc=8 — filtered by RLS)",
      "teacher_sections": "PROTECTED (anon=0 svc=12 — filtered by RLS)",
      "students": "PROTECTED (anon=0 svc=382 — filtered by RLS)",
      "enrollments": "PROTECTED (anon=0 svc=382 — filtered by RLS)",
      "grades": "PROTECTED (anon=0 svc=10696 — filtered by RLS)",
      "attendance": "PROTECTED (anon=0 svc=11460 — filtered by RLS)",
      "predictions": "PROTECTED (anon=0 svc=382 — filtered by RLS)",
      "interventions": "AMBIGUOUS (svc=0; cannot tell empty vs filtered)",
      "alerts": "PROTECTED (anon=0 svc=20 — filtered by RLS)",
      "health_records": "AMBIGUOUS (svc=null; cannot tell empty vs filtered)",
      "immunizations": "AMBIGUOUS (svc=null; cannot tell empty vs filtered)",
      "clinic_visits": "AMBIGUOUS (svc=null; cannot tell empty vs filtered)"
    }
  },
  "anonExposure": {
    "read": {
      "profiles": {
        "ok": true,
        "rows": 0
      },
      "subjects": {
        "ok": true,
        "rows": 0
      },
      "sections": {
        "ok": true,
        "rows": 0
      },
      "teachers": {
        "ok": true,
        "rows": 0
      },
      "teacher_sections": {
        "ok": true,
        "rows": 0
      },
      "students": {
        "ok": true,
        "rows": 0
      },
      "enrollments": {
        "ok": true,
        "rows": 0
      },
      "grades": {
        "ok": true,
        "rows": 0
      },
      "attendance": {
        "ok": true,
        "rows": 0
      },
      "predictions": {
        "ok": true,
        "rows": 0
      },
      "interventions": {
        "ok": true,
        "rows": 0
      },
      "alerts": {
        "ok": true,
        "rows": 0
      },
      "health_records": {
        "ok": true,
        "rows": null
      },
      "immunizations": {
        "ok": true,
        "rows": null
      },
      "clinic_visits": {
        "ok": true,
        "rows": null
      }
    },
    "insert_subjects": {
      "allowed": false,
      "error": "new row violates row-level security policy for table \"subjects\""
    },
    "delete_subjects": {
      "skipped": true
    },
    "insert_alerts": {
      "allowed": false,
      "error": "new row violates row-level security policy for table \"alerts\""
    },
    "insert_students": {
      "allowed": false,
      "error": "new row violates row-level security policy for table \"students\""
    }
  },
  "auth": {
    "signUp": {
      "error": null,
      "userId": "cce7ea81-bb12-457c-aa95-2e2f07d5a537",
      "sessionPresent": false,
      "emailConfirmedAt": null,
      "confirmationSentAt": "2026-05-04T10:59:49.548522473Z"
    },
    "handleNewUserTrigger": {
      "ok": true,
      "profile": {
        "id": "cce7ea81-bb12-457c-aa95-2e2f07d5a537",
        "full_name": "Smoke Tester",
        "role": "teacher",
        "email": "smoke.test.1777892389283@gmail.com",
        "created_at": "2026-05-04T10:59:49.525432+00:00"
      },
      "roleCorrect": true,
      "fullNameCorrect": true
    },
    "signIn": {
      "error": "Email not confirmed",
      "sessionPresent": false,
      "userId": null
    },
    "getSession": {
      "sessionPresent": false
    },
    "cleanup": {
      "ok": true,
      "error": null
    }
  },
  "perf": {
    "v_student_overview_ms": 424.3,
    "fetchStudents_ms": 458.5,
    "fetchTeachers_ms": 500.7,
    "fetchAlerts_ms": 433.9
  },
  "email": {
    "confirmationRequired": true,
    "note": "Signup did NOT return a session — email confirmation appears REQUIRED."
  },
  "notes": []
}
