import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useDepartments, useCourses, useUsers, useExam, useResultApprovals } from '@/hooks/useApiData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Types now come from backend domain models

export default function CourseGradeDetails() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  // Fetch backend data
  const { data: departments = [] } = useDepartments();
  const { data: courses = [] } = useCourses();
  const { data: students = [] } = useUsers();
  const { data: exams = [] } = useExam();
  const { data: reports = [], isLoading: reportsLoading } = useResultApprovals({ course: courseId, approved: 'true' });

  // Only show approved reports for this course
  const visible = useMemo(() => {
    return (reports || []).filter(r => r.approved && r.courseId === courseId);
  }, [reports, courseId]);

  type Course = {
    _id: string;
    name: string;
    department?: string;
    // add other fields as needed
  };

  const courseArray: Course[] = Array.isArray(courses) ? courses as Course[] : (courses?.docs ?? []);
  const course = courseArray.find((c: Course) => c._id === courseId);
  const dept = departments.find(d => d._id === (course?.department || ''));

  const kpis = useMemo(() => {
    const total = visible.length;
    const pass = visible.filter(r => r.ispassed).length;
    const passRate = total === 0 ? 0 : Math.round((pass / total) * 100);
    const avg = total === 0 ? 0 : Math.round(visible.reduce((s, r) => s + (r.marks / r.totalMarks) * 100, 0) / total);
    return { total, passRate, avg };
  }, [visible]);

  // Group reports by student and sum marks
  const studentTotals = useMemo(() => {
    const map = new Map<string, { student: any; marks: number; totalMarks: number; reports: any[]; passCount: number; lastApprovedAt?: string; lastApprovedBy?: string }>();
    visible.forEach(r => {
      const student = students.find(s => s._id === r.studentId || s._id === r.user);
      if (!student) return;
      const key = student._id;
      if (!map.has(key)) {
        map.set(key, {
          student,
          marks: 0,
          totalMarks: 0,
          reports: [],
          passCount: 0,
          lastApprovedAt: r.approvedAt,
          lastApprovedBy: r.approvedBy
        });
      }
      const entry = map.get(key)!;
      entry.marks += r.marks;
      entry.totalMarks += r.totalMarks;
      entry.reports.push(r);
      if (r.ispassed) entry.passCount++;
      // Use latest approvedAt
      if (!entry.lastApprovedAt || (r.approvedAt && new Date(r.approvedAt) > new Date(entry.lastApprovedAt))) {
        entry.lastApprovedAt = r.approvedAt;
        entry.lastApprovedBy = r.approvedBy;
      }
    });
    return Array.from(map.values());
  }, [visible, students]);

  const fmtDate = (iso?: string) => iso ? new Date(iso).toLocaleString() : '-';

  return (
    <div className="space-y-3 h-screen overflow-y-auto p-3 sm:p-4">
      <Card className="bg-transparent border-0">
        <CardHeader className="flex-row items-center justify-between py-2 px-2 sm:px-0">
          <div>
            <CardTitle>{course?.name || 'Course'}</CardTitle>
            <CardDescription>{dept?.name || 'Department'} • Approved grades</CardDescription>
          </div>
          <Button variant="secondary" onClick={() => navigate(-1)}>Back</Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
            <Card>
              <CardHeader className="py-1 px-3"><CardDescription>Approved Reports</CardDescription></CardHeader>
              <CardContent className="px-3 pb-3 pt-0 text-xl font-semibold">{kpis.total}</CardContent>
            </Card>
            <Card>
              <CardHeader className="py-1 px-3"><CardDescription>Pass Rate</CardDescription></CardHeader>
              <CardContent className="px-3 pb-3 pt-0 text-xl font-semibold">{kpis.passRate}%</CardContent>
            </Card>
            <Card>
              <CardHeader className="py-1 px-3"><CardDescription>Avg Score</CardDescription></CardHeader>
              <CardContent className="px-3 pb-3 pt-0 text-xl font-semibold">{kpis.avg}%</CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-base">Students and Grades</CardTitle>
              <CardDescription>Approved entries only</CardDescription>
            </CardHeader>
            <CardContent>
              {reportsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading…</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead className="text-right">Total Marks</TableHead>
                      <TableHead className="text-right">Result</TableHead>
                      <TableHead>Last Approved</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentTotals.map(entry => {
                      const pct = entry.totalMarks === 0 ? 0 : Math.round((entry.marks / entry.totalMarks) * 100);
                      const isPassed = entry.passCount > 0;
                      return (
                        <TableRow key={entry.student._id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{entry.student.fullName || entry.student.name}</span>
                              <span className="text-xs text-muted-foreground">{entry.student.email}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{entry.marks}/{entry.totalMarks} ({pct}%)</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={isPassed ? 'secondary' : 'outline'}>{isPassed ? 'Pass' : 'Fail'}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-xs">{fmtDate(entry.lastApprovedAt)}</span>
                              <span className="text-xs text-muted-foreground">{entry.lastApprovedBy || '-'}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              {visible.length === 0 && !reportsLoading && (
                <div className="text-sm text-muted-foreground mt-3">No approved grade reports for this course.</div>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
