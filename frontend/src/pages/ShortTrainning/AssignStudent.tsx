
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Trash2, UserPlus, RefreshCw, Loader2 } from "lucide-react";
import { useParams } from 'react-router';
import { apiClient } from '@/lib/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { extractErrorMessage } from '@/hooks/useApiData';

type User = { _id: string; fullName: string; email: string };

function formatDateRange(start?: string | null, end?: string | null) {
  const s = start ? new Date(start) : null;
  const e = end ? new Date(end) : null;
  if (!s && !e) return "Unscheduled";
  if (s && !e) return `${s.toLocaleDateString()} -`;
  if (!s && e) return `- ${e.toLocaleDateString()}`;
  return `${s!.toLocaleDateString()} → ${e!.toLocaleDateString()}`;
}

export default function AssignStudent() {
  const { courseId } = useParams<{ courseId: string }>();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  // Course details (reuse existing getCourse endpoint)
  const courseQ = useQuery({
    queryKey: ['courseAssign', courseId],
    queryFn: () => apiClient.getCourse(courseId!),
    enabled: !!courseId,
  });

  // All students (registrar endpoint lists all but Registrar). Fallback to filter client-side.
  const studentsQ = useQuery({
    queryKey: ['studentsByDept', courseQ.data?.department],
    queryFn: () => apiClient.listStudents(courseQ.data?.department ? { department: courseQ.data.department as any } : undefined),
    enabled: !!courseQ.data?.department,
    staleTime: 60_000,
  });

  // Enrolled users for course via authorized details endpoint
  const enrolledQ = useQuery({
    queryKey: ['courseEnrollments', courseId],
    queryFn: async () => {
      if (!courseId) return [] as any[];
      const details = await apiClient.getCourseDetails(courseId);
      return details.enrolledStudents || [];
    },
    enabled: !!courseId,
  });

  const enrollMutation = useMutation({
    mutationFn: (studentId: string) => apiClient.assignStudent(courseId!, studentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courseEnrollments', courseId] }),
    onError: (e) => setError(extractErrorMessage(e))
  });
  const unassignMutation = useMutation({
    mutationFn: (studentId: string) => apiClient.unassignStudent(courseId!, studentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courseEnrollments', courseId] }),
    onError: (e) => setError(extractErrorMessage(e))
  });

  const [enrolled, setEnrolled] = useState<string[]>([]);
  useEffect(() => {
  if (enrolledQ.data) setEnrolled(enrolledQ.data.map((e: any) => (e.user && e.user._id) ? e.user._id : e.user));
  }, [enrolledQ.data]);
  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const allStudents: User[] = (studentsQ.data || []).map(s => ({ _id: s._id, fullName: s.fullName, email: s.email }));
  const enrolledUsers = useMemo(() => allStudents.filter(u => enrolled.includes(u._id)), [allStudents, enrolled]);

  const availableStudents = useMemo(() => {
    const notEnrolled = allStudents.filter((u) => !enrolled.includes(u._id));
    const q = search.trim().toLowerCase();
    if (!q) return notEnrolled;
    return notEnrolled.filter(u => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [enrolled, search, allStudents]);

  function handleEnroll() {
    if (!selectedUserId || !courseId) return;
    if (enrolled.includes(selectedUserId)) return;
    // TODO: dedicated assign endpoint for short_training_office; using student self-enroll placeholder.
  enrollMutation.mutate(selectedUserId);
    setSelectedUserId(undefined);
    setSearch("");
    setOpen(false);
  }

  function handleRemove(id: string) {
    unassignMutation.mutate(id);
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Enroll Students</h2>
          <p className="text-sm text-muted-foreground">Manage enrollment for this course.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{enrolledUsers.length} enrolled</Badge>
          <Button variant="ghost" size="icon" onClick={() => { qc.invalidateQueries({ queryKey: ['courseAssign', courseId] }); qc.invalidateQueries({ queryKey: ['courseEnrollments', courseId] }); qc.invalidateQueries({ queryKey: ['studentsByDept'] }); }}>
            <RefreshCw className={`h-4 w-4 ${(courseQ.isLoading || studentsQ.isLoading || enrolledQ.isLoading) ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <span className="truncate">{courseQ.data?.name || 'Course'}</span>
            <Badge variant="outline">{courseQ.data?.department || ''}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {error && <div className="text-xs text-red-600">{error}</div>}
          <p className="text-sm text-muted-foreground">{courseQ.data?.description || '—'}</p>
          <div className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            {formatDateRange(courseQ.data?.startDate, courseQ.data?.endDate)}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium">Enrolled Students</h3>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button size="sm" className="gap-2">
              <UserPlus className="h-4 w-4" /> Add Student
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Add student</SheetTitle>
              <SheetDescription>
                Pick a student to enroll in this course. You can search by name or email.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Search students..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Select student</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a student" />
                  </SelectTrigger>
                  <SelectContent>
                    {(studentsQ.isLoading) && (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading...</div>
                    )}
                    {!studentsQ.isLoading && availableStudents.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">No matches</div>
                    ) : (
                      availableStudents.map((u) => (
                        <SelectItem key={u._id} value={u._id}>
                          {u.fullName} — {u.email}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <SheetFooter className="mt-6">
              <Button onClick={handleEnroll} disabled={!selectedUserId || enrollMutation.isPending}>{enrollMutation.isPending ? 'Enrolling...' : 'Enroll'}</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-[80px] text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(enrolledQ.isLoading) && (
              <TableRow><TableCell colSpan={3} className="text-sm text-muted-foreground">Loading...</TableCell></TableRow>
            )}
            {!enrolledQ.isLoading && enrolledUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-sm text-muted-foreground">
                  No students enrolled yet.
                </TableCell>
              </TableRow>
            ) : (
              !enrolledQ.isLoading && enrolledUsers.map((u) => (
                <TableRow key={u._id}>
                  <TableCell className="font-medium">{u.fullName}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleRemove(u._id)} aria-label={`Remove ${u.fullName}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
