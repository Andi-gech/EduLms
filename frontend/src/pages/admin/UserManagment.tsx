import { useEffect, useMemo, useState } from "react";
import type { DepartmentDoc, UserDoc, ExtendedUserRole } from '@/types/domain';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUsers, useDepartments } from '@/hooks/useApiData';
import { apiClient } from '@/lib/apiClient';

type UIUser = UserDoc & { role: ExtendedUserRole | UserDoc['role']; active: boolean };

const ROLE_OPTIONS = [
  { value: 'student', label: 'Student' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'Registrar', label: 'Registrar' },
  { value: 'department_head', label: 'Department Head' },
  { value: 'department_admin', label: 'Department Admin' },
  { value: 'short_training_office', label: 'Short Training Office' },
];
const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export default function UserManagment() {
   const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all"); 
  const [users, setUsers] = useState<UIUser[]>([]);
   const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();

    return users.filter(u => {
      const matchesText = q === '' || u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchesRole = roleFilter === 'all' ? true : u.role === roleFilter;
      const matchesDept = deptFilter === 'all' ? true : (deptFilter === 'none' ? !u.department : u.department === deptFilter);
      const matchesStatus = statusFilter === 'all' ? true : (statusFilter === 'active' ? u.active : !u.active);
      return matchesText && matchesRole && matchesDept && matchesStatus;
    });
  }, [users, query, roleFilter, deptFilter, statusFilter]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, page, pageSize]);
  const { data: departmentsData } = useDepartments();
  const departments: Pick<DepartmentDoc,'_id'|'name'>[] = (departmentsData || []).map(d => ({ _id: d._id, name: d.name }));


  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
 
  // Edit sheet
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UIUser | null>(null);
  const [editRole, setEditRole] = useState<UIUser['role']>('student');
  const [editDept, setEditDept] = useState<string>('none');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');
  const [saving, setSaving] = useState(false);

  const { data: liveUsers, isLoading: liveLoading, error: liveError } = useUsers();
  useEffect(() => {
    setLoading(liveLoading);
    if (liveUsers) setUsers((liveUsers as UserDoc[]).map(u => ({ ...u, active: u.status })) as UIUser[]);
    if (liveError) setError((liveError as any).message || 'Failed to load users');
  }, [liveUsers, liveLoading, liveError]);

 
  const openEdit = (u: UIUser) => {
    setEditing(u);
    setEditRole(u.role);
    setEditDept(u.department ? u.department : 'none');
    setEditStatus(u.active ? 'active' : 'inactive');
    setOpen(true);
  };

  const onSave = async () => {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      const dept = editDept === 'none' ? null : editDept;
      const active = editStatus === 'active';
  await apiClient.updateUser(editing._id, { role: editRole as any, department: dept as any, status: active });
      setUsers(prev => prev.map(u => u._id === editing._id ? { ...u, role: editRole, department: dept as any, active } : u));
      setOpen(false);
    } catch (e: any) {
      setError(e.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
  <div className="space-y-4 h-screen p-4">
      <Card className="h-full bg-transparent border-0">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Search, filter, and edit users (live data)</CardDescription>
          </div>
          <Badge variant="secondary">{filteredUsers.length} of {users.length} users</Badge>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

          {/* Filters */}
          <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <div className="col-span-1 lg:col-span-2">
              <Input placeholder="Search by name or email" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={'Filter by role'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {ROLE_OPTIONS.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={'Filter by department'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  <SelectItem value="none">No department</SelectItem>
                  {departments.map(d => (
                    <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={'Filter by status'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {STATUS_OPTIONS.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={() => { setQuery(''); setRoleFilter('all'); setDeptFilter('all'); setStatusFilter('all'); }}>Reset</Button>
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No users found</TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No matching users</TableCell>
                  </TableRow>
                ) : (
                  paginatedUsers.map((u) => (
                    <TableRow key={u._id}>
                      <TableCell className="font-medium">{u.fullName}</TableCell>
                      <TableCell className="truncate max-w-[320px]">{u.email}</TableCell>
                      <TableCell className="capitalize">{u.role.replace('_', ' ')}</TableCell>
                      <TableCell>{departments.find(d => d._id === u.department)?.name || (u.department ? u.department : '—')}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-md ${u.active ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>{u.active ? 'Active' : 'Inactive'}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" className="gap-2" onClick={() => openEdit(u)}>
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
            <SheetTitle>Edit User</SheetTitle>
            <SheetDescription>Change role, department, and status</SheetDescription>
          </SheetHeader>
          <div className="p-4 pt-0 space-y-4">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={editing?.fullName ?? ''} disabled />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input value={editing?.email ?? ''} disabled />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Role</Label>
                <Select value={editRole} onValueChange={(v) => setEditRole(v as UIUser['role'])}>
                  <SelectTrigger>
                    <SelectValue placeholder={'Select a role'} />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Department</Label>
                <Select value={editDept} onValueChange={setEditDept}>
                  <SelectTrigger>
                    <SelectValue placeholder={'Select a department'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {departments.map(d => (
                      <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={(v) => setEditStatus(v as 'active' | 'inactive')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter>
            <div className="flex w-full gap-2">
              <Button variant="outline" className="w-1/2" onClick={() => setOpen(false)}>Cancel</Button>
              <Button className="w-1/2" onClick={onSave} disabled={saving || !editing}>{saving ? 'Saving…' : 'Save'}</Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}



