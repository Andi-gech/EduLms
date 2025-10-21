
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useDepartments, useCreateDepartmentMutation } from '@/hooks/useApiData';
import { extractErrorMessage } from '@/hooks/useApiData';

export default function Departments() {
  const { data: departments = [], isLoading, error } = useDepartments();
  const createMutation = useCreateDepartmentMutation();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");

  const count = useMemo(() => departments.length, [departments]);
  const canCreate = name.trim().length > 0 && code.trim().length > 0;

  function resetForm() {
    setName("");
    setCode("");
    setDescription("");
  }

  async function handleCreate() {
    if (!canCreate || createMutation.isPending) return;
    try {
      await createMutation.mutateAsync({ name: name.trim(), code: code.trim().toUpperCase(), description: description.trim() });
      resetForm();
      setOpen(false);
    } catch (e) {
      // error handled via createMutation.error
    }
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Departments</h2>
          <p className="text-sm text-muted-foreground">Manage academic departments.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{isLoading ? '…' : count} total</Badge>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Create Department
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Create Department</SheetTitle>
                <SheetDescription>
                  Add a new department. Name and code are required. You can edit details later.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Computer Science" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Code</Label>
                  <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g., CS" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
                </div>
                {createMutation.error && (
                  <p className="text-sm text-red-600">{extractErrorMessage(createMutation.error)}</p>
                )}
              </div>
              <SheetFooter className="mt-6">
                <Button onClick={handleCreate} disabled={!canCreate || createMutation.isPending}>
                  {createMutation.isPending ? 'Creating…' : 'Create'}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <Card className="bg-transparent border-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Name</TableHead>
                <TableHead className="w-[15%]">Code</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-sm text-muted-foreground">Loading…</TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-sm text-red-600">Failed to load departments</TableCell>
                </TableRow>
              ) : departments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-sm text-muted-foreground">
                    No departments yet.
                  </TableCell>
                </TableRow>
              ) : (
                departments.map((d) => (
                  <TableRow key={d._id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>{d.code}</TableCell>
                    <TableCell className="text-muted-foreground">{d.description || "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
