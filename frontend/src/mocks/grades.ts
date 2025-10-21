import type { CourseGradeData } from '@/types/domain';

// Mock course grade summary data (student transcript) used in GradePage.
// Replace via API call when backend endpoint (e.g. /grades/transcript) exists.
export const mockCourseGrades: CourseGradeData[] = [
  { id: 1, name: 'Introduction to Computer Science', code: 'CS101', quizes: [ { id: 1, name: 'Basic Algorithms', grade: 10, weight: 20 }, { id: 2, name: 'Data Structures', grade: 18, weight: 20 } ], Assignment: [ { id: 1, name: 'Programming Assignment 1', grade: 9, weight: 10 }, { id: 2, name: 'Programming Assignment 2', grade: 10, weight: 10 } ], exam: [ { id: 1, name: 'Final Exam', grade: 45, weight: 50 } ], totalGrade: 92 },
  { id: 2, name: 'Calculus I', code: 'MATH201', quizes: [ { id: 1, name: 'Limits & Continuity', grade: 19, weight: 20 }, { id: 2, name: 'Derivatives', grade: 17, weight: 20 } ], Assignment: [ { id: 1, name: 'Problem Set 1', grade: 10, weight: 10 }, { id: 2, name: 'Problem Set 2', grade: 9, weight: 10 } ], exam: [ { id: 1, name: 'Final Exam', grade: 48, weight: 50 } ], totalGrade: 94 },
  { id: 3, name: 'English Composition', code: 'ENG110', quizes: [ { id: 1, name: 'Grammar & Punctuation', grade: 28, weight: 30 } ], Assignment: [ { id: 1, name: 'Essay Draft', grade: 9, weight: 10 }, { id: 2, name: 'Final Essay', grade: 10, weight: 10 } ], exam: [ { id: 1, name: 'Final Exam', grade: 46, weight: 50 } ], totalGrade: 93 }
];
