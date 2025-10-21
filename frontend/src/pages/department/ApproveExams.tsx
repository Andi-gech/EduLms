import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams } from 'react-router';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { CheckCircle2, XCircle, Search, Filter, ListChecks, ClipboardList, Loader2 } from 'lucide-react';
import type { ApprovalExamItem as ExamItem, ApprovalExamStatus } from '@/types/domain';
import { useExamApprovals } from '@/hooks/useApiData';
import { apiClient } from '@/lib/apiClient';

export default function ApproveExams() {
  const { courseId: routeCourseId } = useParams();
  const [filter, setFilter] = useState('');
  const [course, setCourse] = useState(() => routeCourseId || 'all');
  const [status, setStatus] = useState<'all' | ApprovalExamStatus>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  console.log('routeCourseId', routeCourseId, 'course', course);
  // Fetch exams filtered server-side by course (route param takes precedence) and current status
  const activeCourseFilter = routeCourseId || (course === 'all' ? undefined : course);
  const { data: approvalsData, refetch } = useExamApprovals(status, activeCourseFilter);
  const [localExams, setLocalExams] = useState<ExamItem[]>([]);
  // Sync course filter if route param changes
  useEffect(() => {
    if (routeCourseId && routeCourseId !== course) setCourse(routeCourseId);
  }, [routeCourseId]);

  // Keep local copy (for optimistic status updates) when list changes
  useEffect(() => { if (approvalsData) setLocalExams(approvalsData as any); }, [approvalsData]);
  // Normalize course id field across backend variants (course or courseId)
  const normalized = useMemo(() => localExams.map((e: any) => ({
    ...e,
    __courseId: e.courseId || e.course || (e.CourseModule && (e.CourseModule.courseId || e.CourseModule.course)) || 'unknown'
  })), [localExams]);

  const courses = useMemo(() => Array.from(new Set(normalized.map(e => e.__courseId))).filter(c => c && c !== 'unknown'), [normalized]);

  const filtered = useMemo(() => normalized.filter(e =>
    (!filter || e.title.toLowerCase().includes(filter.toLowerCase())) &&
    (course === 'all' || e.__courseId === course) &&
    (status === 'all' || (e.status as any) === status)
  ), [filter, course, status, normalized]);
  const selected = useMemo(()=> filtered.find(e=> e.id===selectedId || (e as any)._id===selectedId) || filtered[0] || null, [filtered, selectedId]);
  const counts = useMemo(()=> ({
    pending: localExams.filter(e=> (e.status as any)==='pending').length,
    approved: localExams.filter(e=> (e.status as any)==='approved').length,
    rejected: localExams.filter(e=> (e.status as any)==='rejected').length
  }), [localExams]);
  const updateStatus = useCallback(async (id: string, newStatus: 'approved' | 'rejected') => {
    setWorking(id);
    try {
      if (newStatus === 'approved') await apiClient.approveExam(id);
      else await apiClient.rejectExam(id);
      setLocalExams(prev => prev.map(e => (e.id===id || (e as any)._id===id) ? { ...e, status: newStatus } : e));
    } finally { setWorking(null); refetch(); }
  }, [refetch]);

  // Load full exam detail (questions) on selection if not already loaded
  useEffect(() => {
    const loadDetail = async () => {
      const id = selectedId;
      if (!id) return;
      // If already has questions array with objects having 'text', skip
      const existing = localExams.find(e => (e as any)._id === id || (e as any).id === id) as any;
      if (existing && existing.questions && existing.questions.length && existing.questions[0].text) return;
      try {
        setLoadingQuestions(true);
        setQuestionsError(null);
        const detail: any = await apiClient.getExam(id);
        // Transform question structure to UI shape
        const transformedQuestions = (detail.questions || []).map((q: any) => {
          const isMCQ = q.type === 'multiple_choice';
          const options = isMCQ && Array.isArray(q.answers)
            ? q.answers.map((a: any, idx: number) => ({ id: a._id, label: String.fromCharCode(65 + idx), text: a.answer, isCorrect: !!a.isCorrect }))
            : undefined;
          const correctObj = isMCQ ? q.answers.find((a: any) => a.isCorrect) : null;
          const correct = isMCQ ? (correctObj ? correctObj._id : '') : (q.blankAnswer || q.answer || '');
          return {
            id: q._id,
            text: q.question,
            type: isMCQ ? 'mcq' : 'short',
            options,
            answer: correct,
          };
        });
        setLocalExams(prev => prev.map(e => {
          const eid = (e as any)._id || (e as any).id;
          if (eid !== id) return e;
          return { ...e, questions: transformedQuestions, totalQuestions: transformedQuestions.length } as any;
        }));
      } catch (err) {
        setQuestionsError('Failed to load questions');
      } finally {
        setLoadingQuestions(false);
      }
    };
    loadDetail();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return (
    <div className="flex flex-col h-screen">
      <div className="p-4 md:p-5 border-b border-muted/40 bg-gradient-to-r from-background to-muted/30 flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Filter Title</label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={filter} onChange={e=> setFilter(e.target.value)} placeholder="Search exams..." className="pl-8 w-56" />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Course</label>
          <select value={course} onChange={e=> { setCourse(e.target.value); setSelectedId(null); }} className="h-9 px-3 rounded-md border bg-background text-sm min-w-48">
            <option value="all">All</option>
            {courses.map(c=> <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Status</label>
          <div className="relative">
            <Filter className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <select value={status} onChange={e=> { setStatus(e.target.value as any); setSelectedId(null); }} className="pl-8 h-9 px-3 rounded-md border bg-background text-sm min-w-40">
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
        <div className="ml-auto flex gap-6 text-xs">
          <span className="flex flex-col"><span className="text-[10px] text-muted-foreground uppercase">Pending</span>{counts.pending}</span>
          <span className="flex flex-col"><span className="text-[10px] text-muted-foreground uppercase">Approved</span>{counts.approved}</span>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        {/* List */}
        <div className="w-80 border-r border-muted/40 bg-gradient-to-b from-background to-muted/20 overflow-y-auto p-3 space-y-2">
          {filtered.map((exam: any) => {
            const examId = exam.id || exam._id;
            const active = selected ? (selected as any).id === examId || (selected as any)._id === examId : false;
            return (
              <button key={examId} onClick={()=> setSelectedId(examId)} className={`w-full text-left rounded-md border px-3 py-2 text-xs flex flex-col gap-1 transition ${active ? 'border-primary bg-primary/10' : 'border-muted/40 hover:bg-muted/40'}`}>
                <span className="font-semibold truncate flex items-center gap-2">
                  <ClipboardList className="w-3 h-3 text-primary" /> {exam.title}
                  <Badge variant={exam.status==='approved' ? 'default' : exam.status==='rejected' ? 'destructive' : 'secondary'} className="capitalize text-[9px] h-4 px-1 ml-auto">{exam.status}</Badge>
                </span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-2">
                  <span>{exam.__courseId || '—'}</span>
      <span>{exam.totalQuestions ?? (exam.questions?.length || 0)} Q</span>
                  <span>{exam.durationMin ?? exam.examDuration} min</span>
                </span>
              </button>
            )
          })}
          {filtered.length === 0 && <div className="text-[11px] text-muted-foreground p-4 border rounded-md">No exams found.</div>}
        </div>
        {/* Detail */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {!selected && filtered.length === 0 && <div className="border rounded-md p-10 text-center text-sm text-muted-foreground">No exams match filters.</div>}
          {selected && (
            <div className="max-w-5xl mx-auto space-y-6">
              <Card className="border-muted/40 bg-gradient-to-br from-background to-muted/30">
                <div className="p-4 border-b border-muted/40 flex flex-wrap gap-3 items-start">
                  <div className="p-2 rounded-md bg-primary/10"><ListChecks className="w-5 h-5 text-primary" /></div>
                  <div className="flex-1 min-w-[240px]">
                    <h1 className="text-lg font-semibold leading-tight flex items-center gap-2">{(selected as any).title}
                      <Badge variant={(selected as any).status==='approved' ? 'default' : (selected as any).status==='rejected' ? 'destructive' : 'secondary'} className="capitalize text-[10px] h-5 px-2">{(selected as any).status}</Badge>
                    </h1>
                    <p className="text-[11px] text-muted-foreground mt-1">Course: {(selected as any).__courseId || (selected as any).course || (selected as any).courseId || '—'} • Duration {(selected as any).durationMin ?? (selected as any).examDuration} min • {((selected as any).totalQuestions ?? (selected as any).questions?.length) || 0} questions • By {(selected as any).createdBy}</p>
                  </div>
                  <div className="flex gap-2 ml-auto text-[10px]">
                    <Button variant="outline" size="sm" disabled={working===((selected as any).id || (selected as any)._id) || (selected as any).status==='approved'} onClick={()=> updateStatus(((selected as any).id || (selected as any)._id),'approved')} className="h-8 px-3 text-xs">
                      {working===((selected as any).id || (selected as any)._id) ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                      {(selected as any).status==='approved' ? 'Approved' : 'Approve'}
                    </Button>
                    <Button variant="outline" size="sm" disabled={working===((selected as any).id || (selected as any)._id) || (selected as any).status==='rejected'} onClick={()=> updateStatus(((selected as any).id || (selected as any)._id),'rejected')} className="h-8 px-3 text-xs">
                      {working===((selected as any).id || (selected as any)._id) ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3 mr-1" />}
                      {(selected as any).status==='rejected' ? 'Rejected' : 'Reject'}
                    </Button>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Questions</h2>
                  {loadingQuestions && !(selected as any).questions?.length && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading questions...</div>
                  )}
                  {questionsError && <div className="text-[11px] text-destructive">{questionsError}</div>}
                  <ul className="space-y-3">
                    {(selected as any).questions?.map((q: any,i: number) => (
                      <li key={q.id} className="rounded-md border border-muted/30 p-3 text-xs bg-gradient-to-br from-background to-muted/20">
                        <div className="flex items-start gap-2">
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{i+1}</span>
                          <div className="flex-1 space-y-1">
                            <p className="font-medium leading-snug">{q.text}</p>
                            {q.type==='mcq' && (
                              <div className="grid grid-cols-2 gap-1 mt-1">
                                {q.options?.map((o: any) => (
                                  <span key={o.id} className={`text-[11px] px-2 py-1 rounded border flex items-center gap-1 ${o.isCorrect ? 'border-green-500 bg-green-500/10 text-green-600 font-medium' : 'border-muted/40 text-muted-foreground'}`}>
                                    <span className="font-semibold">{o.label}</span> {o.text}
                                    {o.isCorrect && <span className="ml-auto text-[10px] uppercase tracking-wide">Correct</span>}
                                  </span>
                                ))}
                              </div>
                            )}
                            {q.type==='short' && (
                              <div className="text-[11px] text-muted-foreground italic">Answer: <span className="font-medium not-italic text-foreground">{q.answer || '—'}</span></div>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                    {!(selected as any).questions?.length && !loadingQuestions && !questionsError && (
                      <li className="text-[11px] text-muted-foreground italic">No questions loaded.</li>
                    )}
                  </ul>
                </div>
              </Card>
              <div className="text-[10px] text-muted-foreground">Live data from /exams/approvals. Actions call approve/reject endpoints.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
