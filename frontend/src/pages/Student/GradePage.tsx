import React, { useState, Fragment } from 'react';
import { Table, TableBody,  TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronUp, Book, FileText, Award } from 'lucide-react';
import { useTranscript } from '@/hooks/useApiData';


const safePercent = (n: number, d: number) => (d ? (n / d) * 100 : 0);

interface TranscriptItem { courseId: string; courseName: string; assignmentEarned: number; assignmentTotal: number; examEarned: number; examTotal: number; combinedEarned: number; combinedTotal: number; combinedPct: number; assignments: { id: string; title: string; earned: number; total: number }[]; exams: { id: string; title: string; earned: number; total: number }[] }
const getGradeColor = (g: number) =>
  g >= 90
    ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
    : g >= 80
    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
    : g >= 70
    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
    : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
const getGradeLabel = (g: number) => g >= 90 ? 'A' : g >= 80 ? 'B' : g >= 70 ? 'C' : 'D';
const getPerformanceColor = (grade: number, max: number) => { const p = safePercent(grade, max); return p >= 90 ? 'bg-green-500' : p >= 80 ? 'bg-blue-500' : p >= 70 ? 'bg-yellow-500' : 'bg-red-500'; };



const GradePage: React.FC = () => {

  const [expandedCourse, setExpandedCourse] = useState<string | number | null>(null);

  const { data: transcript, isLoading: loading } = useTranscript();
  const courses: TranscriptItem[] = transcript || [];
  const toggleCourse = (id: string | number) => setExpandedCourse(prev => prev === id ? null : id);


  return (
    <div className="h-screen overflow-x-hidden px-2 py-4 md:px-4 md:py-8 transition-colors">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 md:mb-10 text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Academic Transcript</h1>
          <p className="mt-2 text-sm md:text-base text-gray-600 dark:text-gray-400">View your course grades and performance</p>
        </div>

      
        <div className="block md:hidden space-y-4">
          {loading && (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading transcript…</div>
          )}
          {!loading && courses.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">No grade data</div>
          )}
          {!loading && courses.map(course => {
            const assignPct = safePercent(course.assignmentEarned, course.assignmentTotal);
            const examPct = safePercent(course.examEarned, course.examTotal);
            const combinedPct = course.combinedPct;
            return (
              <div key={course.courseId} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Book className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <div className="font-medium text-base">{course.courseName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{course.courseId}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getGradeColor(assignPct)}`}>Assignments: {Math.round(assignPct)}%</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getGradeColor(examPct)}`}>Exam: {Math.round(examPct)}%</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getGradeColor(combinedPct)}`}>Total: {getGradeLabel(combinedPct)} {combinedPct.toFixed(1)}%</span>
                </div>
                <button className="w-full text-xs text-blue-600 dark:text-blue-400 underline mb-2" onClick={() => toggleCourse(course.courseId)}>
                  {expandedCourse === course.courseId ? 'Hide Details' : 'Show Details'}
                </button>
                {expandedCourse === course.courseId && (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
                      <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Grade Calculation</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                        Total = (Assignments: <span className="font-medium">{course.assignmentEarned}</span>/<span>{course.assignmentTotal || 0}</span>) + (Exams: <span className="font-medium">{course.examEarned}</span>/<span>{course.examTotal || 0}</span>) = <span className="font-medium">{course.combinedEarned}</span>/<span>{course.combinedTotal || 0}</span> = <span className="font-semibold text-gray-900 dark:text-gray-100">{course.combinedPct.toFixed(1)}%</span>
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="font-medium text-xs mb-1">Assignments</div>
                      {course.assignments.map(a => (
                        <div key={a.id} className="mb-2">
                          <div className="flex justify-between mb-1"><span className="text-xs font-medium text-gray-700 dark:text-gray-300">{a.title}</span><span className="text-xs font-medium text-gray-900 dark:text-gray-200">{a.earned}/{a.total}</span></div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2"><div className={`h-2 rounded-full ${getPerformanceColor(a.earned, a.total)}`} style={{ width: `${safePercent(a.earned, a.total)}%` }} /></div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <div className="font-medium text-xs mb-1">Exams</div>
                      {course.exams.map(e => (
                        <div key={e.id} className="mb-2">
                          <div className="flex justify-between mb-1"><span className="text-xs font-medium text-gray-700 dark:text-gray-300">{e.title}</span><span className="text-xs font-medium text-gray-900 dark:text-gray-200">{e.earned}/{e.total}</span></div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2"><div className={`h-2 rounded-full ${getPerformanceColor(e.earned, e.total)}`} style={{ width: `${safePercent(e.earned, e.total)}%` }} /></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="hidden md:block rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-800 transition-colors">
          <Table className="min-w-full">
            <TableHeader className="bg-gray-50 dark:bg-gray-800/60">
              <TableRow>
                <TableHead className="w-[40%] py-4 pl-6 text-gray-700 dark:text-gray-300">Course</TableHead>
                <TableHead className="text-center py-4 text-gray-700 dark:text-gray-300">Assignments</TableHead>
                <TableHead className="text-center py-4 text-gray-700 dark:text-gray-300">Exam</TableHead>
                <TableHead className="text-right pr-6 py-4 text-gray-700 dark:text-gray-300">Total Grade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">Loading transcript…</TableCell></TableRow>
              )}
              {!loading && courses.length === 0 && (
                <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">No grade data</TableCell></TableRow>
              )}
              {courses.map(course => {
                const assignPct = safePercent(course.assignmentEarned, course.assignmentTotal);
                const examPct = safePercent(course.examEarned, course.examTotal);
                const combinedPct = course.combinedPct;
                return (
                  <Fragment key={course.courseId}>
                    <TableRow className=" cursor-pointer border-b border-gray-100 dark:border-gray-800 transition-colors" onClick={() => toggleCourse(course.courseId)}>
                      <TableCell className="py-4 pl-6">
                        <div className="flex items-center text-gray-900 dark:text-gray-100">
                          <div className=" p-2 rounded-lg mr-4"><Book className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /></div>
                          <div>
                            <div className="font-medium">{course.courseName}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{course.courseId}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-4"><span className={`px-3 py-1 rounded-full text-sm font-medium ${getGradeColor(assignPct)}`}>{Math.round(assignPct)}%</span></TableCell>
                      <TableCell className="text-center py-4"><span className={`px-3 py-1 rounded-full text-sm font-medium ${getGradeColor(examPct)}`}>{Math.round(examPct)}%</span></TableCell>
                      <TableCell className="text-right pr-6 py-4 text-gray-900 dark:text-gray-100">
                        <div className="flex justify-end items-center">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium mr-2 ${getGradeColor(combinedPct)}`}>{getGradeLabel(combinedPct)}</span>
                          <span className="font-bold">{combinedPct.toFixed(1)}%</span>
                          <div className="ml-3">{expandedCourse === course.courseId ? <ChevronUp className="h-5 w-5 text-gray-500 dark:text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />}</div>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedCourse === course.courseId && (() => {
                      const combinedEarned = course.combinedEarned;
                      const combinedTotal = course.combinedTotal;
                      const combinedPct = course.combinedPct;
                      const assignEarned = course.assignmentEarned;
                      const assignTotal = course.assignmentTotal;
                      const examEarned = course.examEarned;
                      const examTotal = course.examTotal;
                      return (
                      <TableRow className="">
                        <TableCell colSpan={5} className="py-6 px-6 bg-gray-50/40 dark:bg-gray-900/30">
                          <div className="mb-6 p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Grade Calculation</h4>
                            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                              Total = (Assignments: <span className="font-medium">{assignEarned}</span>/<span>{assignTotal || 0}</span>) + (Exams: <span className="font-medium">{examEarned}</span>/<span>{examTotal || 0}</span>)
                              <span className="mx-2">=</span>
                              <span className="font-medium">{combinedEarned}</span>/<span>{combinedTotal || 0}</span>
                              <span className="mx-2">=</span>
                              <span className="font-semibold text-gray-900 dark:text-gray-100">{combinedPct.toFixed(1)}%</span>
                              <span className="mx-2">=</span>
                            </p>
                          </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className=" rounded-lg border border-gray-200 dark:border-gray-800 p-4  transition-colors">
                              <div className="flex items-center mb-4"><FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-2" /><h3 className="font-medium text-gray-900 dark:text-gray-100">Assignments</h3></div>
                              <div className="space-y-4">
                {course.assignments.map(a => (
                                  <div key={a.id}>
                  <div className="flex justify-between mb-1"><span className="text-sm font-medium text-gray-700 dark:text-gray-300">{a.title}</span><span className="text-sm font-medium text-gray-900 dark:text-gray-200">{a.earned}/{a.total}</span></div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2"><div className={`h-2 rounded-full ${getPerformanceColor(a.earned, a.total)}`} style={{ width: `${safePercent(a.earned, a.total)}%` }} /></div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className=" rounded-lg border border-gray-200 dark:border-gray-800 p-4  transition-colors">
                              <div className="flex items-center mb-4"><Award className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-2" /><h3 className="font-medium text-gray-900 dark:text-gray-100">Exams</h3></div>
                              <div className="space-y-4">
                {course.exams.map(e => (
                                  <div key={e.id}>
                  <div className="flex justify-between mb-1"><span className="text-sm font-medium text-gray-700 dark:text-gray-300">{e.title}</span><span className="text-sm font-medium text-gray-900 dark:text-gray-200">{e.earned}/{e.total}</span></div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2"><div className={`h-2 rounded-full ${getPerformanceColor(e.earned, e.total)}`} style={{ width: `${safePercent(e.earned, e.total)}%` }} /></div>
                                  </div>
                                ))}
                                <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-800">
                                  <div className="flex justify-between"><span className="font-medium text-gray-900 dark:text-gray-100">Combined Percentage</span><span className="font-bold text-gray-900 dark:text-gray-100">{combinedPct.toFixed(1)}%</span></div>
                                  <div className="mt-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5"><div className={`h-2.5 rounded-full ${getPerformanceColor(Math.round(combinedPct), 100)}`} style={{ width: `${combinedPct}%` }} /></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>); })()}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="mt-8 text-center text-xs md:text-sm text-gray-500 dark:text-gray-500/80">
          <p>Grades updated: August 10, 2025 • Transcript is official</p>
        </div>
      </div>
    </div>
  
  );
};

export default GradePage;