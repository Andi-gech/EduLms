import { useMemo, useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useNavigate } from 'react-router';
import { Input } from '../../components/ui/input';
import { BarChart3, ClipboardCheck, Clock, ListChecks } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

interface ExamOverviewItem { examId: string; title: string; total: number; graded: number; pending: number; inProgress: number; totalMarks?: number; avgPercent?: number; gradedPercent?: number }

// We'll transform backend aggregated items into the existing UI row shape.

export default function ExamSubmissionsOverview() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showOnlyActionable, setShowOnlyActionable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<ExamOverviewItem[]>([]);

  useEffect(() => {
    setLoading(true); setError(null);
    apiClient.listExamSubmissionsOverview()
      .then(items => {
        // Use backend aggregated counts directly; avoid synthesizing pseudo submission rows which caused inflated counts.
        const mapped: ExamOverviewItem[] = items.map((e: any) => ({
          examId: e.examId,
          title: e.title,
          total: e.total || 0,
          graded: e.graded || 0,
          pending: e.pending || 0,
          inProgress: e.inProgress || 0,
          totalMarks: e.totalMarks || 0,
          avgPercent: e.avgPercent || 0,
          gradedPercent: e.gradedPercent || (e.total ? (e.graded / e.total) * 100 : 0)
        }));
        setOverview(mapped);
      })
      .catch(err => setError(err.message || 'Failed to load overview'))
      .finally(() => setLoading(false));
  }, []);

  const exams = useMemo(() => overview.map(e => ({
    ...e,
    gradedPercent: e.gradedPercent ?? (e.total ? (e.graded / e.total) * 100 : 0),
    avgPercentDisplay: typeof e.avgPercent === 'number' ? e.avgPercent.toFixed(1) : '0.0'
  })), [overview]);

  const filtered = exams.filter(e =>
    (!search || e.title.toLowerCase().includes(search.toLowerCase())) &&
    (!showOnlyActionable || e.pending > 0 || e.inProgress > 0)
  );

  const totals = useMemo(() => {
    return exams.reduce((acc, e) => {
      acc.total += e.total;
      acc.graded += e.graded;
      acc.pending += e.pending;
      acc.inProgress += e.inProgress;
      return acc;
    }, { total: 0, graded: 0, pending: 0, inProgress: 0 });
  }, [exams]);

  const gradedOverallPct = totals.total ? Math.round((totals.graded / totals.total) * 100) : 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {loading && <div className="text-sm text-muted-foreground">Loading...</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start gap-4 justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Exam Submissions</h1>
            <p className="text-sm text-muted-foreground">Monitor grading progress and drill into individual submissions.</p>
          </div>
          <div className="flex gap-2 items-center w-full md:w-auto">
            <Input placeholder="Search exams..." value={search} onChange={e => setSearch(e.target.value)} className="w-full md:w-60" />
            <Button type="button" variant={showOnlyActionable ? 'default' : 'outline'} onClick={() => setShowOnlyActionable(v => !v)} className="whitespace-nowrap text-xs md:text-sm">
              {showOnlyActionable ? 'Showing Actionable' : 'Actionable Only'}
            </Button>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <SummaryTile icon={BarChart3} label="Total Submissions" value={totals.total} accent="from-slate-500 to-slate-700" />
            <SummaryTile icon={ClipboardCheck} label="Graded" value={totals.graded} extra={`${gradedOverallPct}%`} accent="from-emerald-500 to-emerald-600" />
          <SummaryTile icon={Clock} label="Pending" value={totals.pending} accent="from-amber-500 to-amber-600" />
          <SummaryTile icon={ListChecks} label="In-Progress" value={totals.inProgress} accent="from-blue-500 to-blue-600" />
        </div>
        <div className="w-full h-2 rounded bg-muted overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600" style={{ width: `${gradedOverallPct}%` }} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
  {filtered.map(exam => {
          const gradedPct = Math.round(exam.gradedPercent || 0);
          console.log(exam);
          const pendingPct = exam.total ? Math.round((exam.pending / exam.total) * 100) : 0;
          const inProgPct = exam.total ? Math.round((exam.inProgress / exam.total) * 100) : 0;
          return (
            <Card key={exam.examId} className="relative group p-5 flex flex-col gap-4 border-muted/40 bg-gradient-to-br from-background to-muted/40 hover:shadow-lg transition shadow-sm overflow-hidden">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.05),transparent_70%)] pointer-events-none" />
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 pr-2">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Exam</div>
                  <div className="font-semibold text-base leading-tight line-clamp-2">{exam.title}</div>
                </div>
                <div className="flex flex-col text-[10px] gap-1 items-end mt-1">
                  <StatusBadge tone="emerald" label="Graded" value={exam.graded} />
                  <StatusBadge tone="amber" label="Pending" value={exam.pending} />
                  <StatusBadge tone="blue" label="In-Progress" value={exam.inProgress} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Avg Score</span>
                  <span className="font-mono text-xs">{exam.avgPercentDisplay}%</span>
                </div>
                <div className="w-full h-2 rounded bg-muted flex overflow-hidden ring-1 ring-border/50">
                  <div className="h-full bg-emerald-500" style={{ width: `${gradedPct}%` }} title={`Graded ${gradedPct}%`} />
                  <div className="h-full bg-amber-500" style={{ width: `${pendingPct}%` }} title={`Pending ${pendingPct}%`} />
                  <div className="h-full bg-blue-500" style={{ width: `${inProgPct}%` }} title={`In-Progress ${inProgPct}%`} />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{gradedPct}% graded</span>
                  <span>{pendingPct}% pending</span>
                  <span>{inProgPct}% in-progress</span>
                </div>
              </div>
              <div className="mt-auto flex gap-2 pt-2">
                <Button size="sm" className="" onClick={() => navigate(`/teacher/exams/${exam.examId}/submissions`)}>View Submissions</Button>
                <Button size="sm" variant="outline" onClick={() => navigate(`/teacher/exam/view/${exam.examId}`)}>Exam</Button>
              </div>
            </Card>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <div className="text-sm text-muted-foreground border rounded-md p-6 text-center">No exams match your filters.</div>
      )}
  <div className="text-[11px] text-muted-foreground pt-2">Live aggregated data. Use filters to refine; click a card to drill down.</div>
    </div>
  );
}

interface StatusBadgeProps { tone: 'emerald' | 'amber' | 'blue'; label: string; value: number }
function StatusBadge({ tone, label, value }: StatusBadgeProps) {
  const palette: Record<string, string> = {
    emerald: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    amber: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    blue: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
  };
  return (
    <div className={`px-1.5 py-0.5 rounded border text-[10px] font-medium leading-none ${palette[tone]}`}>{label}: {value}</div>
  );
}

interface SummaryTileProps { icon: any; label: string; value: number; extra?: string; accent: string }
function SummaryTile({ icon: Icon, label, value, extra, accent }: SummaryTileProps) {
  return (
    <Card className="p-4 flex flex-col gap-2 relative overflow-hidden group">
      <div className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-10 group-hover:opacity-20 transition pointer-events-none`} />
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="w-4 h-4 opacity-70" /> {label}
      </div>
      <div className="text-2xl font-semibold tracking-tight leading-tight">{value}</div>
      {extra && <div className="text-xs text-muted-foreground">{extra} graded</div>}
    </Card>
  );
}
