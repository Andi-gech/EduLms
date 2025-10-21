import type { UIAssignment, TeacherAssignmentRow, AssignmentSubmissionRowUI, AssignmentFormData } from '@/types/domain';

export const mockStudentAssignments: UIAssignment[] = [
  { id: 'a1', course: 'CS101', title: 'Algorithm Analysis Essay', points: 20, dueDate: new Date(Date.now() + 2*86400000).toISOString(), status: 'overdue', description: 'Write an essay analyzing Big-O of provided pseudocode snippets.' },
  { id: 'a2', course: 'MATH201', title: 'Derivative Problem Set', points: 25, dueDate: new Date(Date.now() + 86400000).toISOString(), status: 'submitted', submittedAt: new Date().toISOString(), description: 'Complete the derivative exercises (chapters 3 & 4).' },
  { id: 'a3', course: 'ENG110', title: 'Final Essay Draft', points: 30, dueDate: new Date(Date.now() - 86400000).toISOString(), status: 'graded', grade: 27, submittedAt: new Date(Date.now() - 2*86400000).toISOString(), description: 'Submit your refined essay draft for feedback.' }
];

export const mockTeacherAssignments: TeacherAssignmentRow[] = [
  { _id: 'ax1', title: 'Intro Essay', dueDate: new Date(Date.now()+86400000).toISOString(), points: 20, status: 'pending', submissions: 5, gradedSubmissions: 2 },
  { _id: 'ax2', title: 'Project Proposal', dueDate: new Date(Date.now()-3600000).toISOString(), points: 10, status: 'overdue', submissions: 8, gradedSubmissions: 8 }
];

export const mockAssignmentSubmissions: AssignmentSubmissionRowUI[] = [
  { _id: 's1', student: { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' }, submittedAt: new Date(Date.now()-3600000).toISOString(), filePath: 'uploads/assignments/file1.pdf', grade: 18 },
  { _id: 's2', student: { firstName: 'John', lastName: 'Smith', email: 'john@example.com' }, submittedAt: new Date(Date.now()-7200000).toISOString(), filePath: 'uploads/assignments/file2.pdf' }
];

export const mockAssignmentStore: Record<string, AssignmentFormData> = {
  ax1: { title: 'Intro Essay', description: 'Write an introductory essay about algorithms.', points: 20, dueDate: new Date(Date.now()+86400000).toISOString() },
};
