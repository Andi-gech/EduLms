import { useState } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useNavigate } from 'react-router';
import { BookOpen, FileText, ListChecks, GraduationCap, AlarmClock } from 'lucide-react';
import type { QuickLinkItem as QuickLink } from '@/types/domain';
import { mockTeacherOverview } from '@/mocks'; // retained for fallback messaging
import { useTeacherOverview } from '@/hooks/useApiData';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';

// Dummy aggregation leveraging existing teacher pages (replace with API later)
export default function TeacherOverview() {
  const navigate = useNavigate();

  const { data: overview, isLoading, error } = useTeacherOverview();
  console.log(overview);
  const stats = (overview && overview.summary) || (mockTeacherOverview as any).summary || { assignedCourses:0, approvedExams:0, pendingExamApprovals:0, rejectedExams:0, upcomingExams:0, pendingGrading:0, assignments:0, unreadNotifications:0 };

  const quickLinks: QuickLink[] = [
    { label: 'Manage Courses', icon: BookOpen, to: '/teacher/assignedCourses', desc: 'Edit modules & ordering.' },
    { label: 'Submissions', icon: ListChecks, to: '/teacher/exams/submissions', desc: 'Review exam submissions.' },
    { label: 'Assignments', icon: GraduationCap, to: '/teacher/assignments', desc: 'Create & grade assignments.' },
    { label: 'Create Exam', icon: FileText, to: '/teacher/exam/create', desc: 'Prepare a new exam.' },
  ];

  return (
    <div className="p-6 space-y-6 h-screen overflow-y-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Teacher Overview</h1>
        <p className="text-sm text-muted-foreground">Snapshot of your teaching activity & quick actions.</p>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
        {[
          { label: 'Assigned Courses', value: stats.assignedCourses },
          { label: 'Approved Exams', value: stats.approvedExams },
          { label: 'Pending Exams', value: stats.pendingExamApprovals || 0 },
          { label: 'Rejected Exams', value: stats.rejectedExams || 0 },
          { label: 'Upcoming Exams', value: stats.upcomingExams },
          { label: 'Pending Grading', value: stats.pendingGrading },
          { label: 'Assignments', value: stats.assignments },
          { label: 'Notifications', value: stats.unreadNotifications },
        ].map((t: { label: string; value: number }, i: number) => (
          <SummaryTile key={t.label} label={t.label} value={t.value} index={i} />
        ))}
      </div>
    {isLoading && <div className="text-xs text-muted-foreground">Loading dashboard...</div>}
    {error && <div className="text-xs text-red-600">Failed to load live data; showing mock fallback.</div>}
  <ChartsSection overview={overview} />
  <QuickLinks links={quickLinks} onNavigate={to => navigate(to)} />
  <RecentActivity items={overview?.recentActivity || mockTeacherOverview.recentActivity} />

    <div className="text-[10px] text-muted-foreground">{overview ? 'Live data aggregated (some charts may be empty until analytics endpoints exist).' : 'Mock data mode.'}</div>
    </div>
  );
}

function SummaryTile({ label, value, index = 0 }: { label: string; value: number; index?: number }) {
  const gradients = [
    'from-indigo-500 via-sky-500 to-cyan-400',
    'from-emerald-500 to-lime-400',
    'from-fuchsia-500 via-pink-500 to-rose-400',
    'from-amber-500 to-orange-400',
    'from-blue-600 to-indigo-500',
    'from-slate-600 to-slate-400',
  ];
  const g = gradients[index % gradients.length];
  return (
    <Card className="relative overflow-hidden p-3 flex flex-col gap-1 border border-border/40">
      <div className={`absolute inset-0 bg-gradient-to-br ${g} opacity-90`} />
      <div className="absolute inset-0 backdrop-[2px] mix-blend-multiply" />
      <div className="relative flex flex-col gap-1 text-white drop-shadow-sm">
        <span className="text-[11px] uppercase tracking-wide/relaxed font-medium opacity-90">{label}</span>
        <span className="text-xl font-semibold tabular-nums leading-tight">{value}</span>
      </div>
    </Card>
  );
}

