
import { useMemo, useState } from 'react';
import type { DepartmentDoc, CourseDoc } from '@/types/domain';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router';
import { useDepartments, useCourses, useResultApprovals } from '@/hooks/useApiData';
import { extractErrorMessage } from '@/hooks/useApiData';

// Shape normalized from /results/approvals backend endpoint
interface NormalizedResultApproval {
  _id: string; examId: string | null; examTitle: string | null;
  courseId: string | null; courseName: string | null;
  departmentId: string | null; departmentName: string | null;
  marks?: number; totalMarks?: number; ispassed?: boolean; approved: boolean;
  approvedAt?: string; approvedBy?: string; date?: string;
}

export default function GradeReports() {
  const navigate = useNavigate();
  // Live data
  const { data: departments = [], isLoading: depsLoading, error: depsError } = useDepartments();
  const { data: allCoursesResp, isLoading: coursesLoading, error: coursesError } = useCourses();
  const allCourses: CourseDoc[] = allCoursesResp && 'data' in allCoursesResp ? (allCoursesResp as any).data : (allCoursesResp as any) || [];
  const { data: approvals = [], isLoading: approvalsLoading, error: approvalsError } = useResultApprovals({ approved: 'true' });
  const normalized: NormalizedResultApproval[] = (approvals as any[]).map(r => ({
    _id: r._id,
    examId: r.examId || null,
    examTitle: r.examTitle || null,
    courseId: r.courseId || null,
    courseName: r.courseName || null,
    departmentId: r.departmentId || null,
    departmentName: r.departmentName || null,
    marks: r.marks,
    totalMarks: r.totalMarks,
    ispassed: r.ispassed,
    approved: !!r.approved,
    approvedAt: r.approvedAt,
    approvedBy: r.approvedBy,
    date: r.date,
  }));

  // Filters
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [query, setQuery] = useState<string>('');

  // only approved results (already filtered by approved=true in query) optionally filtered by department
  const approvedReports = useMemo(() => {
    return normalized
      .filter(r => deptFilter === 'all' ? true : r.departmentId === deptFilter);
  }, [normalized, deptFilter]);

  // group by course to show pass rate per approved course
  const courseAggregates = useMemo(() => {
    const map = new Map<string, {
      courseId: string;
      departmentId: string;
      total: number;
      pass: number;
      avgPct: number; // running sum later divided
    }>();
    for (const r of approvedReports) {
      if (!r.courseId) continue;
      const key = r.courseId;
      const agg = map.get(key) || { courseId: r.courseId!, departmentId: r.departmentId || 'unknown', total: 0, pass: 0, avgPct: 0 };
      agg.total += 1;
      // Passing uses backend field ispassed (boolean) if present
      agg.pass += r.ispassed ? 1 : 0;
      if (r.marks != null && r.totalMarks) {
        agg.avgPct += (r.marks / r.totalMarks) * 100;
      }
      map.set(key, agg);
    }
    const rows = Array.from(map.values()).map(x => {
      const course = allCourses.find(c => c._id === x.courseId);
      const dept = departments.find(d => d._id === x.departmentId);
      return {
        ...x,
        passRate: x.total === 0 ? 0 : Math.round((x.pass / x.total) * 100),
        avgPct: x.total === 0 ? 0 : Math.round(x.avgPct / x.total),
        courseName: course ? course.name : (x.courseId || 'Unknown'),
        deptName: dept ? dept.name : (x.departmentId || 'Unknown'),
      };
    });
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      return rows.filter(r => [r.courseName, r.deptName].some(v => (v || '').toLowerCase().includes(q)));
    }
    return rows;
  }, [approvedReports, allCourses, departments, query]);

  const kpis = useMemo(() => {
    const totalCourses = courseAggregates.length;
    const avgPassRate = totalCourses === 0 ? 0 : Math.round(courseAggregates.reduce((s, r) => s + r.passRate, 0) / totalCourses);
    const avgScore = totalCourses === 0 ? 0 : Math.round(courseAggregates.reduce((s, r) => s + r.avgPct, 0) / totalCourses);
    const totalApprovedReports = approvedReports.length;
    return { totalCourses, avgPassRate, avgScore, totalApprovedReports };
  }, [courseAggregates, approvedReports]);

  const setCourseFilter = (_: string) => { /* placeholder for future filter */ };

  return (
    <div className="space-y-3 h-screen overflow-y-auto p-3 sm:p-4">
      <Card className="bg-transparent border-0">
        <CardHeader className="flex-row items-center justify-between py-2 px-2 sm:px-0">
          <div>
            <CardTitle>Grade Reports</CardTitle>
            <CardDescription>Department-approved grades by course and student</CardDescription>
          </div>
          <Badge variant="secondary">{kpis.totalCourses} approved</Badge>
        </CardHeader>
        <CardContent>
          {(depsLoading || coursesLoading || approvalsLoading) && (
            <div className="text-sm text-muted-foreground mb-2">Loading data...</div>
          )}
          {(depsError || coursesError || approvalsError) && (
            <div className="text-sm text-red-500 mb-2">{extractErrorMessage(depsError || coursesError || approvalsError)}</div>
          )}
        
      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Select value={deptFilter} onValueChange={(v) => { setDeptFilter(v); setCourseFilter('all'); }}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Filter by department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments.map((d: DepartmentDoc) => (
                  <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9"
        placeholder="Search course or department"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
            <Card>
              <CardHeader className="py-1 px-3"><CardDescription>Approved Courses</CardDescription></CardHeader>
              <CardContent className="px-3 pb-3 pt-0 text-xl font-semibold">{kpis.totalCourses}</CardContent>
            </Card>
            <Card>
              <CardHeader className="py-1 px-3"><CardDescription>Avg Pass Rate</CardDescription></CardHeader>
              <CardContent className="px-3 pb-3 pt-0 text-xl font-semibold">{kpis.avgPassRate}%</CardContent>
            </Card>
            <Card>
              <CardHeader className="py-1 px-3"><CardDescription>Avg Score</CardDescription></CardHeader>
              <CardContent className="px-3 pb-3 pt-0 text-xl font-semibold">{kpis.avgScore}%</CardContent>
            </Card>
            <Card>
              <CardHeader className="py-1 px-3"><CardDescription>Approved Reports</CardDescription></CardHeader>
              <CardContent className="px-3 pb-3 pt-0 text-xl font-semibold">{kpis.totalApprovedReports}</CardContent>
            </Card>
          </div>

          
          <Card>
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-base">Approved Courses</CardTitle>
              <CardDescription>Pass rate per course</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead className="text-right">Approved</TableHead>
                    <TableHead className="text-right">Passes</TableHead>
                    <TableHead className="text-right">Pass Rate</TableHead>
                    <TableHead className="text-right">Avg Score</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courseAggregates.map(row => (
                    <TableRow key={row.courseId}>
                      <TableCell>{row.deptName}</TableCell>
                      <TableCell>{row.courseName}</TableCell>
                      <TableCell className="text-right">{row.total}</TableCell>
                      <TableCell className="text-right">{row.pass}</TableCell>
                      <TableCell className="text-right">{row.passRate}%</TableCell>
                      <TableCell className="text-right">{row.avgPct}%</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => navigate(`/admin/grades/course/${row.courseId}`)}>View details</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {courseAggregates.length === 0 && (
                <div className="text-sm text-muted-foreground mt-3">No approved courses match your filters.</div>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
