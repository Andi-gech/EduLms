// Centralized domain model types derived from backend Mongoose schemas and reused frontend page shapes.
// Keep these in sync with Backend/model/*.js. Prefer using these instead of redefining inline interfaces.

// ----- User -----
export type UserRole = 'Registrar' | 'student' | 'teacher' | 'short_training_office' | 'short_training_department' | 'department_head' | 'department_admin';
// Some frontend demo pages refer to an 'admin' role not present in backend enum; keep a UI-only extension.
export type ExtendedUserRole = UserRole | 'admin';
export interface UserRatingEntry { rate: number; user: string } // user: ObjectId
export interface UserDoc {
  _id: string;
  fullName: string;
  email: string;
  role: UserRole;
  department?: string | null;
  profilepic?: string;
  status: boolean; // active?
  rating: UserRatingEntry[];
  averageRating?: number;
  createdAt?: string;
  updatedAt?: string;
}

// ----- Department -----
export interface DepartmentDoc { _id: string; name: string; code: string; description?: string; head?: string; createdAt?: string; updatedAt?: string }

// ----- Course Category -----
export interface CourseCategoryDoc { _id: string; name: string; description: string; image?: string }

// ----- Course -----
export interface CourseDoc {
  _id: string;
  name: string;
  description: string;
  image?: string;
  // price & catagory removed
  createdBy: string; // User id
  department?: string | null; // Department id
  assignedTeacher?: string | null; // User id
  startDate?: string | null;
  endDate?: string | null;
  status: boolean;
  // virtuals
  coursemodules?: CourseModuleDoc[];
}

// ----- Course Module -----
export interface CourseModuleDoc { _id: string; name: string; content: string; videolink?: string; order: number; course: string }
// Progress shape (student enrollment context)
export interface CourseModuleProgress { _id: string; name: string; order: number; completed: boolean }

// ----- Assignment & Submission -----
export interface AssignmentDoc { _id: string; title: string; description: string; points: number; course: string; module?: string; dueDate: string; createdBy: string; createdAt: string }
export interface AssignmentSubmissionDoc { _id: string; assignment: string; student: string; filePath: string; notes?: string; submittedAt: string; grade?: number; gradedAt?: string; gradedBy?: string }

// ----- Exams / Questions -----
export type QuestionType = 'multiple_choice' | 'blank'; // backend naming
export interface AnswerDoc { _id: string; answer: string; isCorrect: boolean }
export interface QuestionDoc {
  _id: string;
  question: string;
  type: QuestionType;
  mark: number;
  answers?: AnswerDoc[]; // only for multiple_choice
  blankAnswer?: string;  // for blank
}
export interface ExamDoc {
  _id: string;
  title: string;
  questions: string[] | QuestionDoc[]; // may be populated
  CourseModule: string; // module id
  createdBy: string; // user id
  ExamMark: number;
  examDuration: number; // minutes
  examDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}

// ----- Exam Result (frontend aggregated shape) -----
export interface ExamResultQuestion extends UIQuestionBase { correctAnswer: string; userAnswer?: string; correct?: boolean; options?: UIChoiceOption[]; teacherComment?: string }
export interface ExamAttemptSummary { examId: string; examTitle: string; passingScore: number; score: number; total: number; percentage: number; passed: boolean; gradedAt?: string; questions: ExamResultQuestion[] }

// Frontend simplified exam/question forms (choice/short) used in UI builders
export type UIChoiceOption = { id: string; text: string };
export type UIQuestionBase = { id: string; type: 'choice' | 'short'; question: string; mark: number, modified?: boolean };
export type UIQuestionChoice = UIQuestionBase & { type: 'choice'; options: UIChoiceOption[]; correctAnswer: string };
export type UIQuestionShort = UIQuestionBase & { type: 'short'; correctAnswer: string };
export type UIQuestion = UIQuestionChoice | UIQuestionShort;

// ----- Enrollment -----
export interface EnrolledModuleProgress { result?: number; id: string }
export interface EnrolledCourseDoc {
  _id: string;
  user: string;
  course: string;
  enrolledBy?: string | null;
  enrolledAt: string;
  completedModules: EnrolledModuleProgress[];
  status: 'in-progress' | 'completed';
  completedAt?: string;
}

// ----- Result (exam attempt) -----
export interface ResultHistoryEntry { Questionid: string; Answerid?: string }
export interface ResultDoc {
  _id: string;
  user: { _id: string; name: string; email?: string };
  course: { _id: string; name: string };
  exams: { exam: string; mark: number }[];
  assignments: { assignment: string,mark:number }[];
  totalMark: number;
  isPassed: boolean;
  date: string;
  approved: boolean;
}

