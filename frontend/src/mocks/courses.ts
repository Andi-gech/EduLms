import type { CourseDoc, CourseContentItem } from '@/types/domain';

// Aligns with CourseDoc fields; using price/status placeholders
export const mockCourses: CourseDoc[] = [
  { _id: 'c101', name: 'Software Engineering', description: 'Intro to software engineering principles', image: undefined, price: 0, catagory: null, createdBy: 'u-teacher-1', department: null, assignedTeacher: 'u-teacher-1', startDate: null, endDate: null, theme: 'blue', status: true, coursemodules: [] },
  { _id: 'c102', name: 'Algorithms', description: 'Algorithm design and analysis', image: undefined, price: 0, catagory: null, createdBy: 'u-teacher-2', department: null, assignedTeacher: 'u-teacher-2', startDate: null, endDate: null, theme: 'green', status: true, coursemodules: [] },
  { _id: 'c103', name: 'Databases', description: 'Relational database systems', image: undefined, price: 0, catagory: null, createdBy: 'u-teacher-3', department: null, assignedTeacher: 'u-teacher-3', startDate: null, endDate: null, theme: 'purple', status: true, coursemodules: [] }
];

export const mockCourseContentFlat: CourseContentItem[] = [
  { id: 'c101', name: 'Software Engineering', code: 'SE101', owner: 'Dr. Smith', modules: [] },
  { id: 'c102', name: 'Algorithms', code: 'AL201', owner: 'Prof. Lee', modules: [] },
  { id: 'c103', name: 'Databases', code: 'DB150', owner: 'Dr. Gomez', modules: [] },
];
