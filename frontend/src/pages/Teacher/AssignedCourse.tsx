
import { useState, useMemo } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useNavigate } from 'react-router';
import { useMyCourses } from '@/hooks/useApiData';

interface CourseDocLike {
  _id: string;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: boolean;
  assignedTeacher?: any;
  createdBy?: any;
}

export default function AssignedCourse() {
  const { data: courses = [], isLoading: loading, error } = useMyCourses();
  const [q, setQ] = useState('');
  const navigate = useNavigate();

  const filtered = useMemo(() => (courses as CourseDocLike[]).filter(c => !q || c.name?.toLowerCase().includes(q.toLowerCase())), [courses, q]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-center gap-4 justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">My Courses</h1>
          <p className="text-sm text-muted-foreground">Courses you created or are assigned to. Manage their modules.</p>
        </div>
        <Input placeholder="Search course..." value={q} onChange={e => setQ(e.target.value)} className="w-full md:w-64" />
      </div>
  {loading && <div className="text-sm text-muted-foreground">Loading courses...</div>}
  {error && <div className="text-sm text-red-600">{(error as any).message || 'Error loading courses'}</div>}
  {!loading && !error && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {filtered.map(course => {
            const now = Date.now();
            const start = course.startDate ? new Date(course.startDate).getTime() : undefined;
            const end = course.endDate ? new Date(course.endDate).getTime() : undefined;
            let phase: 'upcoming' | 'active' | 'ended' | 'unscheduled' = 'unscheduled';
            if (start && end) {
              if (now < start) phase = 'upcoming'; else if (now > end) phase = 'ended'; else phase = 'active';
            }
            const phaseColor: Record<typeof phase, string> = {
              upcoming: 'bg-amber-500/15 text-amber-600 border border-amber-500/30',
              active: 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30',
              ended: 'bg-rose-500/15 text-rose-600 border border-rose-500/30',
              unscheduled: 'bg-slate-500/15 text-slate-600 border border-slate-500/30'
            };
            return (
              <Card key={course._id} className="p-5 flex flex-col gap-4 bg-gradient-to-br from-background to-muted/40 shadow-sm hover:shadow-md transition relative">
                <div className="space-y-1 pr-6">
                  <h2 className="font-semibold leading-snug line-clamp-2">{course.name}</h2>
                  <p className="text-xs text-muted-foreground line-clamp-3">{course.description || 'No description provided.'}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-[10px] font-medium">
                  <span className={`px-2 py-0.5 rounded ${phaseColor[phase]}`}>{phase}</span>
               </div>
                <div className="flex items-center justify-between mt-auto gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/teacher/course/${course._id}/modules`)}>Edit Modules</Button>
                  <Button size="sm" variant="ghost" onClick={() => navigate(`/teacher/exam/create/${course._id}`)}>Create Exam</Button>
                </div>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full text-sm text-muted-foreground border rounded-md p-6 text-center">No courses match your search.</div>
          )}
        </div>
      )}
    </div>
  );
}
