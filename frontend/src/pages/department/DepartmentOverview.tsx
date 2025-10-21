import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { useMemo, useState } from "react";
import { useDepartmentOverview } from '@/hooks/useApiData';
import { ResponsiveContainer, PieChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Legend, Pie, Cell, BarChart } from "recharts";
import { CalendarDays, Clock, BookOpen, ArrowRight } from "lucide-react";

type DeptOverview = {
  enrollments: { courseId: string; name: string; users: number }[];
  exams: { _id: string; title: string; status: string; total: number; passed: number }[];
  upcoming: { _id: string; title: string; when: string; courseId: string; courseName?: string; instructorName?: string }[];
  courses: number;
};

export default function DepartmentOverview() {
  const { data, isLoading, error } = useDepartmentOverview();
  const overview = data as DeptOverview | undefined;
  const courseEnrollment = (overview?.enrollments || []).map(c => ({ name: c.name, users: c.users, courseId: c.courseId }));
  const exams = (overview?.exams || []).map(e => ({ id: e._id, name: e.title, total: e.total || 0, passed: e.passed || 0 }));
  const upcomingExams = (overview?.upcoming || []).map(u => ({ id: u._id, title: u.title, course: u.courseName || courseEnrollment.find(c => c.courseId === u.courseId)?.name || '', when: new Date(u.when), instructor: (u.instructorName || '').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() }))
    .sort((a, b) => a.when.getTime() - b.when.getTime());

  const [selectedExamId, setSelectedExamId] = useState<string>(exams[0]?.id ?? "");
  const selectedExam = useMemo(() => exams.find(e => e.id === selectedExamId) ?? exams[0], [selectedExamId, exams]);
  const passRate = useMemo(() => {
    if (!selectedExam || selectedExam.total === 0) return 0;
    return Math.round((selectedExam.passed / selectedExam.total) * 100);
  }, [selectedExam]);

  const formatDate = (d: Date) => d.toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  const relativeTime = (d: Date) => {
    const diff = d.getTime() - Date.now();
    const mins = Math.round(diff / 60000);
    if (mins <= 0) return 'Now';
    if (mins < 60) return `In ${mins} min`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `In ${hrs} hr`;
    const days = Math.round(hrs / 24);
    return `In ${days} day${days > 1 ? 's' : ''}`;
  };

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading department overview...</div>;
  }
  if (error) {
    return <div className="p-6 text-sm text-red-500">Failed to load overview</div>;
  }

  return (
    <div className="flex flex-col h-screen overflow-y-auto gap-4 p-2"> <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Department</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage your department here</p>
          </div>
       </div>
    <div className="grid gap-4 lg:gap-6   lg:grid-cols-3">
   
      <Card className="lg:col-span-2 bg-gradient-to-br from-indigo-50/60 to-sky-50/60 dark:from-muted dark:to-muted">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-500" /> Users per Course
          </CardTitle>
          <CardDescription>Enrollment counts across current department courses</CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={courseEnrollment} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="users" name="Users" fill="#6366f1"    radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

   
      <Card className="relative overflow-hidden">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Quiz Pass Rate</CardTitle>
            <CardDescription>For selected exam</CardDescription>
          </div>
          <Select value={selectedExamId} onValueChange={setSelectedExamId}>
            <SelectTrigger size="sm" aria-label="Select exam">
              <SelectValue placeholder="Select exam" />
            </SelectTrigger>
            <SelectContent>
              {exams.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4" style={{ height: 320 }}>
            <div className="h-[220px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip />
                  <Legend />
                  <Pie
                    dataKey="value"
                    nameKey="name"
                    data={[
                      { name: "Passed", value: selectedExam?.passed ?? 0 },
                      { name: "Failed", value: selectedExam ? selectedExam.total - selectedExam.passed : 0 },
                    ]}
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#ef4444" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Center label */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <div className="text-2xl font-semibold">{passRate}%</div>
                  <div className="text-xs text-muted-foreground">pass rate</div>
                </div>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{selectedExam?.passed ?? 0}</span> of {selectedExam?.total ?? 0} passed
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Exams */}
      <Card className="lg:col-span-3">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-emerald-500" /> Upcoming Exams</CardTitle>
            <CardDescription>Next scheduled assessments</CardDescription>
          </div>
          <Badge variant="secondary" className="uppercase">{upcomingExams.length} events</Badge>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col divide-y rounded-md border bg-card/50">
            {upcomingExams.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>{u.instructor}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{u.title}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className="inline-flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {u.course}</span>
                      <Separator orientation="vertical" className="h-3" />
                      <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {formatDate(u.when)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline">{relativeTime(u.when)}</Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
    </div>
  );
}
