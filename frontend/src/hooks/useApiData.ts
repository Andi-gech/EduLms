import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, isApiError, ApiError } from '@/lib/apiClient';
import { fetchStudentAssignments, fetchCourseGrades } from '@/lib/dataProviders';
import type {
  CourseDoc,
  Paginated,
  AssignmentDoc,
  UIAssignment,
  NotificationDoc,
  DepartmentDoc,
  CourseCategoryDoc,
  TermDoc,
  EnrolledCourseDoc,
  ResultDoc,
  CourseGradeData,
} from '@/types/domain';

// Query Keys centralization (avoid string duplication)
export const QK = {
  courses: (params?: any) => ['courses', params] as const,
  course: (id?: string) => ['course', id] as const,
  myCourses: () => ['myCourses'] as const,
  modules: (courseId?: string) => ['modules', courseId] as const,
  assignments: (params?: any) => ['assignments', params] as const,
  studentAssignments: () => ['studentAssignments'] as const,
  courseGrades: () => ['courseGrades'] as const,
  exam: (id?: string) => ['exam', id] as const,
  notifications: () => ['notifications'] as const,
  departments: () => ['departments'] as const,
  categories: () => ['categories'] as const,
  terms: () => ['terms'] as const,
  enrolled: () => ['enrolled'] as const,
  enrolledProgress: () => ['enrolledProgress'] as const,
  results: (params?: any) => ['results', params] as const,
  transcript: () => ['transcript'] as const,
  myUpcomingExams: () => ['myUpcomingExams'] as const,
  myEnrolledExams: () => ['myEnrolledExams'] as const,
  users: (params?: any) => ['users', params] as const,
  teacherAssignments: () => ['teacherAssignments'] as const,
  departmentCourses: () => ['departmentCourses'] as const,
  assignment: (id?: string) => ['assignment', id] as const,
  assignmentSubs: (id?: string) => ['assignmentSubs', id] as const,
  examApprovals: (status?: string) => ['examApprovals', status] as const,
  examSubmissions: (examId?: string) => ['examSubmissions', examId] as const,
  moduleApprovals: (status?: string, course?: string) => ['moduleApprovals', status, course] as const,
  modulesProgress: (courseId?: string) => ['courseModulesProgress', courseId] as const,
  moduleDetail: (courseId?: string, moduleId?: string) => ['courseModuleDetail', courseId, moduleId] as const,
  departmentOverview: () => ['departmentOverview'] as const,
  resultApprovals: (filters?: any) => ['resultApprovals', filters] as const,
};


// ---------- Course Queries ----------
export function useCourses(params?: { department?: string; teacher?: string; q?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: QK.courses(params),
    queryFn: async () => {
      return apiClient.listCourses(params) as Promise<Paginated<CourseDoc>>;
    },
    placeholderData: (prev) => prev,
  });
}

export function useCourse(id?: string) {
  return useQuery({
    queryKey: QK.course(id),
  queryFn: () => apiClient.getCourse(id!),
    enabled: !!id,
  });
}

export function useMyCourses() {
  return useQuery({
    queryKey: QK.myCourses(),
    queryFn: () => apiClient.listMyCourses().catch(() => []),
    staleTime: 30_000,
  });
}

export function useCourseModules(courseId?: string) {
  return useQuery({
    queryKey: QK.modules(courseId),
  queryFn: () => apiClient.listCourseModules(courseId!), // no dedicated mock modules yet
    enabled: !!courseId,
  });
}

// ---------- Assignments ----------
export function useAssignments(params?: { course?: string; module?: string }) {
  return useQuery({
    queryKey: QK.assignments(params),
  queryFn: () => apiClient.listAssignments(params) as Promise<AssignmentDoc[]>,
  });
}

export function useStudentAssignments() {
  return useQuery({
    queryKey: QK.studentAssignments(),
    queryFn: () => fetchStudentAssignments() as Promise<UIAssignment[]>,
  });
}

// ---------- Grades / Transcript ----------
export function useCourseGrades() {
  return useQuery({
    queryKey: QK.courseGrades(),
    queryFn: () => fetchCourseGrades() as Promise<CourseGradeData[]>,
  });
}

// ---------- Exams ----------
export function useExam(id?: string) {
  return useQuery({
    queryKey: QK.exam(id),
    queryFn: () => apiClient.getExam(id!), // no single exam mock
    enabled: !!id,
  });
}


