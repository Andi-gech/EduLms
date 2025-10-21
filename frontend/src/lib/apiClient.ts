/**
 * Lightweight typed API client wrapping fetch.
 *
 * Conventions:
 *  - Base URL comes from import.meta.env.VITE_API_BASE or defaults to '/api'.
 *  - All methods throw ApiError (extends Error) on non-2xx with parsed JSON body if available.
 *  - Auth bearer token (if set) automatically applied.
 *  - Accepts optional AbortSignal via options.signal.
 *  - Query params object values skipped when undefined / null.
 *  - Response JSON is typed via generics & domain.ts interfaces – runtime validation is not performed here.
 *
 * NOTE: Adjust endpoint paths if backend differs from assumed REST resource naming.
 */

import type { UserDoc, CourseDoc, CourseModuleDoc, AssignmentDoc, ExamDoc, ResultDoc, NotificationDoc, EnrolledCourseDoc, DepartmentDoc, TermDoc, PaymentDoc, CourseCategoryDoc, Paginated, AssignmentSubmissionDoc } from '@/types/domain';

// Shape used for creating / updating courses (extend as backend accepts)
export type CreateCourseInput = Pick<CourseDoc, 'name' | 'description'> & { department?: string | null; image?: string | null; startDate?: string | null; endDate?: string | null };
export type UpdateCourseInput = Partial<CreateCourseInput> & { assignedTeacher?: string | null; status?: boolean };

