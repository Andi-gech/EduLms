import { useNavigate } from 'react-router';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { AssignmentFormData as AssignmentForm } from '@/types/domain';
import { useCreateAssignmentMutation, useCourses, useCourseModules } from '@/hooks/useApiData';

export default function AssignmentCreator() {
  const navigate = useNavigate();
  const [form, setForm] = useState<AssignmentForm>({ title: '', description: '', points: 10, dueDate: new Date(Date.now()+3600000).toISOString(), course: undefined, module: undefined });
  const [saving, setSaving] = useState(false);
  const update = <K extends keyof AssignmentForm>(k: K, v: AssignmentForm[K]) => setForm(prev => ({ ...prev, [k]: v }));
  const { data: teacherCourses } = useCourses({});
  const { data: modules } = useCourseModules(form.course || undefined);

  const dueLocal = form.dueDate.slice(0,16);
  const valid = form.title.trim() && form.points >=0 && !!form.course;
  const createMutation = useCreateAssignmentMutation();

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      const payload: any = { ...form, course: form.course! };
      if (form.module) payload.module = form.module;
      // Ensure dueDate is ISO
      if (payload.dueDate) payload.dueDate = new Date(payload.dueDate).toISOString();
      await createMutation.mutateAsync(payload);
      navigate('/teacher/assignments');
    } catch (e: any) {
      alert(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Create Assignment</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>Fill in assignment information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <div className='md:col-span-2'>
                <Label>Course *</Label>
                <select
                  className='mt-1 w-full border rounded px-2 py-2 text-sm bg-background'
                  value={form.course || ''}
                  onChange={e => update('course', e.target.value || undefined)}
                >
                  <option value=''>Select course</option>
                  {teacherCourses?.data?.map?.((c: any) => (
                    <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
                  )) || (Array.isArray(teacherCourses) && teacherCourses.map((c: any) => (
                    <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
                  )))}
                </select>
              </div>
              {form.course && (
                <div className='md:col-span-2'>
                  <Label>Module (optional)</Label>
                  <select
                    className='mt-1 w-full border rounded px-2 py-2 text-sm bg-background'
                    value={form.module || ''}
                    onChange={e => update('module', e.target.value || undefined)}
                  >
                    <option value=''>None</option>
                    {Array.isArray(modules) && modules.map((m: any) => (
                      <option key={m._id} value={m._id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <Label>Title</Label>
                <Input value={form.title} onChange={e => update('title', e.target.value)} placeholder='e.g. Research Report'/>
              </div>
              <div>
                <Label>Points</Label>
                <Input type='number' min={0} value={form.points} onChange={e => update('points', Number(e.target.value))} />
              </div>
              <div className='md:col-span-2'>
                <Label>Due Date / Time</Label>
                <Input type='datetime-local' value={dueLocal} onChange={e => update('dueDate', new Date(e.target.value).toISOString())} />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => update('description', e.target.value)} placeholder='Describe the assignment requirements...' className='min-h-[140px]' />
            </div>
            <div className='flex gap-2 justify-end'>
              <Button variant='outline' onClick={() => navigate(-1)}>Cancel</Button>
              <Button disabled={!valid || saving} onClick={save}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