// Student course modules progress (ordered list with completed flags)
export function useModulesProgress(courseId?: string) {
  return useQuery({
    queryKey: QK.modulesProgress(courseId),
    queryFn: () => apiClient.listCourseModulesProgress(courseId!),
    enabled: !!courseId,
  });
}

// Single module detail (content + completion)
export function useModuleDetail(courseId?: string, moduleId?: string) {
  return useQuery({
    queryKey: QK.moduleDetail(courseId, moduleId),
    queryFn: () => apiClient.getCourseModuleDetail(courseId!, moduleId!),
    enabled: !!courseId && !!moduleId,
  });
}

// Teacher upcoming/active exams
export function useMyUpcomingExams() {
  return useQuery({
    queryKey: QK.myUpcomingExams(),
    queryFn: async () => {
      const resp = await apiClient.listMyUpcomingExams();
      return resp.exams || [];
    },
    refetchInterval: 60_000,
  });
}

// Student: exams across all enrolled courses
export function useMyEnrolledExams() {
  return useQuery({
    queryKey: QK.myEnrolledExams(),
    queryFn: async () => {
      const resp = await apiClient.listMyEnrolledExams();
      return resp.exams || [];
    },
    refetchInterval: 60_000,
  });
}

// ---------- Notifications ----------
export function useNotifications() {
  return useQuery({
    queryKey: QK.notifications(),
    queryFn: () => apiClient.listNotifications() as Promise<NotificationDoc[]>,
    refetchInterval: 60_000,
  });
}

// ---------- Users (admin) ----------
export function useUsers(params?: { department?: string }) {
  return useQuery({
    queryKey: QK.users(params),
    queryFn: () => apiClient.listUsers(params) as Promise<any[]>,
  enabled: true,
  });
}

// ---------- Teacher Assignments ----------
export function useTeacherAssignments() {
  return useQuery({
    queryKey: QK.teacherAssignments(),
    queryFn: () => apiClient.listMyAssignments() as Promise<any[]>,
  enabled: true,
    refetchInterval: 60_000,
  });
}

// Department head/admin: list courses in their department
export function useDepartmentCourses() {
  return useQuery({
    queryKey: QK.departmentCourses(),
    queryFn: () => apiClient.listMyDepartmentCourses().catch(() => []),
    refetchInterval: 60_000,
  });
}

export function useAssignment(id?: string) {
  return useQuery({
    queryKey: QK.assignment(id),
    queryFn: () => apiClient.getAssignment(id!),
  enabled: !!id,
  });
}

export function useAssignmentSubmissions(id?: string) {
  return useQuery({
    queryKey: QK.assignmentSubs(id),
    queryFn: () => apiClient.listAssignmentSubmissions(id!),
  enabled: !!id,
    refetchInterval: 30_000,
  });
}

// ---------- Lookups ----------
export function useDepartments() {
  return useQuery({ queryKey: QK.departments(), queryFn: () => apiClient.listDepartments() as Promise<DepartmentDoc[]> });
}
export function useCategories() {
  return useQuery({ queryKey: QK.categories(), queryFn: () => apiClient.listCategories() as Promise<CourseCategoryDoc[]> });
}
export function useTerms() {
  return useQuery({ queryKey: QK.terms(), queryFn: () => apiClient.listTerms() as Promise<TermDoc[]> });
}

// ---------- Enrollment ----------
export function useEnrolledCourses() {
  return useQuery({ queryKey: QK.enrolled(), queryFn: () => apiClient.listEnrolled() as Promise<EnrolledCourseDoc[]> });
}

export function useEnrolledCoursesWithProgress() {
  return useQuery({ queryKey: QK.enrolledProgress(), queryFn: () => apiClient.listEnrolledWithProgress() as Promise<any[]> });
}

// ---------- Results ----------
export function useResults(params?: { exam?: string; user?: string }) {
  return useQuery({ queryKey: QK.results(params), queryFn: () => apiClient.listResults(params) as Promise<ResultDoc[]> });
}

// Student transcript
export function useTranscript() {
  return useQuery({ queryKey: QK.transcript(), queryFn: () => apiClient.getTranscript(), staleTime: 30_000 });
}

