import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarDays, Pencil, UserCheck } from "lucide-react";

import { useUsers,  useCourses, useUpdateCourseMutation, useDeleteCourseMutation } from '@/hooks/useApiData';
import { extractErrorMessage } from '@/hooks/useApiData';
import type { CourseDoc, UserDoc } from '@/types/domain';
import { getAuth } from '@/lib/auth';

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

export default function CourseManagement() {
  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const auth = getAuth();
  

  const { data: allCoursesResp, isLoading, error } = useCourses();
  const { data: users = [] } = useUsers() 
 
  const courses = ((allCoursesResp && Array.isArray((allCoursesResp as any).data)) ? (allCoursesResp as any).data : Array.isArray(allCoursesResp) ? allCoursesResp : []) as CourseDoc[];

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CourseDoc | null>(null);
  const [form, setForm] = useState<{ name: string; description: string; startDate: string; endDate: string }>({ name: "", description: "", startDate: "", endDate: "" });
  const updateCourseMutation = useUpdateCourseMutation();
  const deleteCourseMutation = useDeleteCourseMutation();
  const [saving, setSaving] = useState(false);
  const [teacherId, setTeacherId] = useState<string>("");
  const teachers = useMemo(() => {
    return (users as UserDoc[]).filter(u => u.role === 'teacher').map(u => ({ _id: u._id, fullName: u.fullName }));
  }, [users]);
  // Search & filter state
  const [query, setQuery] = useState("");
  const [teacherFilter, setTeacherFilter] = useState<string>("all"); // 'all' | 'none' | teacherId
  // theme filter removed

  // no local fetch side-effect; data comes from hooks

  // themes removed

  // Derived filtered list
  const filteredCourses = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses.filter((c) => {
      // text search on name + description
      const matchesText = q === "" ||
        c.name.toLowerCase().includes(q) ||
        (c.description?.toLowerCase().includes(q));
      // teacher filter
      const isUnassigned = !c.assignedTeacher || c.assignedTeacher === "";
      const matchesTeacher =
        teacherFilter === "all" ? true :
        teacherFilter === "none" ? isUnassigned :
        c.assignedTeacher === teacherFilter;
      return matchesText && matchesTeacher;
    });
  }, [courses, query, teacherFilter]);

  const totalPages = Math.ceil(filteredCourses.length / pageSize);
  const paginatedCourses = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredCourses.slice(start, start + pageSize);
  }, [filteredCourses, page, pageSize]);

  const onOpenEdit = (c: CourseDoc) => {
    setEditing(c);
    setForm({
      name: c.name || "",
      description: c.description || "",
      startDate: toLocalInput((c as any).startDate ?? null),
      endDate: toLocalInput((c as any).endDate ?? null),
      
    });
  setTeacherId(c.assignedTeacher && c.assignedTeacher !== "" ? c.assignedTeacher : "none");
    setOpen(true);
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSave = async () => {
    if (!editing  || updateCourseMutation.isPending) return;
    setSaving(true);
    try {
      // Build update payload (skip empty fields)
      const payload: any = {};
      if (form.name && form.name !== editing.name) payload.name = form.name.trim();
      if (form.description !== undefined && form.description !== editing.description) payload.description = form.description;
  // theme removed
      if (form.startDate) payload.startDate = new Date(form.startDate).toISOString(); else if (editing.startDate) payload.startDate = null;
      if (form.endDate) payload.endDate = new Date(form.endDate).toISOString(); else if (editing.endDate) payload.endDate = null;
      if (payload.startDate && payload.endDate && new Date(payload.endDate) < new Date(payload.startDate)) {
        // simple client check
        throw new Error('End date must be after start date');
      }
      if (Object.keys(payload).length) {
        await updateCourseMutation.mutateAsync({ id: editing._id, input: payload });
      }
      // Teacher assignment adjustments only if dept role AND course belongs to their department
      if (editing.department && auth.department && editing.department === auth.department) {

          await updateCourseMutation.mutateAsync({ id: editing._id, input: { assignedTeacher: null } });
        
      }
      setOpen(false);
    } catch (e) {
      // error surfaced via mutation error states
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!editing || deleteCourseMutation.isPending) return;
    // simple confirm
    const ok = window.confirm('Delete this course? This cannot be undone.');
    if (!ok) return;
    try {
      await deleteCourseMutation.mutateAsync({ id: editing._id });
      setOpen(false);
    } catch {}
  };
  const shortenDesc = (desc: string) => {
    if (!desc) return "—";
    return desc.length > 100 ? desc.slice(0, 30) + "..." : desc;
  };

  return (
    <div className="space-y-4 h-screen p-4">
      <Card className="h-full bg-transparent border-none">
        <CardHeader className="flex-row   items-center justify-between">
          <div>
            <CardTitle>Courses</CardTitle>
            <CardDescription>Manage schedules</CardDescription>
          </div>
          <Badge variant="secondary">{isLoading ? '…' : filteredCourses.length} of {courses.length} courses</Badge>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-3 text-sm text-red-600">{extractErrorMessage(error)}</div>
          )}
         
          {/* Filters toolbar */}
          <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="col-span-1 lg:col-span-2">
              <Input
                placeholder="Search by course or description"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div>
              <Select value={teacherFilter} onValueChange={setTeacherFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={'Filter by teacher'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All teachers</SelectItem>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {teachers.map(t => (
                    <SelectItem key={t._id} value={t._id}>{t.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              
           
          </div>
          </div>
          <div className="rounded-md border   overflow-x-auto">
            <Table >
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead className="w-[45%]">Description</TableHead>
                  <TableHead className="min-w-[180px]">Schedule</TableHead>
                  <TableHead className="min-w-[160px]">Teacher</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
  {isLoading ? (
                  <TableRow>
          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell>
                  </TableRow>
                ) : courses.length === 0 ? (
                  <TableRow>
          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No courses found</TableCell>
                  </TableRow>
                ) : filteredCourses.length === 0 ? (
                  <TableRow>
          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No matching courses</TableCell>
                  </TableRow>
                ) : (
                  paginatedCourses.map((c) => (
                    <TableRow key={c._id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="truncate max-w-[420px]">{shortenDesc(c.description)}</TableCell>
                      <TableCell>
                        <div className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                          <CalendarDays className="h-4 w-4" />
                          {formatDateRange((c as any).startDate, (c as any).endDate)}
                        </div>
                      </TableCell>
                        <TableCell>
                          <div className="inline-flex items-center gap-2 text-sm">
                            <UserCheck className="h-4 w-4 text-muted-foreground" />
                            {(() => {
                              const t = teachers.find(t => t._id === c.assignedTeacher);
                              return t ? t.fullName : (c.assignedTeacher ? c.assignedTeacher : 'Unassigned');
                            })()}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" className="gap-2" onClick={() => onOpenEdit(c)}>
                            <Pencil className="h-4 w-4" /> Edit
                          </Button>
                        </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {/* Pagination controls */}
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-2">
                <span className="text-sm">Rows per page:</span>
                <select
                  className="border rounded px-2 py-1 text-sm"
                  value={pageSize}
                  onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                >
                  {[10, 20, 50, 100].map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</Button>
                <span className="text-sm">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page === totalPages || totalPages === 0} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>


      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Edit Course</SheetTitle>
    <SheetDescription>Update details {'(assign teacher within your department)'}.</SheetDescription>
          </SheetHeader>
          <div className="p-4 pt-0 space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Course</Label>
              <Input id="name" name="name" value={form.name} onChange={onChange} placeholder="Course name" />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea name="description" value={form.description} onChange={onChange} rows={3} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="startDate">Start Date</Label>
                <Input id="startDate" name="startDate" type="datetime-local" value={form.startDate} onChange={onChange} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="endDate">End Date</Label>
                <Input id="endDate" name="endDate" type="datetime-local" value={form.endDate} onChange={onChange} />
              </div>
            </div>

            {editing?.department && auth.department && editing.department === auth.department && (
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
              <p className="text-xs text-muted-foreground">Teacher must belong to this department.</p>
            </div>
            )}
            {(updateCourseMutation.error) && (
              <p className="text-sm text-red-600">{extractErrorMessage(updateCourseMutation.error )}</p>
            )}
          </div>
          <SheetFooter>
            <div className="flex w-full gap-2">
              <Button variant="destructive" className="w-1/3" onClick={onDelete} disabled={!editing || deleteCourseMutation.isPending}>
                {deleteCourseMutation.isPending ? 'Deleting…' : 'Delete'}
              </Button>
              <Button variant="outline" className="w-1/3" onClick={() => setOpen(false)}>Cancel</Button>
              <Button className="w-1/3" onClick={onSave} disabled={saving || !editing || updateCourseMutation.isPending}>{(saving || updateCourseMutation.isPending) ? "Saving…" : "Save"}</Button>
            </div>
          </SheetFooter>
        </SheetContent>
  </Sheet>

    </div>
  );
}



