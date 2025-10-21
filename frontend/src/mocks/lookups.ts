// Centralized lookup / option lists to keep UI components DRY.
// Extend or replace with API-driven data later.

export interface Option { value: string; label: string }

export const ROLE_OPTIONS: Option[] = [
  { value: 'student', label: 'Student' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'Registrar', label: 'Registrar' },
  { value: 'department_head', label: 'Department Head' },
  { value: 'department_admin', label: 'Department Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'short_training_office', label: 'Short Training Office' },
];

export const STATUS_OPTIONS: Option[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export const QUESTION_TYPE_OPTIONS: Option[] = [
  { value: 'choice', label: 'Multiple Choice' },
  { value: 'short', label: 'Short Answer' },
];

// Departments used on the signup form (demo only – separate from mockDepartments academic list)
export const SIGNUP_DEPARTMENTS: Option[] = [
  { value: 'hr', label: 'HR' },
  { value: 'finance', label: 'Finance' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'sales', label: 'Sales' },
];

// Helper to render generic options in JSX: map list -> <SelectItem>
// (Left as data-only file; UI helpers can be added separately if needed.)