// Generic API error capturing status & optional response payload
export class ApiError<T = any> extends Error {
  status: number;
  data?: T;
  constructor(message: string, status: number, data?: T) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export interface RequestOptions {
  signal?: AbortSignal;
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | null | undefined>;
}

interface InternalRequestOptions extends RequestOptions {
  method: string;
  body?: any;
}

export class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl?: string) {
    const envBase = (import.meta as any).env?.VITE_API_BASE as string | undefined;
    // Allow global override (e.g., injected via script tag before bundle) or fallback to same-origin /api
    const runtimeBase = typeof window !== 'undefined'
      ? (window as any).__API_BASE__ || (envBase || (window.location.origin + '/api'))
      : (envBase || '/api');
    this.baseUrl = (baseUrl || runtimeBase).replace(/\/$/, '');
  }

  setToken(token: string | null) { this.token = token; }
  getToken() { return this.token; }
  setBaseUrl(url: string) { this.baseUrl = url.replace(/\/$/, ''); }

  private buildQuery(query?: RequestOptions['query']): string {
    if (!query) return '';
    const params = Object.entries(query)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(String(v)));
    return params.length ? '?' + params.join('&') : '';
  }

  private async request<T>(path: string, opts: InternalRequestOptions): Promise<T> {
    const url = this.baseUrl + path + this.buildQuery(opts.query);
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      ...opts.headers,
    };
    let body: BodyInit | undefined;
    if (opts.body !== undefined && opts.body !== null && !(opts.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(opts.body);
    } else if (opts.body instanceof FormData) {
      body = opts.body; // browser sets proper boundary headers
    }
    if (this.token) headers['Authorization'] = 'Bearer ' + this.token;

    const res = await fetch(url, { method: opts.method, headers, body, signal: opts.signal });
    const contentType = res.headers.get('content-type') || '';
    let data: any = undefined;
    if (contentType.includes('application/json')) {
      try { data = await res.json(); } catch { /* ignore parse errors */ }
    } else if (!res.ok) {
      // Non-JSON error body; attempt text for diagnostics
      try { data = await res.text(); } catch { /* ignore */ }
    } else if (res.status !== 204) {
      // Possibly another type (blob, etc.) – allow caller to re-fetch if needed
      data = undefined;
    }

    if (!res.ok) {
      const message = (data && (data.error || data.message)) || `Request failed (${res.status})`;
      throw new ApiError(message, res.status, data);
    }
    return data as T;
  }

  // -------- USERS --------
  getMe(options?: RequestOptions) { return this.request<UserDoc>('/users/me', { method: 'GET', ...options }); }
  login(credentials: { email: string; password: string }) { return this.request<{
    email: null;
    pic: null; token: string; role: string; name: string; id: string; department?: string 
}>(`/users/login`, { method: 'POST', body: credentials }); }
  // Register new user (backend: POST /users/register)
  register(payload: { fullName: string; email: string; password: string; confirmpassword: string; department?: string | null; role?: string }) {
    return this.request<any>('/users/register', { method: 'POST', body: payload });
  }
  listUsers(params?: { department?: string }, options?: RequestOptions) { return this.request<UserDoc[]>('/users', { method: 'GET', query: params as any, ...options }); }
  listTeachers(params?: { department?: string }, options?: RequestOptions) { return this.request<UserDoc[]>('/users/teachers', { method: 'GET', query: params as any, ...options }); }
  listStudents(params?: { department?: string }, options?: RequestOptions) { return this.request<UserDoc[]>('/users/students', { method: 'GET', query: params as any, ...options }); }
  updateUser(id: string, body: Partial<UserDoc>, options?: RequestOptions) { return this.request<UserDoc>(`/users/update/${id}`, { method: 'PUT', body, ...options }); }
  getUser(id: string, options?: RequestOptions) { return this.request<UserDoc>(`/users/${id}`, { method: 'GET', ...options }); }
  changeMyPassword(payload: { currentPassword: string; newPassword: string }, options?: RequestOptions) { return this.request<{ changed: boolean }>('/users/me/password', { method: 'PUT', body: payload, ...options }); }
  updateMyProfile(payload: { fullName?: string; department?: string | null; profilepicFile?: File | null }, options?: RequestOptions) {
    const form = new FormData();
    if (payload.fullName !== undefined) form.append('fullName', payload.fullName);
    if (payload.department !== undefined && payload.department !== null) form.append('department', payload.department);
    if (payload.profilepicFile) form.append('profilepic', payload.profilepicFile);
    return this.request<any>('/users/me', { method: 'PUT', body: form, ...options });
  }

  // -------- DEPARTMENTS & CATEGORIES --------
  listDepartments(options?: RequestOptions) { return this.request<DepartmentDoc[]>('/departments', { method: 'GET', ...options }); }
  createDepartment(payload: { name: string; code: string; description?: string }, options?: RequestOptions) {
    return this.request<DepartmentDoc>('/departments', { method: 'POST', body: payload, ...options });
  }
  listCategories(options?: RequestOptions) { return this.request<CourseCategoryDoc[]>('/coursecatagory', { method: 'GET', ...options }); }

  // -------- COURSES --------
  listCourses(params?: { department?: string; teacher?: string; q?: string; page?: number; pageSize?: number }, options?: RequestOptions) {
    return this.request<any>('/courses', { method: 'GET', query: params as any, ...options }).then(resp => {
      if (resp && Array.isArray(resp.data)) return resp as Paginated<CourseDoc>;
      if (Array.isArray(resp)) {
        return { data: resp as CourseDoc[], total: resp.length, page: 1, pageSize: resp.length } as Paginated<CourseDoc>;
      }
      return { data: [], total: 0, page: params?.page || 1, pageSize: params?.pageSize || 0 } as unknown as Paginated<CourseDoc>;
    });
  }
  listMyCourses(options?: RequestOptions) { return this.request<any[]>('/courses/courses', { method: 'GET', ...options }); }
  listMyDepartmentCourses(options?: RequestOptions) { return this.request<any[]>('/courses/department/mine', { method: 'GET', ...options }); }
  getCourse(id: string, options?: RequestOptions) { return this.request<CourseDoc>(`/courses/${id}`, { method: 'GET', ...options }); }
  getCourseDetails(id: string, options?: RequestOptions) { return this.request<any>(`/courses/${id}/details`, { method: 'GET', ...options }); }
  createCourse(input: CreateCourseInput, options?: RequestOptions) { return this.request<CourseDoc>('/courses', { method: 'POST', body: input, ...options }); }
  updateCourse(id: string, input: UpdateCourseInput, options?: RequestOptions) { return this.request<CourseDoc>(`/courses/${id}`, { method: 'PUT', body: input, ...options }); }
  deleteCourse(id: string, options?: RequestOptions) { return this.request<{ deleted?: boolean }>(`/courses/${id}`, { method: 'DELETE', ...options }); }
  assignTeacher(courseId: string, teacherId: string, options?: RequestOptions) { return this.request<CourseDoc>(`/courses/${courseId}/assign-teacher/${teacherId}`, { method: 'PUT', ...options }); }
  // Department overview stats (department head/admin)
  getDepartmentOverview(options?: RequestOptions) { return this.request<any>('/courses/department/overview/stats', { method: 'GET', ...options }); }

  // -------- MODULES --------
  listCourseModules(courseId: string, options?: RequestOptions) { return this.request<CourseModuleDoc[]>(`/coursemodule/course/${courseId}`, { method: 'GET', ...options }); }
  getModule(id: string, options?: RequestOptions) { return this.request<CourseModuleDoc>(`/coursemodule/${id}`, { method: 'GET', ...options }); }
  createModule(courseId: string, payload: { name: string; content: string; order: number; type?: string; videolink?: string; linkUrl?: string; videoFile?: File }, options?: RequestOptions) {
    const form = new FormData();
    form.append('name', payload.name);
    form.append('content', payload.content || '');
    form.append('order', String(payload.order));
    form.append('type', payload.type || 'text');
    if (payload.videolink) form.append('videolink', payload.videolink);
    if (payload.linkUrl) form.append('linkUrl', payload.linkUrl);
    if (payload.videoFile) form.append('video', payload.videoFile);
    return this.request<CourseModuleDoc>(`/coursemodule/${courseId}/create`, { method: 'POST', body: form, ...options });
  }
  updateModule(courseId: string, id: string, payload: { name?: string; content?: string; order?: number; type?: string; videolink?: string; linkUrl?: string; videoFile?: File }, options?: RequestOptions) {
    const form = new FormData();
    if (payload.name !== undefined) form.append('name', payload.name);
    if (payload.content !== undefined) form.append('content', payload.content);
    if (payload.order !== undefined) form.append('order', String(payload.order));
    if (payload.type !== undefined) form.append('type', payload.type);
    if (payload.videolink) form.append('videolink', payload.videolink);
    if (payload.linkUrl) form.append('linkUrl', payload.linkUrl);
    if (payload.videoFile) form.append('video', payload.videoFile);
    return this.request<CourseModuleDoc>(`/coursemodule/${courseId}/update/${id}`, { method: 'PUT', body: form, ...options });
  }
  deleteModule(courseId: string, id: string, options?: RequestOptions) { return this.request<CourseModuleDoc>(`/coursemodule/${courseId}/delete/${id}`, { method: 'DELETE', ...options }); }
  listModuleApprovals(params?: { status?: string; course?: string }, options?: RequestOptions) { return this.request<any[]>(`/coursemodule/approvals`, { method: 'GET', query: params as any, ...options }); }
  approveModule(id: string, options?: RequestOptions) { return this.request<{ _id: string; status: string }>(`/coursemodule/${id}/approve`, { method: 'POST', ...options }); }
  rejectModule(id: string, options?: RequestOptions) { return this.request<{ _id: string; status: string }>(`/coursemodule/${id}/reject`, { method: 'POST', ...options }); }

  // -------- ASSIGNMENTS --------
  listAssignments(params?: { course?: string; module?: string }, options?: RequestOptions) {
    return this.request<AssignmentDoc[]>('/assignments', { method: 'GET', query: params as any, ...options });
  }
  listMyAssignments(options?: RequestOptions) { return this.request<any[]>('/assignments/my', { method: 'GET', ...options }); }
  getAssignment(id: string, options?: RequestOptions) { return this.request<AssignmentDoc>(`/assignments/${id}`, { method: 'GET', ...options }); }
  createAssignment(payload: Partial<AssignmentDoc>, options?: RequestOptions) { return this.request<AssignmentDoc>('/assignments', { method: 'POST', body: payload, ...options }); }
  updateAssignment(id: string, payload: Partial<AssignmentDoc>, options?: RequestOptions) { return this.request<AssignmentDoc>(`/assignments/${id}`, { method: 'PUT', body: payload, ...options }); }
  deleteAssignment(id: string, options?: RequestOptions) { return this.request<{ deleted: boolean }>(`/assignments/${id}`, { method: 'DELETE', ...options }); }
  submitAssignment(assignmentId: string, form: FormData, options?: RequestOptions) {
    return this.request<AssignmentSubmissionDoc>(`/assignments/${assignmentId}/submit`, { method: 'POST', body: form, ...options });
  }
  listAssignmentSubmissions(assignmentId: string, options?: RequestOptions) { return this.request<any[]>(`/assignments/${assignmentId}/submissions`, { method: 'GET', ...options }); }
  gradeAssignmentSubmission(assignmentId: string, studentId: string, grade: number, options?: RequestOptions) {
    return this.request<any>(`/assignments/${assignmentId}/grade/${studentId}`, { method: 'POST', body: { grade }, ...options });
  }

  // -------- EXAMS --------
  listMyUpcomingExams(options?: RequestOptions) { return this.request<{ exams: any[] }>(`/exams/my/upcoming`, { method: 'GET', ...options }); }
  listMyEnrolledExams(options?: RequestOptions) { return this.request<{ exams: any[] }>(`/exams/my/enrolled`, { method: 'GET', ...options }); }
  getExam(id: string, options?: RequestOptions) { return this.request<ExamDoc>(`/exams/${id}`, { method: 'GET', ...options }); }
  createExam(payload: Partial<ExamDoc>, options?: RequestOptions) { return this.request<ExamDoc>('/exams', { method: 'POST', body: payload, ...options }); }
  updateExam(id: string, payload: Partial<ExamDoc>, options?: RequestOptions) { return this.request<ExamDoc>(`/exams/${id}`, { method: 'PUT', body: payload, ...options }); }
  listExamApprovals(params?: { status?: string; course?: string }, options?: RequestOptions) { return this.request<any[]>(`/exams/approvals`, { method: 'GET', query: params as any, ...options }); }
  approveExam(id: string, options?: RequestOptions) { return this.request<{ _id: string; status: string }>(`/exams/${id}/approve`, { method: 'POST', ...options }); }
  rejectExam(id: string, options?: RequestOptions) { return this.request<{ _id: string; status: string }>(`/exams/${id}/reject`, { method: 'POST', ...options }); }
  listExamSubmissions(examId: string, options?: RequestOptions) { return this.request<any[]>(`/exams/${examId}/submissions`, { method: 'GET', ...options }); }
  gradeExamSubmission(examId: string, submissionId: string, manualScore: number, options?: RequestOptions) { return this.request<any>(`/exams/${examId}/submissions/${submissionId}/grade`, { method: 'POST', body: { manualScore }, ...options }); }
  getExamSubmissionDetail(examId: string, submissionId: string, options?: RequestOptions) { return this.request<any>(`/exams/${examId}/submissions/${submissionId}`, { method: 'GET', ...options }); }

  // -------- RESULTS --------
  listResults(params?: { courseId?: string; user?: string }, options?: RequestOptions) {
    return this.request<ResultDoc[]>('/results', { method: 'GET', query: params as any, ...options });
  }
  getResult(id: string, options?: RequestOptions) { return this.request<ResultDoc>(`/results/${id}`, { method: 'GET', ...options }); }
  approveResult(id: string, options?: RequestOptions) { return this.request<any>(`/results/${id}/approve`, { method: 'POST', ...options }); }
  listResultApprovals(params?: { course?: string; exam?: string; approved?: string }, options?: RequestOptions) {
    return this.request<any[]>(`/results/approvals`, { method: 'GET', query: params as any, ...options });
  }
  listExamSubmissionsOverview(options?: RequestOptions) { return this.request<any[]>(`/results/overview/exams`, { method: 'GET', ...options }); }
  getTranscript(options?: RequestOptions) { return this.request<any[]>(`/results/transcript`, { method: 'GET', ...options }); }

  // Example exam submission (payload shape is app-specific)
  submitExam(examId: string, payload: { answers: { questionId: string; answerId?: string; text?: string }[] }, options?: RequestOptions) {
    return this.request<ResultDoc>(`/exams/${examId}/submit`, { method: 'POST', body: payload, ...options }); }

  // -------- ENROLLMENT --------
  enrollCourse(courseId: string, options?: RequestOptions) { return this.request<EnrolledCourseDoc>(`/enroll/${courseId}`, { method: 'POST', ...options }); }
  assignStudent(courseId: string, studentId: string, options?: RequestOptions) { return this.request<any>(`/enroll/assign/${courseId}/${studentId}`, { method: 'POST', ...options }); }
  unassignStudent(courseId: string, studentId: string, options?: RequestOptions) { return this.request<any>(`/enroll/assign/${courseId}/${studentId}`, { method: 'DELETE', ...options }); }
  listEnrolled(options?: RequestOptions) { return this.request<EnrolledCourseDoc[]>('/enroll', { method: 'GET', ...options }); }
  // Student dashboard progress listing (GET /Enrollments/with-progress)
  listEnrolledWithProgress(options?: RequestOptions) { return this.request<any[]>(`/enroll/with-progress`, { method: 'GET', ...options }); }
  // Mark a module as completed within a course (PUT /Enrollments/:courseid/completemodule { moduleid })
  completeModule(courseId: string, moduleId: string, options?: RequestOptions) {
    return this.request<any>(`/enroll/${courseId}/completemodule`, { method: 'PUT', body: { moduleid: moduleId }, ...options });
  }
  // Course modules progress list (GET /Enrollments/:courseid/modules/progress)
  listCourseModulesProgress(courseId: string, options?: RequestOptions) {
    return this.request<any[]>(`/enroll/${courseId}/modules/progress`, { method: 'GET', ...options });
  }
  // Single module detail with completion flag (GET /Enrollments/:courseid/module/:moduleid)
  getCourseModuleDetail(courseId: string, moduleId: string, options?: RequestOptions) {
    return this.request<any>(`/enroll/${courseId}/module/${moduleId}`, { method: 'GET', ...options });
  }

  // -------- NOTIFICATIONS --------
  listNotifications(options?: RequestOptions) { return this.request<NotificationDoc[]>('/notifications', { method: 'GET', ...options }); }
  markNotificationRead(id: string, options?: RequestOptions) { return this.request<NotificationDoc>(`/notifications/${id}/read`, { method: 'POST', ...options }); }

  // -------- TERMS --------
  listTerms(options?: RequestOptions) { return this.request<TermDoc[]>('/terms', { method: 'GET', ...options }); }

  // -------- PAYMENTS --------
  listPayments(params?: { user?: string; course?: string }, options?: RequestOptions) {
    return this.request<PaymentDoc[]>('/payments', { method: 'GET', query: params as any, ...options });
  }
}

// Shared singleton (optional). Create additional instances if you need different tokens simultaneously.
export const apiClient = new ApiClient();

// Helper: build an AbortController + timeout for quick cancellation.
export function withTimeout(ms: number): { signal: AbortSignal; cancel: () => void } {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, cancel: () => clearTimeout(id) };
}

// Helper: safely unwrap ApiError
export function isApiError(e: unknown): e is ApiError { return e instanceof ApiError; }
