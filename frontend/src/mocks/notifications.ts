import type { NotificationDoc } from '@/types/domain';

// Using NotificationDoc shape (description, isRead, date, user, type)
export const mockNotifications: NotificationDoc[] = [
  { _id: 'n1', type: 'info', description: 'Midterm exams schedule released.', date: new Date(Date.now() - 3600_000).toISOString(), isRead: false, user: 'u1' },
  { _id: 'n2', type: 'warning', description: 'Project proposal due tomorrow.', date: new Date(Date.now() - 7200_000).toISOString(), isRead: false, user: 'u1' },
  { _id: 'n3', type: 'success', description: 'Your module "Design Patterns" was approved.', date: new Date(Date.now() - 5*3600_000).toISOString(), isRead: true, user: 'u1' },
  { _id: 'n4', type: 'info', description: 'You have been enrolled in Algorithms.', date: new Date(Date.now() - 26*3600_000).toISOString(), isRead: true, user: 'u1' },
];
