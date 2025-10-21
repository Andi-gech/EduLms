import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { TeacherAssignmentRow } from '@/types/domain';
import { useTeacherAssignments, useDeleteAssignmentMutation } from '@/hooks/useApiData';

export default function AssignmentsManage() {
  const [assignments, setAssignments] = useState<TeacherAssignmentRow[]>([]);
  const { data: liveAssignments, isLoading } = useTeacherAssignments();
  const navigate = useNavigate();
  useEffect(() => {
    if (liveAssignments) setAssignments(liveAssignments as any);
  }, [liveAssignments]);

  const fmt = (d: string) => new Date(d).toLocaleString();

  const deleteMutation = useDeleteAssignmentMutation();
  const remove = (id: string) => {
    if (!confirm('Delete assignment?')) return;
    const prev = assignments;
    setAssignments(prev.filter(a => a._id !== id));
    deleteMutation.mutate({ id }, {
      onError: (err: any) => {
        alert(err.message || 'Failed to delete');
        setAssignments(prev); // rollback
      },
      onSuccess: () => {
        // refetch handled by mutation invalidation; keep optimistic list
      }
    });
  };

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Assignments</h1>
            <p className="text-muted-foreground">Create, edit and grade student submissions</p>
          </div>
          <Button size="sm" onClick={() => navigate('/teacher/assignments/new')}><Plus className="w-4 h-4 mr-1"/> New Assignment</Button>
        </div>
  <Card>
          <CardHeader>
            <CardTitle>Assignments</CardTitle>
            <CardDescription>Overview of your assignments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left">Title</th>
                    <th className="p-2 text-left">Due</th>
                    <th className="p-2 text-left">Points</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Submissions</th>
                    <th className="p-2 text-left">Graded</th>
                    <th className="p-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">Loading...</td></tr>
                  )}
                  {assignments.map(a => (
                    <tr key={a._id} className="border-t">
                      <td className="p-2 font-medium">{a.title}</td>
                      <td className="p-2">{fmt(a.dueDate)}</td>
                      <td className="p-2">{a.points}</td>
                      <td className="p-2">{a.status === 'pending' ? <Badge variant="secondary" className="bg-blue-500/90 text-white border-blue-500">Pending</Badge> : <Badge variant="secondary" className="bg-red-500/90 text-white border-red-500">Overdue</Badge>}</td>
                      <td className="p-2">{a.submissions}</td>
                      <td className="p-2">{a.gradedSubmissions}</td>
                      <td className="p-2 flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/teacher/assignments/${a._id}/edit`)}><Pencil className="w-4 h-4"/></Button>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/teacher/assignments/${a._id}/submissions`)}>Grade</Button>
                        <Button size="sm" variant="destructive" onClick={() => remove(a._id)}><Trash2 className="w-4 h-4"/></Button>
                      </td>
                    </tr>
                  ))}
                  {!isLoading && assignments.length === 0 && (
                    <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">No assignments</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