// Single exam result for current student (filters by exam id; backend constrains to own user)
export function useCourseResult(courseId?: string) {
  return useQuery({
    queryKey: ['courseResult', courseId],
    queryFn: async () => {
      if (!courseId) return null;
      const list = await apiClient.listResults({ courseId: courseId }).catch(() => [] as ResultDoc[]);
      return list && list.length > 0 ? list[0] : null;
    },
    enabled: !!courseId,
    refetchInterval: 30_000, // poll to detect when manual grading completes
  });
}

// ---------- Mutations ----------
export function useCreateCourseMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: any) => apiClient.createCourse(input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.courses(undefined) }); },
  });
}

export function useUpdateCourseMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: any }) => apiClient.updateCourse(id, input),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: QK.course(vars.id) });
      qc.invalidateQueries({ queryKey: QK.courses(undefined) });
    },
  });
}

export function useUpdateExamMutation(id: string | undefined){
  const qc=useQueryClient();
  return useMutation({
    mutationFn:({id,payload}:{id:string;payload:any})=>apiClient.updateExam(id,payload),
    onSuccess:()=>{qc.invalidateQueries({queryKey:QK.exam(undefined)});},
  });

}
export function useEnrollCourseMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId }: { courseId: string }) => apiClient.enrollCourse(courseId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.enrolled() }); },
  });
}

// Mark module completed
export function useCompleteModuleMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId, moduleId }: { courseId: string; moduleId: string }) => apiClient.completeModule(courseId, moduleId),
    onSuccess: (_data, vars) => {
      // Invalidate enrolled progress + module progress for that course
      qc.invalidateQueries({ queryKey: QK.enrolledProgress() });
      qc.invalidateQueries({ queryKey: ['courseModulesProgress', vars.courseId] });
    },
  });
}

export function useCreateAssignmentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => apiClient.createAssignment(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.assignments(undefined) }); },
  });
}

export function useSubmitAssignmentMutation() {
  return useMutation({
    mutationFn: ({ assignmentId, form }: { assignmentId: string; form: FormData }) => apiClient.submitAssignment(assignmentId, form),
  });
}

export function useUpdateAssignmentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => apiClient.updateAssignment(id, payload),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: QK.assignment(vars.id) });
      qc.invalidateQueries({ queryKey: QK.teacherAssignments() });
    },
  });
}

export function useDeleteAssignmentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => apiClient.deleteAssignment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.teacherAssignments() });
    },
  });
}

// Create Department
export function useCreateDepartmentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; code: string; description?: string }) => apiClient.createDepartment(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.departments() });
    },
  });
}

// Assign teacher to course (department head/admin)
export function useAssignTeacherMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId, teacherId }: { courseId: string; teacherId: string }) => apiClient.assignTeacher(courseId, teacherId === 'none' ? 'none' : teacherId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: QK.departmentCourses() });
      qc.invalidateQueries({ queryKey: QK.course(vars.courseId) });
    },
  });
}

// Delete course (Registrar or department roles if allowed backend side)
export function useDeleteCourseMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => apiClient.deleteCourse(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.departmentCourses() });
      qc.invalidateQueries({ queryKey: QK.courses(undefined) });
    },
  });
}

export function useGradeAssignmentSubmissionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, studentId, grade }: { assignmentId: string; studentId: string; grade: number }) => apiClient.gradeAssignmentSubmission(assignmentId, studentId, grade),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: QK.assignmentSubs(vars.assignmentId) });
      qc.invalidateQueries({ queryKey: QK.teacherAssignments() });
    },
  });
}

export function useSubmitExamMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ examId, answers }: { examId: string; answers: { questionId: string; answerId?: string; text?: string }[] }) => apiClient.submitExam(examId, { answers }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.results(undefined) }); },
  });
}

export function useMarkNotificationReadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => apiClient.markNotificationRead(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.notifications() }); },
  });
}

// Exam approvals (department)
export function useExamApprovals(status: string = 'pending', course?: string) {
  return useQuery({
    queryKey: QK.examApprovals(JSON.stringify({ status, course })),
    queryFn: () => apiClient.listExamApprovals({ status, course }),
    staleTime: 30_000,
  });
}

// Approve / Reject exam mutations (department roles)
export function useApproveExamMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => apiClient.approveExam(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['examApprovals'] });
      qc.invalidateQueries({ queryKey: QK.myUpcomingExams() });
    },
  });
}

