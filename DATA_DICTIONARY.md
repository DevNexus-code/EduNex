# EDUNEX Dataset — Data Dictionary

All data is synthetic and intended for development, testing and AI prototyping.

## Files and row counts

| File | Purpose |
|---|---|
| `departments.csv` | Academic departments |
| `staff.csv` | Teaching, administrative and support staff |
| `courses.csv` | Programs offered by departments |
| `subjects.csv` | Subjects mapped to courses |
| `class_sections.csv` | Course/year/section combinations |
| `students.csv` | Student identity and contact test records |
| `student_enrollments.csv` | Student-to-course/section mapping |
| `student_attendance.csv` | Sample student attendance sessions |
| `staff_attendance.csv` | Sample staff attendance sessions |
| `fee_structures.csv` | Course fee structures |
| `fee_payments.csv` | Sample payment records |
| `examinations.csv` | Examination schedule and status |
| `student_marks.csv` | Student subject marks and grades |
| `announcements.csv` | Institutional announcements |
| `edunex-student-staff-dataset-1000.jsonl` | 1,000 chat-style assistant examples |

## Suggested relationships

- `staff.department_id` → `departments.department_id`
- `departments.head_staff_id` → `staff.staff_id`
- `courses.department_id` → `departments.department_id`
- `subjects.course_id` → `courses.course_id`
- `subjects.department_id` → `departments.department_id`
- `class_sections.course_id` → `courses.course_id`
- `student_enrollments.student_id` → `students.student_id`
- `student_enrollments.course_id` → `courses.course_id`
- `student_enrollments.department_id` → `departments.department_id`
- `student_enrollments.section_id` → `class_sections.section_id`
- `student_attendance.student_id` → `students.student_id`
- `student_attendance.section_id` → `class_sections.section_id`
- `student_attendance.marked_by_staff_id` → `staff.staff_id`
- `staff_attendance.staff_id` → `staff.staff_id`
- `fee_structures.course_id` → `courses.course_id`
- `fee_payments.student_id` → `students.student_id`
- `fee_payments.fee_structure_id` → `fee_structures.fee_structure_id`
- `fee_payments.recorded_by_staff_id` → `staff.staff_id`
- `student_marks.examination_id` → `examinations.examination_id`
- `student_marks.student_id` → `students.student_id`
- `student_marks.subject_id` → `subjects.subject_id`

## Notes

1. CSV column names are generic snake_case names, not guaranteed to match your Prisma model field names.
2. Map enum values to the exact enum definitions in `schema.prisma` before import.
3. Sample payments are illustrative and should not be treated as real financial transactions.
4. Sample attendance and examination records are illustrative, not official academic records.
5. Do not use the `.example` email addresses for actual communication.
