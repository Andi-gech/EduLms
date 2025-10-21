import { useMemo, useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, ListChecks, Loader2 } from 'lucide-react';
import { useExamApprovals, useApproveExamMutation, useRejectExamMutation } from '@/hooks/useApiData';

type MinimalExam = { _id: string; title: string; courseId?: string | null; course?: string | null; status: 'pending' | 'approved' | 'rejected'; durationMin?: number; examDuration?: number; totalQuestions?: number; questions?: any[]; createdBy?: string; createdAt?: string };

export default function CourseExamApproval() {
  const { courseId } = useParams();
  // Server-side filtering by course, fetching all statuses: GET /exams/approvals?status=all&course=...
  const { data: rawExams, isLoading, error, refetch } = useExamApprovals('all', courseId);
  const approveMut = useApproveExamMutation();
  const rejectMut = useRejectExamMutation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);

  // Exams already filtered by backend using course query param
  const courseExams: MinimalExam[] = useMemo(()=> (rawExams||[]) as MinimalExam[], [rawExams]);
  // Select first exam when data changes
  useEffect(()=> { if (courseExams.length && !selectedId) setSelectedId((courseExams[0] as any)._id || (courseExams[0] as any).id); }, [courseExams, selectedId]);
  const selected = useMemo(()=> courseExams.find(e=> (e as any)._id===selectedId || (e as any).id===selectedId) || null, [courseExams, selectedId]);
  const courseName = courseExams[0]?.course || '';

  const updateStatus = useCallback(async (id: string, newStatus: 'approved' | 'rejected') => {
    setWorking(id);
    try {
  if (newStatus==='approved') await approveMut.mutateAsync({ id });
  else await rejectMut.mutateAsync({ id });
      await refetch();
    } finally { setWorking(null); }
  }, [approveMut, rejectMut, refetch]);

  if(!courseId) return <div className="p-8 text-sm text-muted-foreground">No course specified.</div>;
  if(error) return <div className="p-8 text-sm text-red-600 space-y-2">
    <div className="font-semibold">Failed to load exams.</div>
    <div className="text-xs text-muted-foreground">{(error as any)?.message || 'Unknown error'}</div>
    {((error as any)?.status === 403) && <div className="text-[11px]">You need department_head or department_admin role to view exam approvals.</div>}
    <Button variant="outline" size="sm" onClick={()=> refetch()}>Retry</Button>
  </div>;

  return (
    <div className="flex flex-col h-screen">
      <div className="p-4 md:p-5 border-b border-muted/40 bg-gradient-to-r from-background to-muted/30 flex items-center gap-4">
        <div>
          <h1 className="text-lg font-semibold leading-tight">Approve Exams - {courseName}</h1>
          <p className="text-[11px] text-muted-foreground">All exam statuses for this course (pending, approved, rejected)</p>
        </div>
        <div className="ml-auto flex gap-4 text-xs">
          <span className="flex flex-col"><span className="text-[10px] text-muted-foreground uppercase">Total</span>{courseExams.length}</span>
          <span className="flex flex-col"><span className="text-[10px] text-muted-foreground uppercase">Pending</span>{courseExams.filter(e=> e.status==='pending').length}</span>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 border-r border-muted/40 bg-gradient-to-b from-background to-muted/20 overflow-y-auto p-3 space-y-2">
          {isLoading && <div className="text-[11px] text-muted-foreground p-4 flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Loading…</div>}
          {!isLoading && courseExams.map((exam: any) => {
            const eid = exam._id || exam.id;
            const active = selected ? ((selected as any)._id === eid || (selected as any).id === eid) : false;
            return (
              <button key={eid} onClick={()=> setSelectedId(eid)} className={`w-full text-left rounded-md border px-3 py-2 text-xs flex flex-col gap-1 transition ${active ? 'border-primary bg-primary/10' : 'border-muted/40 hover:bg-muted/40'}`}>
                <span className="font-semibold truncate flex items-center gap-2">
                  <ListChecks className="w-3 h-3 text-primary" /> {exam.title}
                  <Badge variant={exam.status==='approved' ? 'default' : exam.status==='rejected' ? 'destructive' : 'secondary'} className="capitalize text-[9px] h-4 px-1 ml-auto">{exam.status}</Badge>
                </span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-2">
                  <span>{exam.totalQuestions ?? (exam.questions?.length || 0)} Q</span>
                  <span>{exam.durationMin ?? exam.examDuration} min</span>
                </span>
              </button>
            )
          })}
          {courseExams.length === 0 && !isLoading && <div className="text-[11px] text-muted-foreground p-4 border rounded-md space-y-1">
            <div>No exams for this course.</div>
            <div className="text-[10px]">If you recently created an exam make sure it was linked to a module (CourseModule) that belongs to this course. Exams without a module cannot be matched by course filter.</div>
          </div>}
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {!selected && courseExams.length === 0 && <div className="border rounded-md p-10 text-center text-sm text-muted-foreground space-y-2">
            <div>No exams for this course.</div>
            <div className="text-[11px]">Hint: Ensure each exam has CourseModule set and that module belongs to this course.</div>
          </div>}
          {selected && (
            <div className="max-w-4xl mx-auto space-y-6">
              <Card className="border-muted/40 bg-gradient-to-br from-background to-muted/30">
                <div className="p-4 border-b border-muted/40 flex flex-wrap gap-3 items-start">
                  <div className="p-2 rounded-md bg-primary/10"><ListChecks className="w-5 h-5 text-primary" /></div>
                  <div className="flex-1 min-w-[240px]">
                    <h2 className="text-base font-semibold leading-tight flex items-center gap-2">{(selected as any).title}
                      <Badge variant={(selected as any).status==='approved' ? 'default' : (selected as any).status==='rejected' ? 'destructive' : 'secondary'} className="capitalize text-[10px] h-5 px-2">{(selected as any).status}</Badge>
                    </h2>
                    <p className="text-[11px] text-muted-foreground mt-1">Duration {(selected as any).durationMin ?? (selected as any).examDuration} min • {((selected as any).totalQuestions ?? (selected as any).questions?.length) || 0} questions • By {(selected as any).createdBy.fullName}</p>
                  </div>
                  <div className="flex gap-2 ml-auto text-[10px]">
                    <Button variant="outline" size="sm" disabled={working===((selected as any)._id || (selected as any).id) || (selected as any).status==='approved'} onClick={()=> updateStatus(((selected as any)._id || (selected as any).id),'approved')} className="h-8 px-3 text-xs">
                      {working===((selected as any)._id || (selected as any).id) ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                      {(selected as any).status==='approved' ? 'Approved' : 'Approve'}
                    </Button>
                    <Button variant="outline" size="sm" disabled={working===((selected as any)._id || (selected as any).id) || (selected as any).status==='rejected'} onClick={()=> updateStatus(((selected as any)._id || (selected as any).id),'rejected')} className="h-8 px-3 text-xs">
                      {working===((selected as any)._id || (selected as any).id) ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3 mr-1" />}
                      {(selected as any).status==='rejected' ? 'Rejected' : 'Reject'}
                    </Button>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Questions</h3>
                  <ul className="space-y-3">
                    {(selected as any).questions?.map((q: any,i: number) => (
                      <li key={q._id || q.id || i} className="rounded-md border border-muted/30 p-3 text-xs bg-gradient-to-br from-background to-muted/20">
                        <div className="flex items-start gap-3">
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{i+1}</span>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <p className="font-medium leading-snug flex-1">{q.text || q.question}</p>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted/60 border">{q.mark} pts</span>
                            </div>
                            {['mcq','multiple_choice'].includes(q.type) && (
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-1 mt-1">
                                {(q.options || q.answers || []).map((o: any, idx: number) => {
                                  const oid = String.fromCharCode(65+idx);
                                  const text = o.text || o.answer;
                                  const isCorrect = o.isCorrect || ((oid === (q.answer || q.correctAnswer)));
                                  return (
                                    <span key={oid} className={`text-[11px] px-2 py-1 rounded border flex items-center gap-1 ${isCorrect ? 'border-green-500 bg-green-500/10 text-green-600' : 'border-muted/40 text-muted-foreground'}`}>
                                      <strong>{oid}.</strong> <span className="truncate">{text}</span>
                                      {isCorrect && <span className="ml-auto text-[9px] uppercase tracking-wide">Correct</span>}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                            {['short','blank'].includes(q.type) && (
                              <div className="text-[11px] text-muted-foreground italic">Answer: {q.answer || q.blankAnswer}</div>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
              <div className="text-[10px] text-muted-foreground">Live data from /exams/approvals (server-side filtered by course via query). Approve/Reject triggers backend mutations.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