// ----- Notification -----
export interface NotificationDoc { _id: string; type: 'info' | 'success' | 'warning' | 'error'; description: string; date: string; isRead: boolean; user: string }

// ----- Term -----
export interface TermDoc { _id: string; name: string; code: string; startDate: string; endDate: string; active: boolean; createdAt?: string; updatedAt?: string }

// ----- Payment -----
export interface PaymentDoc { _id: string; amount: number; paymentMode: string; user: string; course: string; txtRef: string; date: string }

// Utility generics
export type WithId<T> = T & { _id: string };

// Pagination wrapper commonly used by APIs
export interface Paginated<T> {
  docs: never[]; data: T[]; total: number; page: number; pageSize: number 
}

// ----- UI: Assignments (frontend status & list/detail) -----
export type AssignmentStatus = 'pending' | 'submitted' | 'graded' | 'overdue';
export interface UIAssignment {
  id: string; // UI friendly id (may mirror AssignmentDoc._id)
  course: string; // course code or name (display)
  title: string;
  points: number;
  dueDate: string; // ISO string
  status: AssignmentStatus;
  submittedAt?: string;
  grade?: number;
  description: string;
}

// ----- UI: Grade Summary / Transcript -----
export interface GradeItem { id: string | number; name: string; grade: number; weight: number }
// Keeping existing property naming used in current pages (quizes, Assignment, exam) for minimal refactor impact
export interface CourseGradeData { id: string | number; name: string; code: string; quizes: GradeItem[]; Assignment: GradeItem[]; exam: GradeItem[]; totalGrade?: number }

// ----- UI: Exam schedule / listing (teacher upcoming exams) -----
export interface RawExamItem { _id: string; title: string; moduleName?: string | null; courseId?: string | null; examDate?: string; startTime?: string; endTime?: string }

// ----- UI: Content Approval (department) -----
export type ModuleContentType = 'text' | 'video' | 'link' | 'file';
export type ModuleApprovalStatus = 'pending' | 'approved' | 'rejected';
export interface ModuleAttachment { id: string; name: string; size: number; type: string }
export interface ModuleItem { id: string; title: string; type: ModuleContentType; content: string; status: ModuleApprovalStatus; author: string; order: number; changed?: boolean; videoUrl?: string; linkUrl?: string; attachments?: ModuleAttachment[] }
export interface CourseContentItem { id: string; name: string; code: string; modules: ModuleItem[]; owner: string }

// ----- UI: Exam Approval (department) -----
export type ApprovalExamQuestionType = 'mcq' | 'short';
export interface ApprovalExamChoice { id: string; text: string }
export interface ApprovalExamQuestion { id: string; text: string; type: ApprovalExamQuestionType; options?: ApprovalExamChoice[]; answer: string }
export type ApprovalExamStatus = 'pending' | 'approved' | 'rejected';
export interface ApprovalExamItem { id: string; title: string; course: string; status: ApprovalExamStatus; durationMin: number; totalQuestions: number; createdBy: string; questions: ApprovalExamQuestion[]; createdAt: string }

// ----- UI: Grade Approval (department) -----
export interface StudentGradeItem { _id: string; name: string; mark: number }

// ----- UI: Teacher Assignment Management -----
export interface TeacherAssignmentRow { _id: string; title: string; dueDate: string; points: number; status: 'pending' | 'overdue'; submissions: number; gradedSubmissions: number }
export interface AssignmentFormData { title: string; description: string; points: number; dueDate: string; course?: string; module?: string }

// ----- UI: Assignment Submissions (teacher) -----
export interface AssignmentSubmissionRowUI { _id: string; student: { firstName: string; lastName: string; email: string }; submittedAt: string; grade?: number; filePath: string }

// ----- UI: Exam Submissions listing (teacher) -----
export type ExamSubmissionStatus = 'pending' | 'graded' | 'in-progress';
export interface ExamSubmissionRowUI { id: string; examId: string; examTitle: string; studentId: string; studentName: string; submittedAt: string; autoScore: number; totalMarks: number; teacherScore?: number; status: ExamSubmissionStatus }

// ----- UI: Teacher Overview quick links -----
export interface QuickLinkItem { label: string; icon: any; to: string; desc: string }

// ----- UI: Course Module Management (teacher local editing) -----
export interface ModuleAttachmentEdit { id: string; name: string; size: number; type: string; file?: File }
export type ModuleEditType = 'text' | 'video' | 'link' | 'file';
export interface ModuleEditItem { _id?: string; name: string; content: string; order: number; type: ModuleEditType; videoUrl?: string; linkUrl?: string; attachments?: ModuleAttachmentEdit[]; isNew?: boolean; changed?: boolean }
