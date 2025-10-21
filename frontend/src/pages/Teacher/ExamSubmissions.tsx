import React, { useState, useMemo } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '../../components/ui/table';
import { Input } from '../../components/ui/input';
import { useNavigate, useParams } from 'react-router';
import type { ExamSubmissionStatus } from '@/types/domain';
import { useExamSubmissions, useGradeExamSubmissionMutation } from '@/hooks/useApiData';

const statusColor: Record<ExamSubmissionStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  'in-progress': 'bg-blue-100 text-blue-800',
  graded: 'bg-green-100 text-green-800'
};

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const ExamSubmissions: React.FC = () => {
  const navigate = useNavigate();
  const { examId } = useParams();
  const { data: submissionsRaw, isLoading } = useExamSubmissions(examId);
  const gradeMutation = useGradeExamSubmissionMutation(examId!);
  const [examFilter, setExamFilter] = useState('');
  const [studentFilter, setStudentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<ExamSubmissionStatus | ''>('');

  type Row = {
    id: string;
    examId: string;
    examTitle: string;
    studentId: string;
    studentName: string;
    submittedAt: string;
    autoScore: number;
    totalMarks: number;
    teacherScore?: number;
    status: ExamSubmissionStatus;
  };

  const submissions: Row[] = useMemo(() => {
    if (!submissionsRaw) return [];
    return submissionsRaw.map(s => ({
      id: s._id,
      examId: examId!,
      examTitle: s.examTitle || 'Exam',
      studentId: s.user && s.user._id ? s.user._id : 'unknown',
      studentName: s.user && (s.user.name || s.user.fullName) ? (s.user.name || s.user.fullName) : 'Unknown',
      submittedAt: s.createdAt || new Date().toISOString(),
      autoScore: s.autoScore || 0,
      totalMarks: s.totalMarks || 0,
      teacherScore: s.manualScore,
      status: (s.status as ExamSubmissionStatus) || 'pending',
    }));
  }, [submissionsRaw, examId]);

  const filtered = useMemo(() => {
    return submissions
      .filter(s => !examId || s.examId === examId)
      .filter(s => (!examFilter || s.examTitle.toLowerCase().includes(examFilter.toLowerCase())))
      .filter(s => (!studentFilter || s.studentName.toLowerCase().includes(studentFilter.toLowerCase())))
      .filter(s => (!statusFilter || s.status === statusFilter));
  }, [submissions, examId, examFilter, studentFilter, statusFilter]);

  const startEvaluate = (row: Row) => {
    // Navigate to evaluation page with exam + student identifiers
    navigate(`/teacher/exam/evaluate/${row.examId}?student=${row.studentId}&submission=${row.id}`);
  };

  const quickMarkAsGraded = (row: Row) => {
    if (!examId) return;
    const manualScore = row.teacherScore != null ? row.teacherScore : 0;
    gradeMutation.mutate({ submissionId: row.id, manualScore });
  };

  const currentExamTitle = submissions.find(s => s.examId === examId)?.examTitle;

  return (
    <div className="p-4 space-y-4 w-full overflow-hidden">
      <div className="flex flex-wrap gap-2 items-end">
        {!examId && (
          <div>
            <label className="block text-sm font-medium mb-1">Exam</label>
            <Input placeholder="Filter exam" value={examFilter} onChange={e => setExamFilter(e.target.value)} />
          </div>
        )}
        {examId && (
          <div className="text-sm font-medium">Exam: <span className="font-semibold">{currentExamTitle || examId}</span></div>
        )}
        <div>
          <label className="block text-sm font-medium mb-1">Student</label>
            <Input placeholder="Filter student" value={studentFilter} onChange={e => setStudentFilter(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select className="border rounded px-2 py-2 text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="graded">Graded</option>
          </select>
        </div>
        <div className="ml-auto text-sm text-muted-foreground">Total: {filtered.length}</div>
      </div>
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted/40">
        <Table className="min-w-[980px]">
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">Exam</TableHead>
              <TableHead className="font-semibold">Student</TableHead>
              <TableHead className="font-semibold">Submitted</TableHead>
              <TableHead className="font-semibold">Auto Score</TableHead>
              <TableHead className="font-semibold">Teacher Score</TableHead>
              <TableHead className="font-semibold">Total %</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6 text-sm text-muted-foreground">Loading submissions...</TableCell>
              </TableRow>
            )}
            {!isLoading && filtered.map(row => {
              const teacher = row.teacherScore ?? 0;
              const totalEarned = Math.min(row.autoScore + teacher, row.totalMarks);
              const percent = ((totalEarned / row.totalMarks) * 100).toFixed(1);
              return (
                <TableRow key={row.id} className="hover:bg-muted/40">
                  <TableCell>{row.examTitle}</TableCell>
                  <TableCell>{row.studentName}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{formatTime(row.submittedAt)}</TableCell>
                  <TableCell>{row.autoScore}</TableCell>
                  <TableCell>{row.teacherScore ?? '-'}</TableCell>
                  <TableCell>{percent}%</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${statusColor[row.status as ExamSubmissionStatus]}`}>{row.status}</span>
                  </TableCell>
                  <TableCell className="space-x-1 whitespace-nowrap">
                    <Button size="sm" variant="outline" onClick={() => startEvaluate(row)}>Evaluate</Button>
                    {row.status !== 'graded' && (
                      <Button size="sm" variant="ghost" disabled={gradeMutation.isPending} onClick={() => quickMarkAsGraded(row)}>{gradeMutation.isPending ? 'Saving...' : 'Mark Graded'}</Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6 text-sm text-muted-foreground">No submissions match filters.</TableCell>
              </TableRow>
            )}
          </TableBody>
  </Table>
  </div>
      </Card>
      <div className="text-xs text-muted-foreground">
        {examId ? 'Filtered to single exam. ' : ''}Dummy data. Evaluation navigates to weighted grading UI.
      </div>
    </div>
  );
};

export default ExamSubmissions;
