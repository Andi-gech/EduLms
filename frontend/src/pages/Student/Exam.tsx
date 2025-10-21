import React, { useMemo } from "react";
import { useNavigate } from "react-router";
import { useMyEnrolledExams } from "@/hooks/useApiData";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ArrowBigRight } from "lucide-react";

type SubmissionStatus = "graded" | "submitted" | "not-submitted" | "pending";
type Availability = "upcoming" | "active" | "ended";

interface Exam {
  id: string;
  course: string;
  title: string;
  startDate: string | null;
  endDate: string | null;
  availability: Availability;
  submissionStatus: SubmissionStatus;
  courseName: string;
  courseId: string;
}

interface ExamMeta {
  displayStatus: string;
  actionLabel: string;
  navigateTo: string | null;
  disabled: boolean;
}

const statusColor: Record<string, string> = {
  graded:
    "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  pending:
     "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  active:
    "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  submitted:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  "not-submitted":
    "bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300",
  upcoming:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  ended: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const getExamMeta = (exam: Exam): ExamMeta => {
  if (exam.submissionStatus === "graded") {
    return {
      displayStatus: "Graded",
      actionLabel: "View Result",
      navigateTo: `/Result/${exam.courseId}`,
      disabled: false,
    };
  }

  if (exam.submissionStatus === "pending") {
    return {
      displayStatus: "Submitted",
      actionLabel: "Pending Grade",
      navigateTo: null,
      disabled: true,
    };
  }
  if (exam.availability === "upcoming") {
    return {
      displayStatus: "Not Started",
      actionLabel: "Not Started",
      navigateTo: null,
      disabled: true,
    };
  }
  if (exam.availability === "active") {
    return {
      displayStatus: "Active",
      actionLabel: "Go to Exam",
      navigateTo: `/Exams/${exam.id}`,
      disabled: false,
    };
  }
  return {
    displayStatus: "Ended",
    actionLabel: "See Result",
    navigateTo: `/Result/${exam.id}`,
    disabled: false,
  };
};

const Exams: React.FC = () => {
  const navigate = useNavigate();
  const { data: enrolledExams, isLoading } = useMyEnrolledExams();
  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString() : "-";

  const exams: Exam[] = useMemo(() => {
    if (!enrolledExams) return [];
    return enrolledExams.map((e: any) => ({
      id: e._id,
      course:
        typeof e.course === "object" && e.course?.name
          ? e.course.name
          : e.courseName || "—",
      title: e.title || "Untitled Exam",
      startDate: e.startTime || e.examDate || null,
      endDate: e.endTime || null,
      availability: e.availability as Availability,
      submissionStatus: (e.submissionStatus ||
        "not-submitted") as SubmissionStatus,
      courseName: e.courseName || "—",
      courseId: e.courseId || "—",
    }));
  }, [enrolledExams]);

  return (
    <div className="min-h-screen px-2 py-4 md:px-4 md:py-8 transition-colors">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Exams
            </h1>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
              Manage and submit your course work
            </p>
          </div>
        </div>
        <Card className="border-none bg-background">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Current Exams</CardTitle>
            <CardDescription className="text-sm md:text-base">
              Your active course Exams & status
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-4 md:pb-6">
            {/* Mobile View */}
            <div className="block md:hidden space-y-4">
              {isLoading && (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  Loading exams...
                </div>
              )}
              {!isLoading && exams.length === 0 && (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  No exams for your enrolled courses.
                </div>
              )}
              {!isLoading &&
                exams
                  .sort((a, b) =>
                    (a.startDate || "").localeCompare(b.startDate || "")
                  )
                  .map((exam) => {
                    const meta = getExamMeta(exam);
                    const statusClass =
                      statusColor[exam.submissionStatus] ||
                      statusColor[exam.availability];
                    const shortenCourseName = (name: string) =>
                      !name
                        ? ""
                        : name.length > 20
                        ? name.slice(0, 20) + "..."
                        : name;
                    return (
                      <Card key={exam.id} className="p-3 flex flex-col gap-2 shadow-sm">
                        <div className="flex items-center gap-2 font-medium">
                          <FileText className="w-4 h-4 text-indigo-500" />
                          <span className="truncate max-w-[120px]">
                            {exam.title}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-sm">
                          <span className="font-semibold">Course:</span>{" "}
                          <span className="truncate max-w-[80px]">
                            {shortenCourseName(exam.courseName)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span>Start:</span>{" "}
                          <span>{formatDate(exam.startDate)}</span>
                          <span>End:</span>{" "}
                          <span>{formatDate(exam.endDate)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass}`}
                          >
                            {meta.displayStatus}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1"
                            disabled={meta.disabled}
                            onClick={
                              meta.navigateTo
                                ? () => navigate(meta.navigateTo!)
                                : undefined
                            }
                          >
                            {meta.actionLabel}
                            {!meta.disabled && meta.navigateTo && (
                              <ArrowBigRight className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <Table className="min-w-[600px] w-full">
                <TableCaption className="text-xs">
                  This table shows your course Exams
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%] md:w-[30%]">Title</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-6 text-sm text-muted-foreground"
                      >
                        Loading exams...
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && exams.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-6 text-sm text-muted-foreground"
                      >
                        No exams for your enrolled courses.
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading &&
                    exams
                      .sort((a, b) =>
                        (a.startDate || "").localeCompare(b.startDate || "")
                      )
                      .map((exam) => {
                        const meta = getExamMeta(exam);
                        const statusClass =
                          statusColor[exam.submissionStatus] ||
                          statusColor[exam.availability];
                        const shortenCourseName = (name: string) =>
                          !name
                            ? ""
                            : name.length > 20
                            ? name.slice(0, 20) + "..."
                            : name;
                        return (
                          <TableRow
                            key={exam.id}
                            className={
                              exam.availability === "ended"
                                ? "bg-red-50 dark:bg-red-900/10"
                                : ""
                            }
                          >
                            <TableCell className="font-medium flex items-center gap-2">
                              <FileText className="w-4 h-4 text-indigo-500" />{" "}
                              <span className="truncate max-w-[120px] md:max-w-none">
                                {exam.title}
                              </span>
                            </TableCell>
                            <TableCell className="w-[80px] md:w-[100px]">
                              <span className="truncate max-w-[80px] md:max-w-none">
                                {shortenCourseName(exam.courseName)}
                              </span>
                            </TableCell>
                            <TableCell>{formatDate(exam.startDate)}</TableCell>
                            <TableCell
                              className={
                                exam.availability === "ended"
                                  ? "text-red-600 dark:text-red-400 font-medium"
                                  : ""
                              }
                            >
                              {formatDate(exam.endDate)}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass}`}
                              >
                                {meta.displayStatus}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="gap-1"
                                disabled={meta.disabled}
                                onClick={
                                  meta.navigateTo
                                    ? () => navigate(meta.navigateTo!)
                                    : undefined
                                }
                              >
                                {meta.actionLabel}
                                {!meta.disabled && meta.navigateTo && (
                                  <ArrowBigRight className="w-4 h-4" />
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Exams;
