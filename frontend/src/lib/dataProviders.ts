// Unified data provider layer: serves mock data when VITE_USE_MOCKS is truthy,
// otherwise delegates to real API client endpoints. Keeps components DRY.

import { apiClient } from './apiClient';
import { mockStudentAssignments, mockCourseGrades } from '@/mocks';
import type { UIAssignment, CourseGradeData } from '@/types/domain';

const useMocks = !!(import.meta as any).env?.VITE_USE_MOCKS;

// Assignments (student)
export async function fetchStudentAssignments(): Promise<UIAssignment[]> {
  if (useMocks) return mockStudentAssignments;
  // TODO: replace with actual endpoint call (e.g., await apiClient.listAssignments(...))
  try {
    const res = await apiClient.listAssignments();
    // Map backend AssignmentDoc -> UIAssignment minimal projection.
    return res.map(a => ({
      id: a._id,
      course: a.course, // consider mapping id -> course code/name via separate lookup if needed
      title: a.title,
      points: a.points,
      dueDate: a.dueDate,
      status: 'pending', // derive from submission state when API exposes it
      description: a.description,
    }));
  } catch {
    return [];
  }
}

// Course grade transcript
export async function fetchCourseGrades(): Promise<CourseGradeData[]> {
  if (useMocks) return mockCourseGrades;
  // TODO: implement when backend provides grade aggregation endpoint
  return [];
}
