import React from 'react';
import { useNavigate, useParams } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCourseResult } from '@/hooks/useApiData';
import { Trophy, ChevronLeft } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const Result: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: result, isLoading } = useCourseResult(id);

  if (!id) return <div className="p-8 text-center text-sm">Invalid course id</div>;
  if (isLoading) return <div className="p-8 text-center text-sm text-muted-foreground">Loading result...</div>;

  if (!result) {
    return (
      <div className="min-h-screen px-4 py-8 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardDescription>No result available</CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => navigate('/exams')}>Back to Exams</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const marks = result.totalMark ?? 0;
  const passed = result.isPassed;

 const calculateGrade = (() => {
  if (marks >= 90) return 'A';
  if (marks >= 80) return 'B';
  if (marks >= 70) return 'C';
  if (marks >= 60) return 'D';
  return 'F';
})();


  return (
    <div className="h-screen overflow-y-auto px-4 py-8 flex items-start justify-center">
      <div className="w-full max-w-4xl">
        <Card className="mb-6 bg-transparent border-0">
          <CardHeader className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="px-2">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <CardTitle className="text-xl flex items-center gap-2">
                <Trophy className="w-5 h-5 text-indigo-500" /> {result?.course.name || 'Result'}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary Table */}
            <Table>
              <TableHeader>
                <TableRow>
                
                  <TableHead>Status</TableHead>
                  <TableHead>Approved</TableHead>
                  <TableHead>Total Marks</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Graded Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                
                  <TableCell>{passed ? 'Passed' : 'Failed'}</TableCell>
                  <TableCell>{result.approved ? 'Approved' : 'Not Approved'}</TableCell>
                  <TableCell>{marks}</TableCell>
                  <TableCell>{calculateGrade}</TableCell>
                  <TableCell>{result.date ? new Date(result.date).toLocaleString() : '—'}</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            {/* Assignments Table */}
            <div className="font-semibold mt-8 mb-2">Assignments</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Mark</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.assignments && result.assignments.length > 0 ? (
                  result.assignments.map((a, idx) => {
                    const assignmentObj = typeof a.assignment === 'object' ? (a.assignment as any) : null;
                    return (
                      <TableRow key={assignmentObj ? assignmentObj._id : a.assignment || idx}>
                        <TableCell>{assignmentObj ? assignmentObj.title : `Assignment ID: ${a.assignment}`}</TableCell>
                        <TableCell>{assignmentObj ? assignmentObj.points : '-'}</TableCell>
                        <TableCell>{a.mark ?? '-'}</TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground">No assignments graded.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Exams Table */}
            <div className="font-semibold mt-8 mb-2">Exams</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Mark</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.exams && result.exams.length > 0 ? (
                  result.exams.map((e, idx) => {
                    const examObj = typeof e.exam === 'object' ? (e.exam as any) : null;
                    return (
                      <TableRow key={examObj ? examObj._id : e.exam || idx}>
                        <TableCell>{examObj ? examObj.title : `Exam ID: ${e.exam}`}</TableCell>
                        <TableCell>{e.mark}/{examObj ? examObj.ExamMark : 0}</TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-muted-foreground">No exams graded.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => navigate('/exams')}>Back to Exams</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );

}
export default Result;
