
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from '@/lib/apiClient';

export type MetricPoint = { name: string; value: number };

// Build a synthetic usage series until backend analytics exist
const buildUsageSeries = (activeUsers: number): MetricPoint[] => {
  const base = Math.max(10, Math.round(activeUsers * 0.6));
  const steps = [base, base + 5, base + 12, base + 18, base + 22, base + 30, activeUsers];
  const labels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  return labels.map((l,i) => ({ name: l, value: steps[i] || activeUsers }));
};
export default function AdminDashboard() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeUsers, setActiveUsers] = useState(0);
    const [departmentCount, setDepartmentCount] = useState(0);
    const [examCount, setExamCount] = useState(0);
  const requestsToday = 0; // placeholder (no endpoint yet)
    const [deptChart, setDeptChart] = useState<{ name: string; value: number }[]>([]);

    useEffect(() => {
      let cancelled = false;
      (async () => {
        try {
          setLoading(true); setError(null);
          const [users, departments, exams] = await Promise.all([
            apiClient.listUsers().catch(() => []),
            apiClient.listDepartments().catch(() => []),
            // No dedicated listAllExams; reuse teacher upcoming exams for count approximation.
            apiClient.listMyUpcomingExams().catch(() => ({ exams: [] })),
          ]);
          if (cancelled) return;
          setActiveUsers(users.length || 0);
          setDepartmentCount(departments.length || 0);
          const upcoming = (exams as any).exams || [];
          setExamCount(upcoming.length || 0);
          // Department distribution: users per department id
          const deptMap: Record<string, number> = {};
          (users as any[]).forEach(u => { if (u.department) deptMap[u.department] = (deptMap[u.department] || 0) + 1; });
          const chart = Object.entries(deptMap).map(([name,value]) => ({ name: name.toString().slice(0,8), value }));
          setDeptChart(chart);
        } catch (e: any) {
          if (!cancelled) setError(e.message || 'Failed to load metrics');
        } finally { if (!cancelled) setLoading(false); }
      })();
      return () => { cancelled = true; };
    }, []);

  const usageData = buildUsageSeries(activeUsers);
  const departmentData = deptChart.length ? deptChart : [{ name: 'N/A', value: 0 }];

    return (
      <div className="p-6 h-screen overflow-y-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Key metrics and usage overview</p>
        </div>
        {loading && <div className="text-sm text-muted-foreground">Loading metrics…</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Active Users" value={String(activeUsers)} />
          <StatCard label="Departments" value={String(departmentCount)} />
          <StatCard label="Requests Today" value={String(requestsToday)} />
          <StatCard label="Total Exams" value={String(examCount)} />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Weekly Active Users</CardTitle>
              <CardDescription>Fabricated trend (needs real analytics endpoint)</CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={usageData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="value" name="Users" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Users by Department</CardTitle>
              <CardDescription>Current distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" name="Users" fill="#10b981" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }


function StatCard(props: { label: string; value: string; delta?: string }) {
  const positive = props.delta?.trim().startsWith("+");
  return (
    <Card className="p-4">
      <CardHeader className="p-0">
        <CardDescription>{props.label}</CardDescription>
        <CardTitle className="text-2xl">{props.value}</CardTitle>
      </CardHeader>
      {props.delta && (
        <CardContent className="p-0">
          <div className={`text-sm ${positive ? "text-emerald-500" : "text-red-600"}`}>
            {props.delta} from last period
          </div>
        </CardContent>
      )}
    </Card>
  );
}
