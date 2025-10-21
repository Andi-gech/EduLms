import type { DepartmentDoc } from '@/types/domain';

export const mockDepartments: DepartmentDoc[] = [
  { _id: 'd1', name: 'Computer Science', code: 'CS', description: 'CS Department', head: 'u-head-1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { _id: 'd2', name: 'Electrical Engineering', code: 'EE', description: 'EE Department', head: 'u-head-2', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { _id: 'd3', name: 'Mechanical Engineering', code: 'ME', description: 'ME Department', head: 'u-head-3', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];
