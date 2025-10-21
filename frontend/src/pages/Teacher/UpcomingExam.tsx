import { useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMyUpcomingExams } from '@/hooks/useApiData';

export default function UpcomingExam() {
  const navigate = useNavigate();
  const { data: exams = [], isLoading, error } = useMyUpcomingExams();
  const fmt = (d?: string) => d ? new Date(d).toLocaleString() : '-';

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Exams</h1>
            <p className="text-muted-foreground">Upcoming and active exams you created</p>
          </div>
        </div>

        <Card className="border-none bg-background">
          <CardHeader>
            <CardTitle>Upcoming / Active Exams</CardTitle>
            <CardDescription>Status computed server-side</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && <div className="text-sm text-muted-foreground">Loading...</div>}
            {error && !isLoading && <div className="text-sm text-red-600">Failed to load exams</div>}
            {!isLoading && !error && exams.length === 0 && (
              <div className="text-sm text-muted-foreground">No upcoming or active exams.</div>
            )}
            {!isLoading && !error && exams.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left">Title</th>
                      <th className="p-2 text-left">Module</th>
                      <th className="p-2 text-left">Exam Date</th>
                      <th className="p-2 text-left">Start</th>
                      <th className="p-2 text-left">End</th>
                      <th className="p-2 text-left">Status</th>
                      <th className="p-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
        {exams.map((e:any) => (
                      <tr key={e._id} className="border-t">
                        <td className="p-2 font-medium">{e.title}</td>
                        <td className="p-2">{e.moduleName || '-'}</td>
                        <td className="p-2">{fmt(e.examDate)}</td>
                        <td className="p-2">{fmt(e.startTime)}</td>
                        <td className="p-2">{fmt(e.endTime)}</td>
                        <td className="p-2">
          {e.status === 'upcoming' && <Badge variant="secondary" className="bg-blue-500/90 text-white border-blue-500">Upcoming</Badge>}
          {e.status === 'active' && <Badge variant="secondary" className="bg-green-500/90 text-white border-green-500">Active</Badge>}
          {e.status === 'ended' && <Badge variant="secondary" className="bg-gray-500/90 text-white border-gray-500">Ended</Badge>}
                        </td>
                        <td className="p-2 flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => navigate(`/teacher/exam/view/${e._id}`)}>View</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
