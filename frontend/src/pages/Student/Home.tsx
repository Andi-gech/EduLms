import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEnrolledCoursesWithProgress } from "@/hooks/useApiData";

// Local UI shape (minimal) mirroring prior card fields
interface UICourseCard {
  id: string;
  name: string;
  description: string;
  image?: string;
  progress: number; // 0-100
  teacherName: string;
  teacherPic?: string;
}

export default function Home() {
  const { data, isLoading, error } = useEnrolledCoursesWithProgress();
  const navigate = useNavigate();

  const courses: UICourseCard[] = (data || []).map((c: any) => {
    // c is the enrollment document. We need the underlying course _id for navigation / API calls.
    // Enrollment doc _id is not the course id; use populated course._id or raw course string
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

  const showCourses = !isLoading && !error && courses.length > 0;

  return (
    <div>
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
                  <BreadcrumbLink href="#">
                    Your current Enrollment
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex w-full max-w-sm items-center justify-self-end gap-2">
            <Input
              disabled
              type="search"
              placeholder="search your course here"
            />
          </div>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
          {showCourses &&
            courses.slice(0, 3).map((course) => (
              <div
                key={course.id}
                onClick={() => course.id && navigate(`/courses/${course.id}`)}
                className="bg-muted/40 shadow-sm shadow-zinc-500 rounded-xl flex flex-col justify-between p-4 gap-2 cursor-pointer group"
              >
                <img
                  src={course.image}
                  alt={course.image}
                  className="w-full h-24 object-cover rounded-lg mb-2"
                />
                <div className="font-semibold text-lg flex items-center gap-2">
                  {course.name}
                </div>
                <div className="text-sm text-muted-foreground mb-1 line-clamp-2">
                  {course.description}
                </div>
                <div className="flex flex-row justify-between items-end mt-auto">
                  <div className="flex items-center gap-2">
                    {course.teacherPic ? (
                      <img
                        src={course.teacherPic}
                        alt={course.teacherName}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                        {course.teacherName?.[0] || "T"}
                      </div>
                    )}
                    <span className="text-xs">{course.teacherName}</span>
                  </div>
                  <Button
                    variant="default"
                    size={"icon"}
                    className="bg-indigo-600 hover:bg-indigo-700 hover:cursor-pointer"
                  >
                    <ArrowRight className="w-5 h-5 text-white opacity-70 group-hover:opacity-100 transition-opacity duration-200" />
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  Progress: {course.progress}%
                </div>
              </div>
            ))}
          {!isLoading && !error && courses.length === 0 && (
            <div className="col-span-3 text-sm text-muted-foreground">
              No enrollments found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