export function useRejectExamMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => apiClient.rejectExam(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['examApprovals'] });
      qc.invalidateQueries({ queryKey: QK.myUpcomingExams() });
    },
  });
}

// Exam submissions (teacher)
export function useExamSubmissions(examId?: string) {
  return useQuery({
    queryKey: QK.examSubmissions(examId),
    queryFn: () => apiClient.listExamSubmissions(examId!),
    enabled: !!examId,
    refetchInterval: 30_000,
  });
}

export function useGradeExamSubmissionMutation(examId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ submissionId, manualScore }: { submissionId: string; manualScore: number }) => apiClient.gradeExamSubmission(examId, submissionId, manualScore),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.examSubmissions(examId) }); qc.invalidateQueries({ queryKey: QK.results(undefined) }); },
  });
}

export function useExamSubmissionDetail(examId?: string, submissionId?: string) {
  return useQuery({
    queryKey: ['examSubmissionDetail', examId, submissionId],
    queryFn: () => apiClient.getExamSubmissionDetail(examId!, submissionId!),
    enabled: !!examId && !!submissionId,
  });
}

// Approve grade/result
export function useApproveResultMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => apiClient.approveResult(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.results(undefined) });
      qc.invalidateQueries({ queryKey: QK.resultApprovals(undefined) });
    },
  });
}

// Result approvals listing
export function useResultApprovals(filters?: { course?: string; exam?: string; approved?: string }) {
  return useQuery({
    queryKey: QK.resultApprovals(filters),
    queryFn: () => apiClient.listResultApprovals(filters),
    staleTime: 30_000,
  });
}

export function useModuleApprovals(status: string = 'pending', course?: string) {
  return useQuery({
    queryKey: QK.moduleApprovals(status, course),
    queryFn: () => apiClient.listModuleApprovals({ status, course }),
    staleTime: 30_000,
  });
}

// Aggregated teacher overview stats (simple client aggregation when real data used)
export function useTeacherOverview() {
  return useQuery({
    queryKey: ['teacherOverview'],
    queryFn: async () => {
      const [courses, upcoming, assignments, notifications] = await Promise.all([
          apiClient.listMyCourses().catch(() => []),
        apiClient.listMyUpcomingExams().catch(() => ({ exams: [] })),
        apiClient.listMyAssignments().catch(() => []),
        apiClient.listNotifications().catch(() => []),
          apiClient.listExamApprovals({ status: 'all' }).catch(() => []),
        ]);
        const examApprovals = await apiClient.listExamApprovals({ status: 'all' }).catch(() => []);
      const summary = {
        assignedCourses: courses.length,
        upcomingExams: (upcoming.exams || []).filter(e => e.status === 'upcoming').length,
        pendingGrading: assignments.filter(a => a.status === 'pending').length, // simplistic
        assignments: assignments.length,
        unreadNotifications: notifications.filter(n => !n.isRead).length,
        approvedExams: examApprovals.filter((e: any) => e.status === 'approved').length,
        pendingExamApprovals: examApprovals.filter((e: any) => e.status === 'pending').length,
        rejectedExams: examApprovals.filter((e: any) => e.status === 'rejected').length,
      };
      // Build exam status distribution (approved/pending/rejected)
      const examStatus = [
        { name: 'Approved', value: summary.approvedExams },
        { name: 'Pending', value: summary.pendingExamApprovals },
        { name: 'Rejected', value: summary.rejectedExams },
      ];
      return {
        summary,
        // Provide empty simple structures for charts until real analytics endpoints exist
        recentActivity: [],
        courses: courses.map(c => ({ id: c._id, name: c.name })),
        submissionSeries: {},
        contentApproval: [],
        examStatus,
        gradingBreakdown: [],
        examOutcomesLatest: [],
      };
    },
    staleTime: 30_000,
  });
}

// Department overview (head/admin)
export function useDepartmentOverview() {
  return useQuery({
    queryKey: QK.departmentOverview(),
    queryFn: () => apiClient.getDepartmentOverview(),
    staleTime: 60_000,
  });
}

// Helper for components wanting a unified error message
export function extractErrorMessage(err: unknown): string {
  if (isApiError(err)) return err.message;
  if (err instanceof Error) return err.message;
  return 'Unknown error';
}

export type ApiClientError = ApiError;
