import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiClient } from '@/lib/apiClient';
import { useDepartments } from '@/hooks/useApiData';

type Department = { _id: string; name: string };

export default function CreateCourses() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const { data: departments = [], isLoading: depsLoading, error: depsError } = useDepartments();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const endBeforeStart = useMemo(() => {
    if (!startDate || !endDate) return false;
    return new Date(endDate).getTime() < new Date(startDate).getTime();
  }, [startDate, endDate]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setImageFile(f);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!name.trim()) return setError('Name is required');
    if (!description.trim()) return setError('Description is required');
    if (!imageFile) return setError('Image is required');
    if (endBeforeStart) return setError('End date must be equal to or after start date');
    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('description', description.trim());
      formData.append('image', imageFile);
      if (departmentId) formData.append('department', departmentId);
      if (startDate) formData.append('startDate', new Date(startDate).toISOString());
      if (endDate) formData.append('endDate', new Date(endDate).toISOString());
      const base = (apiClient as any).baseUrl || '/api';
      const token = apiClient.getToken();
      const res = await fetch(base + '/courses/registrar', {
        method: 'POST',
        headers: token ? { Authorization: 'Bearer ' + token } : undefined,
        body: formData
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Failed to create course');
      }
      await res.json();
      setName('');
      setDescription('');
      setDepartmentId('');
      setStartDate('');
      setEndDate('');
      setImageFile(null);
      setSuccess('Course created successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to create course');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-2 h-screen flex items-center justify-center">
      <Card className="md:w-4xl mx-auto bg-transparent border-0">
        <CardHeader>
          <CardTitle>Create Course</CardTitle>
          <CardDescription>Registrar can create a new course. Fields marked with * are required.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
          {success && <div className="mb-3 text-sm text-green-600">{success}</div>}
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Course name" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="description">Description *</Label>
              <Textarea id="description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the course" />
            </div>
            <div className="space-y-1">
              <Label>Department</Label>
              <Select value={departmentId} onValueChange={(v) => setDepartmentId(v === 'none' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder={depsLoading ? 'Loading...' : 'Select a department'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {departments.map((d: Department) => (
                    <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {depsError && <p className="text-xs text-red-600">Failed to load departments</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="start">Start Date</Label>
                <Input id="start" type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="end">End Date</Label>
                <Input id="end" type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                {endBeforeStart && <p className="text-xs text-red-600">End date must be equal to or after start date</p>}
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="image">Image *</Label>
              <Input id="image" type="file" accept="image/*" onChange={onFileChange} />
              {imageFile && <p className="text-xs text-muted-foreground">{imageFile.name}</p>}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setName(''); setDescription(''); setDepartmentId(''); setStartDate(''); setEndDate(''); setImageFile(null); setError(null); setSuccess(null); }}>Clear</Button>
              <Button type="submit" disabled={submitting}>{submitting ? 'Creating…' : 'Create Course'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
