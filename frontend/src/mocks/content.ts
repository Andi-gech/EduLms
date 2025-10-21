import type { CourseContentItem, StudentGradeItem } from '@/types/domain';

export const mockCourseContent: CourseContentItem[] = [
  {
    id: 'c1', name: 'Software Engineering', code: 'SE101', owner: 'Dr. Smith',
    modules: [
      { id: 'm1', title: 'Intro & Objectives', type: 'text', content: '<h2>Welcome</h2><p>Goals...</p>', status: 'pending', author: 'Dr. Smith', order: 1 },
      { id: 'm2', title: 'SDLC Models (Video)', type: 'video', content: 'Overview on models', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', status: 'approved', author: 'Dr. Smith', order: 2 },
      { id: 'm3', title: 'External Reference (Link)', type: 'link', content: 'Official IEEE standards summary.', linkUrl: 'https://example.com/ieee-std', status: 'pending', author: 'Dr. Smith', order: 3 },
      { id: 'm4', title: 'Design Principles (Files)', type: 'file', content: 'Attached handouts for design principles.', attachments: [ { id:'a1', name:'design-principles.pdf', size: 234567, type:'application/pdf'} ], status: 'rejected', author: 'Dr. Smith', order: 4 }
    ]
  },
  {
    id: 'c2', name: 'Algorithms', code: 'AL201', owner: 'Prof. Lee',
    modules: [
      { id: 'm5', title: 'Complexity Analysis', type: 'text', content: '<p>Big O basics</p>', status: 'pending', author: 'Prof. Lee', order: 1 },
      { id: 'm6', title: 'Sorting Lecture', type: 'video', content: 'Sorting explanation video', videoUrl: 'https://www.youtube.com/watch?v=PgBzjlCcFvc', status: 'pending', author: 'Prof. Lee', order: 2 },
      { id: 'm7', title: 'Algorithm Portal', type: 'link', content: 'Curated algorithm practice portal.', linkUrl: 'https://example.com/algos', status: 'pending', author: 'Prof. Lee', order: 3 },
      { id: 'm8', title: 'Supplemental Files', type: 'file', content: 'Extra diagrams and notes.', attachments: [{ id:'a2', name:'sorting-diagrams.png', size: 45678, type:'image/png'}], status: 'pending', author: 'Prof. Lee', order: 4 }
    ]
  }
];

export const mockStudentGrades: StudentGradeItem[] = [
  { _id: 's1', name: 'Alice Johnson', mark: 94 },
  { _id: 's2', name: 'Bob Smith', mark: 77 },
  { _id: 's3', name: 'Charlie Kim', mark: 58 },
  { _id: 's4', name: 'Dina Lopez', mark: 49 },
  { _id: 's5', name: 'Evan Reed', mark: 83 },
  { _id: 's6', name: 'Fatima Ali', mark: 66 },
  { _id: 's7', name: 'George Park', mark: 35 },
  { _id: 's8', name: 'Helen Zhang', mark: 100 },
];
