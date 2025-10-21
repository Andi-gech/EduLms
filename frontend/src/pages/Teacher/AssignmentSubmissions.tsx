import { useParams, useNavigate } from 'react-router';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check } from 'lucide-react';
import type { AssignmentSubmissionRowUI as SubmissionRow } from '@/types/domain';
import { useAssignmentSubmissions, useGradeAssignmentSubmissionMutation } from '@/hooks/useApiData';

export default function AssignmentSubmissions() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [subs, setSubs] = useState<SubmissionRow[]>([]);
  const [grading, setGrading] = useState<Record<string, number | undefined>>({});
  const { data: liveSubs, isLoading, error } = useAssignmentSubmissions(id);
  const gradeMutation = useGradeAssignmentSubmissionMutation();
  useEffect(() => { if (liveSubs) setSubs(liveSubs as any); }, [liveSubs]);

  const applyGrade = (sid: string, studentId: string) => {
    const g = grading[sid];
    if (g == null || isNaN(g) || !id) return;
    gradeMutation.mutate({ assignmentId: id, studentId, grade: g }, {
      onSuccess: () => {
        setSubs(prev => prev.map(s => s._id === sid ? { ...s, grade: g } : s));
      }
    });
  };

  return (
    <div className='min-h-screen px-4 py-8'>
      <div className='max-w-5xl mx-auto space-y-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>Submissions</h1>
            <p className='text-muted-foreground'>Assignment ID: {id}</p>
          </div>
          <Button variant='outline' onClick={() => navigate(-1)}><ArrowLeft className='w-4 h-4 mr-1'/> Back</Button>
        </div>
  <Card>
          <CardHeader>
            <CardTitle>Student Submissions</CardTitle>
            <CardDescription>Grade and review submissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='overflow-x-auto'>
              <table className='w-full text-sm border'>
                <thead className='bg-muted'>
                  <tr>
                    <th className='p-2 text-left'>Student</th>
                    <th className='p-2 text-left'>Submitted</th>
                    <th className='p-2 text-left'>File</th>
                    <th className='p-2 text-left'>Grade</th>
                    <th className='p-2 text-left'>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && <tr><td colSpan={5} className='p-4 text-center text-muted-foreground'>Loading...</td></tr>}
                  {error && !isLoading && <tr><td colSpan={5} className='p-4 text-center text-red-600'>Failed to load submissions</td></tr>}
                  {subs.map(s => (
                    <tr key={s._id} className='border-t'>
                      <td className='p-2 font-medium'>{s.student.firstName} {s.student.lastName}<div className='text-xs text-muted-foreground'>{s.student.email}</div></td>
                      <td className='p-2'>{new Date(s.submittedAt).toLocaleString()}</td>
                      <td className='p-2'><a className='text-indigo-600 underline' href={`/${s.filePath}`} target='_blank' rel='noreferrer'>Download</a></td>
                      <td className='p-2'>
                        {s.grade != null ? (
                          <Badge variant='secondary' className='bg-green-500/90 text-white border-green-500'>{s.grade}</Badge>
                        ) : (
                          <Input
                            type='number'
                            placeholder='Grade'
                            className='h-8 w-20'
                            onChange={e => setGrading(prev => ({ ...prev, [s._id]: Number(e.target.value) }))}
                          />
                        )}
                      </td>
                      <td className='p-2 flex flex-wrap gap-2 items-center'>
                        {s.grade == null && (
                          <Button size='sm' variant='outline' onClick={() => applyGrade(s._id, (s as any).student?._id || 'student')} disabled={gradeMutation.isPending}>
                            <Check className='w-4 h-4'/>
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!isLoading && subs.length === 0 && !error && <tr><td className='p-4 text-center text-muted-foreground' colSpan={5}>No submissions yet</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
