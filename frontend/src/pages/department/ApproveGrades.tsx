import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, ArrowLeft, GraduationCap } from 'lucide-react';
// removed unused StudentGrade type import
import { useResultApprovals, useApproveResultMutation } from '@/hooks/useApiData';

function letterGrade(pct: number) {
  if (pct >= 90) return 'A';
  if (pct >= 80) return 'B';
  if (pct >= 70) return 'C';
  if (pct >= 60) return 'D';
  if (pct >= 50) return 'E';
  return 'F';
}

const PASS_THRESHOLD_PCT = 50; // >= 50% considered pass

export default function ApproveGrades() {
  const { courseId } = useParams<{courseId:string}>();
  const navigate = useNavigate();
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const { data: resultApprovals = [], refetch, isLoading, error } = useResultApprovals({ course: courseId, approved: 'false' });
  const approveMutation = useApproveResultMutation();

  const students = useMemo(() => resultApprovals.map((r: any) => {
    const total = typeof r.totalMarks === 'number' && r.totalMarks > 0 ? r.totalMarks : 100;
    const marks = typeof r.marks === 'number' ? r.marks : 0;
    const pct = total ? (marks / total) * 100 : 0;
    return {
      _id: r._id,
      name: r.user?.name || r.user?.fullName || 'Unknown',
      marks,
      total,
      percent: pct,
      approved: !!r.approved,
    };
  }), [resultApprovals]);

  const enriched = useMemo(() => students.map(s => ({ ...s, grade: letterGrade(s.percent), pass: s.percent >= PASS_THRESHOLD_PCT })), [students]);
  const stats = useMemo(() => {
    const total = enriched.length || 0;
    const passCount = enriched.filter(s => s.pass).length;
    const failCount = total - passCount;
    const passPct = total ? (passCount / total) * 100 : 0;
    const failPct = total ? (failCount / total) * 100 : 0;
    return { total, passCount, failCount, passPct, failPct };
  }, [enriched]);

  const allApproved = students.length > 0 && students.every(s => s.approved);

  const approveAll = async () => {
    for (const s of students.filter(s=>!s.approved)) {
      setApprovingId(s._id);
   
      await approveMutation.mutateAsync({
        id:s._id
      }).catch(()=>{});
    }
    setApprovingId(null);
    refetch();
  };

  return (
    <div className="h-screen overflow-y-auto p-4 flex flex-col gap-4">
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-[220px]">
          <Button variant="ghost" size="sm" onClick={()=> navigate(-1)} className="-ml-2 px-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div>
            <h1 className="text-base font-semibold flex items-center gap-2"><GraduationCap className="w-4 h-4" /> Approve Grades</h1>
            <p className="text-xs text-muted-foreground">Course ID: <span className="font-mono text-[11px]">{courseId}</span></p>
          </div>
        </div>
        <div className="flex gap-3 text-xs flex-wrap">
          <div className="px-3 py-2 rounded-md border bg-background/60 flex flex-col min-w-[90px]">
            <span className="text-[10px] uppercase text-muted-foreground">Students</span>
            <span className="text-sm font-semibold">{stats.total}</span>
          </div>
          <div className="px-3 py-2 rounded-md border bg-background/60 flex flex-col min-w-[90px]">
            <span className="text-[10px] uppercase text-muted-foreground flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Pass</span>
            <span className="text-sm font-semibold text-emerald-600">{stats.passCount} <span className="text-[10px] text-muted-foreground">({stats.passPct.toFixed(0)}%)</span></span>
          </div>
            <div className="px-3 py-2 rounded-md border bg-background/60 flex flex-col min-w-[90px]">
            <span className="text-[10px] uppercase text-muted-foreground flex items-center gap-1"><XCircle className="w-3 h-3" /> Fail</span>
            <span className="text-sm font-semibold text-red-600">{stats.failCount} <span className="text-[10px] text-muted-foreground">({stats.failPct.toFixed(0)}%)</span></span>
          </div>
        </div>
      </div>

      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Student Grades</CardTitle>
          <CardDescription className="text-[11px]">Review and approve official grades.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto">
          {isLoading && <div className="p-4 text-xs text-muted-foreground">Loading pending results...</div>}
          {error && !isLoading && <div className="p-4 text-xs text-red-600">Failed to load results.</div>}
          <div className="rounded-md border bg-gradient-to-b from-background to-muted/20">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-28 text-right">Mark</TableHead>
                  <TableHead className="w-24 text-right">Grade</TableHead>
                  <TableHead className="w-24 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!isLoading && enriched.map((s,i)=>{
                  const gradeColor = {
                    A:'text-emerald-600',
                    B:'text-emerald-600',
                    C:'text-blue-600',
                    D:'text-amber-600',
                    E:'text-orange-600',
                    F:'text-red-600'
                  }[s.grade] || 'text-foreground';
                  return (
                    <TableRow key={s._id} className="hover:bg-muted/40">
                      <TableCell className="text-xs">{i+1}</TableCell>
                      <TableCell className="text-xs font-medium">{s.name}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{s.marks}<span className="text-muted-foreground">/{s.total}</span> <span className="text-[10px] text-muted-foreground">({Math.round(s.percent)}%)</span></TableCell>
                      <TableCell className={`text-xs text-right font-semibold ${gradeColor}`}>{s.grade}</TableCell>
                      <TableCell className="text-xs text-right flex items-center gap-2 justify-end">
                        {s.pass ? <span className="text-emerald-600 font-medium">Pass</span> : <span className="text-red-600 font-medium">Fail</span>}
                        {!s.approved && <Button variant="outline" size="sm" disabled={approvingId===s._id} onClick={async ()=> {  
                          console.log(s._id,"ss")
                          setApprovingId(s._id); 
                          await approveMutation.mutateAsync({
                            id:s._id
                          }).catch(()=>{});
                           setApprovingId(null);
                            refetch(); }} className="h-6 px-2 text-[10px]">{approvingId===s._id?'...':'Approve'}</Button>}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!isLoading && enriched.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-xs text-muted-foreground">No student grades found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-0 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t pt-3 pb-4 flex justify-between items-center px-1">
        <p className="text-[11px] text-muted-foreground">{allApproved ? 'All grades approved.' : 'Approve grades to finalize.'}</p>
  <Button disabled={allApproved || approvingId!==null || isLoading || enriched.length===0} onClick={approveAll}>{allApproved ? 'All Approved' : 'Approve All'}</Button>
      </div>
    </div>
  );
}
