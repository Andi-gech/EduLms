import { useMemo, useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDepartments, useCourses, QK } from '@/hooks/useApiData';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from "react-router";

type Department = { _id: string; name: string };
type Course = { _id: string; name: string; description: string; department: string; startDate?: string | null; endDate?: string | null };

function formatDateRange(start?: string | null, end?: string | null) {
  const s = start ? new Date(start) : null;
  const e = end ? new Date(end) : null;
  if (!s && !e) return "Unscheduled";
  if (s && !e) return `${s.toLocaleDateString()} -`;
  if (!s && e) return `- ${e.toLocaleDateString()}`;
  return `${s!.toLocaleDateString()} → ${e!.toLocaleDateString()}`;
}

export default function CurrentCourses() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const deptQ = useDepartments();
  // Use generic courses list (student role filter already in backend) – show all active short trainings (assuming they are normal courses)
  const courseQ = useCourses();
  const departments: Department[] = deptQ.data || [];
  const courses: Course[] = (courseQ.data?.data || courseQ.data || []) as any;

  const [deptFilter, setDeptFilter] = useState<string>("all");
  const depById = useMemo(() => Object.fromEntries(departments.map(d => [d._id, d.name])), [departments]);
  const filtered = useMemo(() => (deptFilter === "all" ? courses : courses.filter(c => c.department === deptFilter)), [deptFilter, courses]);

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Current Courses</h2>
          <p className="text-sm text-muted-foreground">Filter short trainings by department.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="secondary">{filtered.length} courses</Badge>
          <Button variant="ghost" size="icon" onClick={() => { qc.invalidateQueries({ queryKey: QK.courses(undefined) }); qc.invalidateQueries({ queryKey: QK.departments() }); }} disabled={deptQ.isLoading || courseQ.isLoading}>
            <RefreshCw className={`h-4 w-4 ${deptQ.isLoading || courseQ.isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
      {(deptQ.isLoading || courseQ.isLoading) && (
        <div className="text-sm text-muted-foreground">Loading...</div>
      )}
      {!deptQ.isLoading && !courseQ.isLoading && filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground">No courses found.</div>
      ) : (!deptQ.isLoading && !courseQ.isLoading) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Card key={c._id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span className="truncate">{c.name}</span>
                  <Badge variant="outline">{depById[c.department] || c.department}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground line-clamp-3">{c.description}</p>
                <div className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  {formatDateRange(c.startDate, c.endDate)}
                </div>
              </CardContent>
                <CardFooter className="flex justify-end">
                 <Button className=" cursor-pointer" onClick={() => 
                    {
navigate(`/short-training/${c._id}/enroll-student`);
                    }
                 } variant="outline">Enroll Students</Button>
                </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

