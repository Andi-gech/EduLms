
import { useMemo, useState } from 'react';
import { useUsers, useDepartments } from '@/hooks/useApiData';
import type { UserDoc, DepartmentDoc } from '@/types/domain';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Using backend domain types (UserDoc / DepartmentDoc). Adding 'admin' UI-only extension for consistency.
type UIUser = UserDoc & { role: UserDoc['role'] | 'admin'; active?: boolean };

export default function UserStatistics() {
  // Live data
  const { data: usersData = [], isLoading: usersLoading, error: usersError } = useUsers();
  const { data: departments = [], isLoading: depsLoading, error: depsError } = useDepartments();
  // Map backend users to UI shape; backend has 'status' boolean for active state
  const users: UIUser[] = useMemo(() => {
    return (usersData as UserDoc[]).map(u => ({ ...u, active: u.status }));
  }, [usersData]);

  // Filters
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    return users.filter(u => {
      const matchesRole = roleFilter === 'all' ? true : u.role === roleFilter;
      const matchesDept = deptFilter === 'all' ? true : (deptFilter === 'none' ? !u.department : u.department === deptFilter);
      return matchesRole && matchesDept;
    });
  }, [users, roleFilter, deptFilter]);

  const totals = useMemo(() => {
    const total = filtered.length;
    const active = filtered.filter(u => u.active).length;
    const inactive = total - active;
    const byRole = filtered.reduce<Record<string, number>>((acc, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc; }, {});
    const byDept = filtered.reduce<Record<string, number>>((acc, u) => { const k = u.department || 'none'; acc[k] = (acc[k] || 0) + 1; return acc; }, {});
    const activePct = total === 0 ? 0 : Math.round((active / total) * 100);
    return { total, active, inactive, byRole, byDept, activePct };
  }, [filtered]);

  const roleLabels: Array<UIUser['role']> = ['student','teacher','Registrar','department_head','department_admin'];
  const roleColors: Record<string, string> = {
    student: '#3b82f6', // blue-500
    teacher: '#8b5cf6', // violet-500
    Registrar: '#f59e0b', // amber-500
    department_head: '#10b981', // emerald-500
    department_admin: '#ef4444', // red-500
  };
  const niceLabel = (s: string) => s.replace('_',' ');

  // Simple charts (inline SVGs)
  const Donut = ({ percent = 0, size = 120, stroke = 12, fg = '#16a34a', bg = '#e5e7eb' }: { percent?: number; size?: number; stroke?: number; fg?: string; bg?: string }) => {
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const dash = Math.max(0, Math.min(100, percent)) / 100 * circumference;
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Active ${percent}%`}>
        <circle cx={size/2} cy={size/2} r={radius} stroke={bg} strokeWidth={stroke} fill="none" />
        <circle
          cx={size/2}
          cy={size/2}
          r={radius}
          stroke={fg}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference-dash}`}
          transform={`rotate(-90 ${size/2} ${size/2})`}
        />
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="fill-foreground" fontSize={14} fontWeight={600}>
          {percent}%
        </text>
      </svg>
    );
  };

  // removed HBar (was only used in duplicate summaries section)

  // Extra visualizations
  const PieChart = ({ data, size = 160, centerLabel }: { data: Array<{ label: string; value: number; color?: string }>; size?: number; centerLabel?: string }) => {
    const total = Math.max(0, data.reduce((sum, d) => sum + d.value, 0));
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2;
    let start = -Math.PI / 2; // start at top
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Pie chart">
        {total === 0 ? (
          <circle cx={cx} cy={cy} r={r} fill="#e5e7eb" />
        ) : (
          data.map((d, i) => {
            const slice = (d.value / total) * (Math.PI * 2);
            const end = start + slice;
            const x1 = cx + r * Math.cos(start);
            const y1 = cy + r * Math.sin(start);
            const x2 = cx + r * Math.cos(end);
            const y2 = cy + r * Math.sin(end);
            const largeArc = slice > Math.PI ? 1 : 0;
            const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
            start = end;
            return <path key={i} d={path} fill={d.color || '#6366f1'} />;
          })
        )}
        {centerLabel && (
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize={12} fontWeight={600} className="fill-foreground">
            {centerLabel}
          </text>
        )}
      </svg>
    );
  };

  const VBarChart = ({ data, max, barColor = '#2563eb' }: { data: Array<{ label: string; value: number; color?: string }>; max?: number; barColor?: string }) => {
    const m = max ?? Math.max(1, ...data.map(d => d.value));
    return (
      <div className="flex items-end gap-3">
        {data.map((d) => {
          const pct = Math.round((d.value / m) * 100);
          const color = d.color || barColor;
          return (
            <div key={d.label} className="flex flex-col items-center gap-1">
              <div className="w-6 h-32 bg-muted relative overflow-hidden rounded">
                <div className="absolute bottom-0 w-full" style={{ height: `${pct}%`, backgroundColor: color }} />
              </div>
              <div className="text-[10px] truncate max-w-[3.5rem] text-muted-foreground">{d.label}</div>
              <div className="text-[10px] tabular-nums">{d.value}</div>
            </div>
          );
        })}
      </div>
    );
  };

  const StackedHBar = ({ rows, colorA = '#16a34a', colorB = '#e5e7eb' }: { rows: Array<{ label: string; a: number; b: number }>; colorA?: string; colorB?: string }) => {
    return (
      <div className="space-y-2">
        {rows.map(row => {
          const total = row.a + row.b;
          const aPct = total === 0 ? 0 : (row.a / total) * 100;
          const bPct = 100 - aPct;
          return (
            <div key={row.label} className="grid grid-cols-5 items-center gap-2">
              <div className="col-span-2 truncate text-xs text-muted-foreground">{row.label}</div>
              <div className="col-span-2 h-2 rounded bg-muted overflow-hidden">
                <div className="h-2" style={{ width: `${aPct}%`, backgroundColor: colorA, display: 'inline-block' }} />
                <div className="h-2" style={{ width: `${bPct}%`, backgroundColor: colorB, display: 'inline-block' }} />
              </div>
              <div className="text-right text-xs tabular-nums">{row.a}/{total}</div>
            </div>
          );
        })}
      </div>
    );
  };

  const byRoleStatus = useMemo(() => {
    const map = filtered.reduce((acc, u) => {
      const r = u.role;
      if (!acc[r]) acc[r] = { active: 0, inactive: 0, total: 0 };
      acc[r].total += 1;
      if (u.active) acc[r].active += 1; else acc[r].inactive += 1;
      return acc;
  }, {} as Record<string, { active: number; inactive: number; total: number }>);
  return roleLabels.map(r => ({ role: r, ...(map[r] || { active: 0, inactive: 0, total: 0 }) }));
  }, [filtered]);


  return (
    <div className="space-y-3 h-screen overflow-y-auto p-3 sm:p-4">
      <Card className='bg-transparent border-0'>
        <CardHeader className="flex-row items-center justify-between py-2 px-2 sm:px-0">
          <div >
            <CardTitle>User Statistics</CardTitle>
            <CardDescription>Overview of users by status, role, and department</CardDescription>
          </div>
          <Badge variant="secondary">{usersLoading ? 'Loading…' : `${filtered.length} of ${users.length} users`}</Badge>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-2">
            <div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={'Filter by role'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
      {roleLabels.map(r => (
                    <SelectItem key={r} value={r}>{niceLabel(r)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className="h-9">
      <SelectValue placeholder={depsLoading ? 'Loading departments' : 'Filter by department'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  <SelectItem value="none">No department</SelectItem>
      {departments.map((d: DepartmentDoc) => (
                    <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
    {(usersError || depsError) && (<div className="mb-3 text-sm text-red-600">Failed to load {usersError ? 'users' : ''} {depsError ? 'departments' : ''}</div>)}

          {/* Visualizations */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-base">Pie • Users by Role</CardTitle>
                <CardDescription>Proportion of users across roles</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-4">
                <PieChart
                  data={roleLabels.map(r => ({ label: niceLabel(r), value: totals.byRole[r] || 0, color: roleColors[r] }))}
                  size={160}
                  centerLabel={`${totals.total}`}
                />
                <div className="space-y-1 text-xs">
                  {roleLabels.map(r => (
                    <div key={r} className="flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-sm" style={{ background: roleColors[r] }} />
                      {niceLabel(r)}: {totals.byRole[r] || 0}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-base">Bars • Users by Department</CardTitle>
                <CardDescription>Counts per department</CardDescription>
              </CardHeader>
              <CardContent>
                <VBarChart
                  data={[{ label: 'None', value: totals.byDept['none'] || 0, color: '#10b981' }, ...departments.map(d => ({ label: d.name, value: totals.byDept[d._id] || 0, color: '#10b981' }))]}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-base">Stacked • Active vs Inactive by Role</CardTitle>
                <CardDescription>Share of active users per role</CardDescription>
              </CardHeader>
              <CardContent>
                <StackedHBar
                  rows={byRoleStatus.map(x => ({ label: niceLabel(x.role), a: x.active, b: x.inactive }))}
                />
                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-sm" style={{background:'#16a34a'}} /> Active</div>
                  <div className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-sm" style={{background:'#e5e7eb'}} /> Inactive</div>
                </div>
              </CardContent>
            </Card>
          </div>

        
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
            <Card >
              <CardHeader className="py-1 px-3"><CardDescription>Total Users</CardDescription></CardHeader>
              <CardContent className="px-3 pb-3 pt-0 text-xl font-semibold">{totals.total}</CardContent>
            </Card>
            <Card>
              <CardHeader className="py-1 px-3"><CardDescription>Active Users</CardDescription></CardHeader>
              <CardContent className="px-3 pb-3 pt-0 text-xl font-semibold">{totals.active}</CardContent>
            </Card>
            <Card>
              <CardHeader className="py-1 px-3"><CardDescription>Inactive Users</CardDescription></CardHeader>
              <CardContent className="px-3 pb-3 pt-0 text-xl font-semibold">{totals.inactive}</CardContent>
            </Card>
            <Card>
              <CardHeader className="py-1 px-3"><CardDescription>Active Ratio</CardDescription></CardHeader>
              <CardContent className="flex items-center gap-3 px-3 pb-3 pt-0">
                <Donut percent={totals.activePct} size={88} stroke={10} />
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-sm" style={{background:'#16a34a'}} /> Active: {totals.active}</div>
                  <div className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-sm" style={{background:'#e5e7eb'}} /> Inactive: {totals.inactive}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
