import type { RawExamItem, ApprovalExamItem, UIQuestionChoice, UIQuestionShort, ExamSubmissionRowUI } from '@/types/domain';

// Shared mock exams for teacher upcoming list / exam view
export const mockUpcomingExams: (RawExamItem & { ExamMark?: number; examDuration?: number })[] = (() => {
  const now = Date.now();
  const hour = 60 * 60 * 1000;
  return [
    { _id: 'ex1', title: 'Intro to Algorithms Midterm', moduleName: 'Algorithms Module 1', startTime: new Date(now + 2 * hour).toISOString(), endTime: new Date(now + 4 * hour).toISOString(), ExamMark: 50, examDuration: 120 },
    { _id: 'ex2', title: 'Database Systems Quiz', moduleName: 'DB Module 2', startTime: new Date(now - hour).toISOString(), endTime: new Date(now + hour).toISOString(), ExamMark: 60, examDuration: 30 },
    { _id: 'ex3', title: 'Operating Systems Final', moduleName: 'OS Module 5', startTime: new Date(now - 5 * hour).toISOString(), endTime: new Date(now - 2 * hour).toISOString(), ExamMark: 55, examDuration: 180 },
    { _id: 'ex4', title: 'Networks Daily Check', moduleName: 'Networks Module 3', examDate: new Date(now + 24 * hour).toISOString(), ExamMark: 40, examDuration: 15 }
  ];
})();

// Exam approval mock set (department)
export const mockApprovalExams: ApprovalExamItem[] = [
  {
    id: 'e1', title: 'SE Midterm 1', course: 'Software Engineering', status: 'pending', durationMin: 45, totalQuestions: 6, createdBy: 'Dr. Smith', createdAt: '2025-08-01',
    questions: [
      { id: 'q1', text: 'Define software engineering.', type: 'short', answer: 'Systematic development of software.' },
      { id: 'q2', text: 'Which model allows iterative feedback?', type: 'mcq', options: [ { id: 'A', text: 'Waterfall' }, { id: 'B', text: 'Agile' }, { id: 'C', text: 'Big Bang' } ], answer: 'B' },
      { id: 'q3', text: 'Name two UML diagrams.', type: 'short', answer: 'Class, Sequence.' },
      { id: 'q4', text: 'Primary benefit of CI?', type: 'mcq', options: [ { id: 'A', text: 'Late integration' }, { id: 'B', text: 'Early issue detection' }, { id: 'C', text: 'No testing needed' } ], answer: 'B' },
      { id: 'q5', text: 'Expand DRY.', type: 'short', answer: 'Don\'t Repeat Yourself' },
      { id: 'q6', text: 'Which is not a design principle?', type: 'mcq', options: [ { id: 'A', text: 'SOLID' }, { id: 'B', text: 'KISS' }, { id: 'C', text: 'YOLO' } ], answer: 'C' }
    ]
  },
  {
    id: 'e2', title: 'Algorithms Quiz A', course: 'Algorithms', status: 'approved', durationMin: 25, totalQuestions: 4, createdBy: 'Prof. Lee', createdAt: '2025-08-10',
    questions: [
      { id: 'q1', text: 'Big O of binary search?', type: 'mcq', options: [ { id: 'A', text: 'O(n)' }, { id: 'B', text: 'O(log n)' }, { id: 'C', text: 'O(n log n)' } ], answer: 'B' },
      { id: 'q2', text: 'Define stable sort.', type: 'short', answer: 'Maintains relative order of equal elements.' },
      { id: 'q3', text: 'Quick sort worst case?', type: 'mcq', options: [ { id: 'A', text: 'O(n^2)' }, { id: 'B', text: 'O(log n)' }, { id: 'C', text: 'O(n)' } ], answer: 'A' },
      { id: 'q4', text: 'Heap insertion time?', type: 'mcq', options: [ { id: 'A', text: 'O(log n)' }, { id: 'B', text: 'O(n)' }, { id: 'C', text: 'O(1)' } ], answer: 'A' }
    ]
  },
  {
    id: 'e3', title: 'Algorithms Final Draft', course: 'Algorithms', status: 'pending', durationMin: 60, totalQuestions: 8, createdBy: 'Prof. Lee', createdAt: '2025-08-18',
    questions: [
      { id: 'q1', text: 'Define NP-Complete.', type: 'short', answer: 'In NP and every NP problem reduces to it.' },
      { id: 'q2', text: 'Graph traversal that uses a queue?', type: 'mcq', options: [ { id: 'A', text: 'DFS' }, { id: 'B', text: 'BFS' }, { id: 'C', text: 'Dijkstra' } ], answer: 'B' },
      { id: 'q3', text: 'Space complexity of merge sort?', type: 'mcq', options: [ { id: 'A', text: 'O(1)' }, { id: 'B', text: 'O(log n)' }, { id: 'C', text: 'O(n)' } ], answer: 'C' },
      { id: 'q4', text: 'Purpose of hashing?', type: 'short', answer: 'Fast lookup.' },
      { id: 'q5', text: 'Two self-balancing trees.', type: 'short', answer: 'AVL, Red-Black.' },
      { id: 'q6', text: 'Which has amortized O(1) push?', type: 'mcq', options: [ { id: 'A', text: 'Stack (array)' }, { id: 'B', text: 'Linked list queue' }, { id: 'C', text: 'Binary heap' } ], answer: 'A' },
      { id: 'q7', text: 'Define memoization.', type: 'short', answer: 'Caching expensive function results.' },
      { id: 'q8', text: 'Shortest path algorithm with negative weights?', type: 'mcq', options: [ { id: 'A', text: 'Dijkstra' }, { id: 'B', text: 'Bellman-Ford' }, { id: 'C', text: 'Prim' } ], answer: 'B' }
    ]
  }
];

