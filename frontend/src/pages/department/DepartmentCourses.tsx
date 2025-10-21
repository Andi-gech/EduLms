import { useEffect, useMemo, useState } from "react";
import { useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarDays, Pencil, UserCheck, Loader2, Search, CheckCircle2, AlertCircle, Clock, ClipboardCheck, FileText, GraduationCap, UserPlus, RefreshCw } from "lucide-react";
import { getAuth } from '@/lib/auth';
import { apiClient } from '@/lib/apiClient';
import { extractErrorMessage, useDepartmentCourses, QK } from '@/hooks/useApiData';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type Course = {
  _id: string;
  name: string;
  description: string;
  image?: string;
  startDate?: string | null;
  endDate?: string | null;
  status?: boolean;
  department?: string | null;
  assignedTeacher?: string | null;
};

function formatDateRange(start?: string | null, end?: string | null) {
  const s = start ? new Date(start) : null;
  const e = end ? new Date(end) : null;
  if (!s && !e) return "Unscheduled";
  if (s && !e) return `${s.toLocaleDateString()} -`;
  if (!s && e) return `- ${e.toLocaleDateString()}`;
  return `${s!.toLocaleDateString()} → ${e!.toLocaleDateString()}`;
}

function toLocalInput(dt?: string | null) {
  if (!dt) return "";
  const d = new Date(dt);
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function DepartmentCourses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]); // local mirror for optimistic updates
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState<{ startDate: string; endDate: string }>({ startDate: "", endDate: "" });
  const [saving, setSaving] = useState(false);
  const [teacherId, setTeacherId] = useState<string>("");
  const [teachers, setTeachers] = useState<Array<{ _id: string; fullName: string }>>([]);
  const [search, setSearch] = useState("");
  const [teacherFilter, setTeacherFilter] = useState("all");

  const auth = getAuth();
  const qc = useQueryClient();
  // Courses (department scoped)
  const deptCoursesQ = useDepartmentCourses();
  // Teachers list (reuse raw query)
  const teachersQ = useQuery({
    queryKey: ['teachers', auth.department],
    queryFn: () => apiClient.listTeachers({ department: auth.department || undefined }).then(r => r.map(t => ({ _id: t._id, fullName: t.fullName }))),
    staleTime: 60_000,
  });

  // Sync query data to local state for filtering/optimistic behaviour
  useEffect(() => {
    if (deptCoursesQ.data) {
      setCourses(deptCoursesQ.data as any);
    }
  }, [deptCoursesQ.data]);
  useEffect(() => {
    if (teachersQ.data) setTeachers(teachersQ.data);
  }, [teachersQ.data]);

  const loading = deptCoursesQ.isLoading || teachersQ.isLoading;

  // Mutation for teacher assignment
  const assignMutation = useMutation({
    mutationFn: ({ courseId, teacherId }: { courseId: string; teacherId: string | null }) => apiClient.updateCourse(courseId, { assignedTeacher: teacherId }),
    onMutate: async ({ courseId, teacherId }) => {
      setError(null);
  await qc.cancelQueries({ queryKey: QK.departmentCourses() });
      const prev = deptCoursesQ.data as any[] || [];
      setCourses(courses => courses.map(c => c._id === courseId ? { ...c, assignedTeacher: teacherId || null } : c));
      return { prev };
    },
    onError: (e, _vars, ctx) => {
      setError(extractErrorMessage(e));
      if (ctx?.prev) setCourses(ctx.prev as any);
    },
    onSettled: () => {
  qc.invalidateQueries({ queryKey: QK.departmentCourses() });
    }
  });

  const onOpenEdit = (c: Course) => {
    setEditing(c);
    setForm({
      startDate: toLocalInput(c.startDate ?? null),
      endDate: toLocalInput(c.endDate ?? null),
      
    });
  setTeacherId(c.assignedTeacher && c.assignedTeacher !== "" ? c.assignedTeacher : "none");
    setOpen(true);
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSave = async () => {
    if (!editing) return;
    setSaving(true);
    assignMutation.mutate({ courseId: editing._id, teacherId: teacherId === 'none' ? null : teacherId }, {
      onSuccess: () => setOpen(false),
      onSettled: () => setSaving(false)
    });
  };

  const stats = useMemo(() => {
    const assigned = courses.filter(c => !!c.assignedTeacher).length;
    const unassigned = courses.length - assigned;
    return { total: courses.length, assigned, unassigned };
  }, [courses]);

  const filtered = useMemo(() => courses.filter(c => {
    if (search) {
      const q = search.toLowerCase();
      if (!c.name.toLowerCase().includes(q) && !c.description.toLowerCase().includes(q)) return false;
    }
    if (teacherFilter === 'all') return true;
    if (teacherFilter === 'unassigned') return !c.assignedTeacher;
    return c.assignedTeacher === teacherFilter;
  }), [courses, search, teacherFilter]);

  // helper navigate wrappers
  const goEdit = (c: Course) => onOpenEdit(c);
  const goExams = (id: string) => navigate(`/department/approve/exams/${id}`);
  const goContent = (id: string) => navigate(`/department/approve/content/${id}`);
  const goGrades = (id: string) => navigate(`/department/approve/grades/${id}`);
  const quickAssign = async (c: Course) => {
    if (!teachers.length) return onOpenEdit(c);
    const first = teachers[0];
    assignMutation.mutate({ courseId: c._id, teacherId: first._id });
  };

  return (
    <div className="h-screen overflow-y-auto flex flex-col p-4 gap-4">
      <div className="rounded-lg border bg-gradient-to-br from-background via-background to-muted/40 p-5 flex flex-col gap-5">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1 space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Department Courses</h1>
            <p className="text-xs text-muted-foreground">Manage schedules, teacher assignments and exam approvals.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { qc.invalidateQueries({ queryKey: QK.departmentCourses() }); qc.invalidateQueries({ queryKey: ['teachers', auth.department] }); }} disabled={loading} className="text-xs inline-flex items-center gap-1 px-3 py-2 rounded-md border hover:bg-muted/40">
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
          <div className="flex gap-3 text-xs">
            <div className="px-3 py-2 rounded-md border bg-background/60 flex flex-col min-w-[80px]">
              <span className="text-[10px] uppercase text-muted-foreground">Total</span>
              <span className="text-sm font-semibold">{stats.total}</span>
            </div>
            <div className="px-3 py-2 rounded-md border bg-background/60 flex flex-col min-w-[80px]">
              <span className="text-[10px] uppercase text-muted-foreground flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Assigned</span>
              <span className="text-sm font-semibold text-emerald-600">{stats.assigned}</span>
            </div>
            <div className="px-3 py-2 rounded-md border bg-background/60 flex flex-col min-w-[80px]">
              <span className="text-[10px] uppercase text-muted-foreground flex items-center gap-1"><AlertCircle className="w-3 h-3" />Open</span>
              <span className="text-sm font-semibold text-orange-600">{stats.unassigned}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-end">
          <div className="flex items-center gap-2 w-full md:w-72 relative">
            <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={e=> setSearch(e.target.value)} placeholder="Search courses..." className="pl-8" />
          </div>
          <div className="w-full md:w-56">
            <Label className="text-[11px] font-medium text-muted-foreground">Filter by Teacher</Label>
            <Select value={teacherFilter} onValueChange={setTeacherFilter}>
              <SelectTrigger className="h-9 mt-1">
                <SelectValue placeholder="Teacher" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {teachers.map(t => <SelectItem key={t._id} value={t._id}>{t.fullName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
  {error && <div className="text-xs text-red-600 border border-red-200 bg-red-50 rounded-md px-3 py-2">{error}</div>}
  {assignMutation.isPending && <div className="text-[10px] text-muted-foreground">Saving assignment...</div>}
      </div>

      <Card className="flex-1  flex flex-col">
        <CardHeader className="py-4 pb-2">
          <CardTitle className="text-base">Courses</CardTitle>
          <CardDescription className="text-[11px]">{filtered.length} shown of {courses.length}</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 ">
          <div className="rounded-md border bg-gradient-to-b from-background to-muted/20">
            <Table className="w-full table-fixed md:table-auto">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[18%] md:w-[20%]">Course</TableHead>
                  <TableHead className="w-[32%] md:w-[38%]">Description</TableHead>
                  <TableHead className="w-[18%] md:w-[15%]">Schedule</TableHead>
                  <TableHead className="w-[17%] md:w-[15%]">Teacher</TableHead>
                  <TableHead className="w-[15%] md:w-[12%] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && Array.from({length:4}).map((_,i)=>(
                  <TableRow key={i}>
                    <TableCell colSpan={5} className="py-6">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground justify-center"><Loader2 className="w-4 h-4 animate-spin" /> Loading courses...</div>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-xs text-muted-foreground">No courses match your filters.</TableCell>
                  </TableRow>
                )}
                {!loading && filtered.map(c => {
                  const teacher = teachers.find(t=> t._id === c.assignedTeacher);
                  const assigned = !!teacher;
                  const now = new Date();
                  const start = c.startDate ? new Date(c.startDate) : null;
                  const end = c.endDate ? new Date(c.endDate) : null;
                  let schedBadge: {label:string; tone:string} = { label: 'Unscheduled', tone: 'bg-gray-200 text-gray-600' };
                  if (start && end) {
                    if (now < start) schedBadge = { label: 'Upcoming', tone: 'bg-blue-100 text-blue-700' };
                    else if (now > end) schedBadge = { label: 'Ended', tone: 'bg-red-100 text-red-600' };
                    else schedBadge = { label: 'Active', tone: 'bg-emerald-100 text-emerald-700' };
                  }
                  return (
                    <TableRow key={c._id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="align-top">
                        <div className="flex flex-col gap-1">
                          <button onClick={()=> onOpenEdit(c)} className="font-medium text-sm leading-tight text-blue-600 dark:text-blue-400 underline underline-offset-2 decoration-blue-400/60 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400/40 rounded-sm">
                            {c.name}
                          </button>
                          <div className="flex gap-1 flex-wrap">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${schedBadge.tone}`}>{schedBadge.label}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${assigned ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>{assigned ? 'Assigned' : 'Unassigned'}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs align-top max-w-[420px]">
                        <p className="line-clamp-3 leading-snug text-muted-foreground">{c.description}</p>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="inline-flex items-start gap-1 text-[11px] text-muted-foreground leading-snug">
                          <CalendarDays className="h-4 w-4 mt-0.5" />
                          <div className="flex flex-col">
                            <span>{formatDateRange(c.startDate, c.endDate)}</span>
                            {start && <span className="text-[10px] text-muted-foreground/70 flex items-center gap-1"><Clock className="w-3 h-3" />{start.toLocaleDateString(undefined,{month:'short', day:'numeric'})}</span>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex items-start gap-2 text-xs">
                          <UserCheck className={`h-4 w-4 mt-0.5 ${assigned ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                          <div className="flex flex-col">
                            <span className="leading-tight">{teacher ? teacher.fullName : 'Unassigned'}</span>
                            {!assigned && <span className="text-[10px] text-orange-600">Needs assignment</span>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right align-top">
                        <div className="flex flex-col items-end gap-1 text-[11px] leading-tight">
                          {assigned ? (
                            <button onClick={()=> goEdit(c)} className="px-2 py-1 rounded hover:bg-muted/50 text-blue-600 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-400/40 w-fit" aria-label="Edit / Assign teacher">
                              <Pencil className="w-3 h-3" /> Edit
                            </button>
                          ) : (
                            <button onClick={()=> quickAssign(c)} className="px-2 py-1 rounded hover:bg-muted/50 text-emerald-600 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 w-fit" aria-label="Quick assign first teacher">
                              <UserPlus className="w-3 h-3" /> Quick Assign
                            </button>
                          )}
                          <button onClick={()=> goExams(c._id)} className="px-2 py-1 rounded hover:bg-muted/50 text-blue-600 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-400/40 w-fit" aria-label="Approve exams">
                            <ClipboardCheck className="w-3 h-3" /> Exams
                          </button>
                          <button onClick={()=> goContent(c._id)} className="px-2 py-1 rounded hover:bg-muted/50 text-blue-600 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-400/40 w-fit" aria-label="Approve content">
                            <FileText className="w-3 h-3" /> Content
                          </button>
                          <button onClick={()=> goGrades(c._id)} className="px-2 py-1 rounded hover:bg-muted/50 text-blue-600 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-400/40 w-fit" aria-label="Approve grades">
                            <GraduationCap className="w-3 h-3" /> Grades
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                  
                })}
              </TableBody>
            </Table>
          </div>
          
        </CardContent>
      </Card>

  <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Edit Course</SheetTitle>
            <SheetDescription>Assign a teacher. Department and schedule are read-only here.</SheetDescription>
          </SheetHeader>
          <div className="p-4 pt-0 space-y-4">
            <div className="space-y-1">
              <Label>Course</Label>
              <Input value={editing?.name ?? ""} disabled />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea value={editing?.description ?? ""} disabled rows={3} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="startDate">Start Date</Label>
                <Input id="startDate" name="startDate" type="datetime-local" value={form.startDate} onChange={onChange} disabled />
              </div>
              <div className="space-y-1">
                <Label htmlFor="endDate">End Date</Label>
                <Input id="endDate" name="endDate" type="datetime-local" value={form.endDate} onChange={onChange} disabled />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Assign Teacher</Label>
              {teachers.length > 0 ? (
        <Select value={teacherId} onValueChange={setTeacherId}>
                  <SelectTrigger>
          <SelectValue placeholder={'Select a teacher'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {teachers.map(t => (
                      <SelectItem key={t._id} value={t._id}>{t.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={teacherId} onChange={(e) => setTeacherId(e.target.value)} placeholder="Enter teacher ID" />
              )}
              <p className="text-[10px] text-muted-foreground">Start / end date updates disabled. Use scheduling panel elsewhere.</p>
            </div>
          </div>
          <SheetFooter>
            <div className="flex w-full gap-2">
              <Button variant="outline" className="w-1/2" onClick={() => setOpen(false)}>Cancel</Button>
              <Button className="w-1/2" onClick={onSave} disabled={saving || !editing}>{saving ? "Saving…" : "Assign"}</Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}



