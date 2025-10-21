import type { UserDoc } from '@/types/domain';

// Core demo user set shared across admin & other mock-consuming pages.
// Extend with additional fields as backend provides.
export const mockUsers: (UserDoc & { active?: boolean })[] = [
  { _id: 'u1', fullName: 'Alice Johnson', email: 'alice@example.com', role: 'teacher', department: 'dep-001', status: true, rating: [], active: true },
  { _id: 'u2', fullName: 'Bob Smith', email: 'bob@example.com', role: 'student', department: 'dep-002', status: true, rating: [], active: true },
  { _id: 'u3', fullName: 'Charlie Kim', email: 'charlie@example.com', role: 'department_admin', department: 'dep-001', status: false, rating: [], active: false },
  { _id: 'u4', fullName: 'Dina Lopez', email: 'dina@example.com', role: 'Registrar', department: null, status: true, rating: [], active: true },
  { _id: 'u5', fullName: 'Evan Lee', email: 'evan@example.com', role: 'teacher', department: 'dep-003', status: true, rating: [], active: true },
];
