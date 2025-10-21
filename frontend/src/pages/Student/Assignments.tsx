import React, { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Eye } from 'lucide-react';
import type { AssignmentStatus } from '@/types/domain';
import { useAssignments } from '@/hooks/useApiData';

const statusColor: Record<AssignmentStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  graded: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
};

const Assignments: React.FC = () => {
  const navigate = useNavigate();
  const { data: backendAssignments, isLoading } = useAssignments();

  // Normalize backend assignments to UI rows (backend returns array with status pending/overdue only for generic list)
  const assignments = useMemo(() => {
    if (!backendAssignments) return [] as { id: string; title: string; course: string; dueDate: string; status: AssignmentStatus }[];
    return backendAssignments.map((a: any) => ({
      id: a._id,
      title: a.title,
      course: (a.course && a.course.name) || a.course || 'Course',
      dueDate: a.dueDate,
      status: (a.status) as AssignmentStatus,
    }));
  }, [backendAssignments]);

  return (
    <div className="min-h-screen px-2 py-4 md:px-4 md:py-8 transition-colors">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Assignments</h1>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">Manage and submit your course work</p>
          </div>
        </div>

        <Card className="border-none bg-background">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Current Assignments</CardTitle>
            <CardDescription className="text-sm md:text-base">Your active course assignments & status</CardDescription>
          </CardHeader>
          <CardContent className="pb-4 md:pb-6">
            {/* Mobile: cards, Desktop: table */}
            <div className="block md:hidden space-y-4">
              {isLoading && (
                <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
              )}
              {!isLoading && assignments.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">No assignments</div>
              )}
              {!isLoading && assignments.map(a => {
                const overdue = a.status === 'pending' && new Date(a.dueDate) < new Date()||a.status;
                return (
                  <Card key={a.id} className={`p-3 flex flex-col gap-2 shadow-sm ${overdue ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                    <div className="flex items-center gap-2 font-medium">
                      <FileText className="w-4 h-4 text-indigo-500" />
                      <span className="truncate max-w-[120px]">{a.title}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="font-semibold">Course:</span> <span className="truncate max-w-[80px]">{a.course}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span>Due:</span> <span className={overdue ? 'text-red-600 dark:text-red-400 font-medium' : ''}>{new Date(a.dueDate).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[a.status]}`}>{overdue ? 'Overdue' :  a.status}</span>
                      <Button size="sm" variant="ghost" className="gap-1" onClick={() => navigate(`/assignments/${a.id}`)}>
                        <Eye className="w-4 h-4" /> View
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <Table className="min-w-[600px] w-full">
                <TableCaption className="text-xs">Click view to open & submit</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">Title</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
                  )}
                  {!isLoading && assignments.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">No assignments</TableCell></TableRow>
                  )}
                  {assignments.map(a => {
                    const overdue = a.status === 'pending' && new Date(a.dueDate) < new Date();
                    return (
                      <TableRow key={a.id} className={overdue ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                        <TableCell className="font-medium flex items-center gap-2">
                          <FileText className="w-4 h-4 text-indigo-500" /> {a.title}
                        </TableCell>
                        <TableCell>{a.course}</TableCell>
                        <TableCell>
                          <span className={overdue ? 'text-red-600 dark:text-red-400 font-medium' : ''}>{new Date(a.dueDate).toLocaleString()}</span>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[a.status]}`}>{overdue ? 'Overdue' : a.status==="pending"?"Active":a.status.charAt(0).toUpperCase() + a.status.slice(1)}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" className="gap-1" onClick={() => navigate(`/assignments/${a.id}`)}>
                            <Eye className="w-4 h-4" /> View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Assignments;
