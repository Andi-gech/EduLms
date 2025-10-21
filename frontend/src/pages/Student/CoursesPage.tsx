import {
  Breadcrumb,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbItem,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ArrowRight } from "lucide-react";
import { useEnrolledCoursesWithProgress } from "@/hooks/useApiData";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router";

interface UICourseCard {
  id: string;
  name: string;
  description: string;
  image?: string;
  progress: number; // 0-100
  teacherName: string;
  teacherPic?: string;
}

export default function CoursesPage() {
  const { data, isLoading, error } = useEnrolledCoursesWithProgress();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const courses: UICourseCard[] = (data || []).map((c: any) => {
    const courseId = typeof c.course === "string" ? c.course : c.course?._id;
    const name = c.courseName || c.course?.name || "Untitled Course";
    const description = c.course?.description || "No description provided.";
    const image = "http://localhost:8080/" + c.course?.image;
    const progressRaw =
      typeof c.progressPercent === "number" ? c.progressPercent : 0;
    const progress = Math.min(100, Math.max(0, Math.round(progressRaw)));
    const teacherName = c.course?.assignedTeacher?.fullName || "Teacher";
    const teacherPic =
      "http://localhost:8080/" + c.course?.assignedTeacher?.profilepic; // may be undefined
    return {
      id: courseId,
      name,
      description,
      image,
      progress,
      teacherName,
      teacherPic,
    };
  });

  const filtered = useMemo(() => {
    if (!query.trim()) return courses;
    const q = query.toLowerCase();
    return courses.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
    );
  }, [courses, query]);

  const showCourses = !isLoading && !error && filtered.length > 0;

  return (
    <div className="md:p-8">
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center justify-between w-full gap-2 px-4">
          <div className="flex flex-row items-center">
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">All Courses</BreadcrumbLink>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex w-full max-w-sm items-center justify-self-end gap-2">
            <Input
              type="search"
              placeholder="search your course here"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 md:p-4 pt-0">
        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
          {showCourses &&
            filtered.map((course) => (
              <div
                key={course.id}
                onClick={() => course.id && navigate(`/result/${course.id}`)}
                className="bg-muted/40 shadow-sm shadow-zinc-500 rounded-xl flex flex-col justify-between p-4 gap-2 cursor-pointer group"
              >
                <div className="font-semibold text-lg flex items-center gap-2">
                  {course.name}
                </div>
                <div className="text-sm text-muted-foreground mb-1 line-clamp-2">
                  {course.description}
                </div>
                <div className="flex flex-row justify-between items-end mt-auto">
                  <Button
                    variant="default"
                    className="bg-indigo-600 text-white hover:bg-indigo-700 hover:cursor-pointer"
                  >
                    Go To Results
                    <ArrowRight className="w-5 h-5 text-white opacity-70 group-hover:opacity-100 transition-opacity duration-200" />
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  Progress: {course.progress}%
                </div>
              </div>
            ))}
          {!isLoading && !error && filtered.length === 0 && (
            <div className="col-span-3 text-sm text-muted-foreground">
              No courses found.
            </div>
          )}
          {isLoading && (
            <div className="col-span-3 text-sm text-muted-foreground">
              Loading courses...
            </div>
          )}
          {error && !isLoading && (
            <div className="col-span-3 text-sm text-red-500">
              Failed to load courses.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