function QuickLinks({ links, onNavigate }: { links: QuickLink[]; onNavigate: (to: string) => void }) {
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
      {links.map(l => (
        <Card key={l.to} className="p-4 flex flex-col gap-3 hover:shadow-sm transition group cursor-pointer bg-gradient-to-br from-background to-muted/20" onClick={() => onNavigate(l.to)}>
          <div className="flex items-start gap-3">
            <l.icon className="w-5 h-5 text-primary group-hover:scale-110 transition" />
            <div className="flex flex-col">
              <h3 className="font-medium leading-tight text-sm">{l.label}</h3>
              <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{l.desc}</p>
            </div>
          </div>
          <div>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => onNavigate(l.to)}>Open</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function RecentActivity({ items }: { items: { id: any; type: string; text: string; time: string }[] }) {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Recent Activity</h2>
        <AlarmClock className="w-4 h-4 text-muted-foreground" />
      </div>
      <ul className="space-y-2">
        {items.map(i => (
          <li key={i.id} className="text-xs flex items-start gap-2">
            <span className="w-2 h-2 mt-1 rounded-full bg-primary/60" />
            <span className="leading-snug flex-1">
              {i.text}
              <span className="block text-[10px] text-muted-foreground mt-0.5">{i.time}</span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// Chart section (dummy data mirroring admin style but teacher-centric)
// Reusable simple chart card
function ChartCard({ title, subtitle, height = 300, children }: { title: string; subtitle?: string; height?: number; children: React.ReactNode }) {
  return (
    <Card className="h-full flex flex-col">
      <div className="p-4 pb-0 space-y-0.5">
        <h3 className="text-sm font-medium leading-tight">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="p-2 grow" style={{ height }}>
        {children}
      </div>
    </Card>
  );
}

function ChartsSection({ overview }: { overview: any }) {
  const fromMock = !overview;
  const { courses, submissionSeries, contentApproval, examStatus, gradingBreakdown, examOutcomesLatest } = overview || mockTeacherOverview;
  const [courseFilter, setCourseFilter] = useState<string>('c1');
  const engagement = submissionSeries[courseFilter as keyof typeof submissionSeries];
  const COLORS_A = ['#10b981', '#f59e0b', '#ef4444'];
  const COLORS_B = ['#3b82f6', '#6366f1', '#8b5cf6'];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-medium">Exam Submissions</h2>
        <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)} className="text-xs border rounded px-2 py-1 bg-background">
          {courses.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
  <span className="text-[10px] text-muted-foreground">Filtered • {courses.find((c: any) => c.id === courseFilter)?.name}</span>
      </div>
  <div className="grid gap-4 xl:grid-cols-4">
        <div className="xl:col-span-2">
          <ChartCard title="Weekly Engagement" subtitle="Attempts vs Graded">
            <ResponsiveContainer width="100%" height="100%">
      <LineChart data={engagement || []} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="attempts" stroke="#3b82f6" name="Attempts" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="graded" stroke="#10b981" name="Graded" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
  <ChartCard title="Content Approval" subtitle={fromMock ? 'Mock dataset' : 'Modules by status'} height={260}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={contentApproval} dataKey="value" nameKey="name" innerRadius={40} outerRadius={60} paddingAngle={2}>
                {contentApproval.map((_: any, i: number) => <Cell key={i} fill={COLORS_A[i % COLORS_A.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
  <ChartCard title="Exam Status" subtitle={fromMock ? 'Mock dataset' : 'Lifecycle distribution'} height={260}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={examStatus} dataKey="value" nameKey="name" innerRadius={40} outerRadius={60} paddingAngle={2}>
                {examStatus.map((_: any, i: number) => <Cell key={i} fill={COLORS_B[i % COLORS_B.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
  <div className="grid gap-4 md:grid-cols-2">
        <ChartCard title="Grading Progress" subtitle="Assignment workload" height={260}>
          <ResponsiveContainer width="100%" height="100%">
    <BarChart data={gradingBreakdown || []} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" name="Count" fill="#6366f1" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
  <ChartCard title="Exam Outcomes (Latest)" subtitle={fromMock ? 'Mock dataset' : 'Pass / Fail / Review'} height={260}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie dataKey="value" nameKey="name" data={examOutcomesLatest} innerRadius={45} outerRadius={70} paddingAngle={2}>
                {examOutcomesLatest.map((_: any, i: number) => <Cell key={i} fill={['#10b981','#ef4444','#f59e0b'][i]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