// Student / evaluation mock exam with detailed questions & local scoring
// Single detailed exam structure reused in ExamView & creation/edit demos.
export const mockFullExam = {
  examTitle: 'Sample Mixed Exam',
  passingScore: 60,
  timeLimit: 45,
  questions: [
  { id: '1', type: 'choice', question: 'Which data structure offers O(1) average lookup time?', options: [ { id: 'A', text: 'Array' }, { id: 'B', text: 'Hash Table' }, { id: 'C', text: 'Linked List' }, { id: 'D', text: 'Binary Tree' } ], correctAnswer: 'B' } as UIQuestionChoice,
  { id: '2', type: 'short', question: 'Define Big-O notation briefly.', correctAnswer: 'Asymptotic upper bound on growth rate of algorithm runtime' } as UIQuestionShort,
  ]
};

// Teacher exam submissions overview (aggregated source) - used in ExamSubmissionsOverview
export const mockExamSubmissionOverview: ExamSubmissionRowUI[] = [
  { id: 'sub1', examId: 'ex1', examTitle: 'Midterm Algebra', studentId: 'stu1', studentName: 'Alice Johnson', submittedAt: new Date(Date.now() - 1000*60*15).toISOString(), autoScore: 32, totalMarks: 50, status: 'pending' },
  { id: 'sub2', examId: 'ex1', examTitle: 'Midterm Algebra', studentId: 'stu2', studentName: 'Brian Smith', submittedAt: new Date(Date.now() - 1000*60*45).toISOString(), autoScore: 41, totalMarks: 50, status: 'graded', teacherScore: 6 },
  { id: 'sub3', examId: 'ex2', examTitle: 'Physics Quiz 1', studentId: 'stu3', studentName: 'Carla Green', submittedAt: new Date(Date.now() - 1000*60*5).toISOString(), autoScore: 18, totalMarks: 40, status: 'in-progress' }
];

// Teacher overview dashboard aggregated mock stats & chart series
export const mockTeacherOverview = {
  summary: {
    assignedCourses: 4,
    upcomingExams: 2,
    pendingGrading: 5,
    assignments: 3,
    unreadNotifications: 4,
    approvedExams: 6,
  },
  recentActivity: [
    { id: 1, type: 'exam', text: 'New exam created for Intro to Algorithms', time: '2h ago' },
    { id: 2, type: 'assignment', text: '5 submissions awaiting grading in Data Structures', time: '5h ago' },
    { id: 3, type: 'module', text: 'Updated Module order in Web Dev 101', time: 'Yesterday' },
  ],
  courses: [
    { id: 'c1', name: 'Intro Algorithms' },
    { id: 'c2', name: 'Data Structures' },
    { id: 'c3', name: 'Web Dev 101' },
  ],
  submissionSeries: {
    c1: [
      { name: 'Mon', attempts: 10, graded: 7 },
      { name: 'Tue', attempts: 14, graded: 9 },
      { name: 'Wed', attempts: 6, graded: 4 },
      { name: 'Thu', attempts: 18, graded: 11 },
      { name: 'Fri', attempts: 12, graded: 8 },
    ],
    c2: [
      { name: 'Mon', attempts: 5, graded: 3 },
      { name: 'Tue', attempts: 8, graded: 5 },
      { name: 'Wed', attempts: 9, graded: 6 },
      { name: 'Thu', attempts: 11, graded: 7 },
      { name: 'Fri', attempts: 7, graded: 5 },
    ],
    c3: [
      { name: 'Mon', attempts: 12, graded: 9 },
      { name: 'Tue', attempts: 16, graded: 12 },
      { name: 'Wed', attempts: 7, graded: 4 },
      { name: 'Thu', attempts: 22, graded: 15 },
      { name: 'Fri', attempts: 15, graded: 10 },
    ],
  },
  contentApproval: [
    { name: 'Approved', value: 34 },
    { name: 'Pending', value: 9 },
    { name: 'Changes', value: 5 },
  ],
  examStatus: [
    { name: 'Approved', value: 6 },
    { name: 'Draft', value: 2 },
    { name: 'Pending', value: 1 },
  ],
  gradingBreakdown: [
    { name: 'Pending', value: 5 },
    { name: 'Graded', value: 28 },
    { name: 'Returned', value: 21 },
  ],
  examOutcomesLatest: [
    { name: 'Passed', value: 42 },
    { name: 'Failed', value: 13 },
    { name: 'In Review', value: 6 },
  ]
};

// Department content approval courses/modules (mirrors ApproveContent dummy)
export const mockDepartmentContentCourses = [
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

// Department exam approvals shared list (mirrors ApproveExams / CourseExamApproval)
export const mockDepartmentApprovalExams = mockApprovalExams.map(e => ({
  // augment with courseId for CourseExamApproval filtering
  ...e,
  courseId: e.course.toLowerCase().includes('software') ? 'c-se' : 'c-algo'
}));

// (TODO) Remaining mocks: student courses/learning, admin courses/departments, short training.
