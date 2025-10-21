University LMS Backend Changes

Roles
- Registrar: create departments and courses, approve courses, assign department heads.
- Department Head/Admin: assign teachers to courses, set course schedule.
- Short Training Office: enroll/assign students to courses.
- Teacher: create modules for owned/assigned courses, create exams.
- Student: enroll via payment, access active courses within time window.

New/Updated Models
- Department: name, code, head.
- User: role includes short_training_office, department_head, department_admin; optional department.
- Course: department, assignedTeacher, startDate, endDate.
- Exam: examDate/startTime/endTime.
- EnrolledCourse: enrolledBy, enrolledAt.

Key Endpoints
- POST /api/departments: create department (Registrar)
- PUT /api/departments/:deptId/assign-head/:userId (Registrar)
- POST /api/courses/registrar: create course (Registrar)
- PUT /api/courses/:courseid/assign-teacher/:teacherid (Dept head/admin)
- PUT /api/courses/:courseid/schedule (Dept head/admin)
- POST /api/Enrollments/assign/:courseId/:studentId (Short training office)

Time Windows
- Course listing for students filters by startDate/endDate.
- Enrollment is blocked before startDate or after endDate.
- Exam visibility/evaluation respects examDate/startTime/endTime.
