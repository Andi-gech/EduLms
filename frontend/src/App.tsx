
import ExamsPage from "./pages/Student/ExamsPage";
import NotificationsPage from "./pages/NotificationsPage";
  

import { Route, Routes, useLocation } from "react-router";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import FrontPage from "./pages/FrontPage";
import Dashboard from "./pages/Student/Dashboard";
import AuthGuard from "./components/AuthGuard";

import CoursesPage from "./pages/Student/CoursesPage";

import Home from "./pages/Student/Home";
import Learn from "./pages/Student/Learn";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "./components/ui/sidebar";
import { AppSidebar } from "./components/app-sidebar";
import GradePage from "./pages/Student/GradePage";
import Assignments from "./pages/Student/Assignments";
import AssignmentDetail from "./pages/Student/AssignmentDetail";
import SettingsPage from "./pages/Student/SettingsPage";
import Exams from "./pages/Student/Exam";
import DepartmentCourses from "./pages/department/DepartmentCourses";
import DepartmentOverview from "./pages/department/DepartmentOverview";
import AdminDashboard from "./pages/admin/AdminDashboard";
import CurrentCourses from "./pages/ShortTrainning/CurrentCourses";
import AssignStudent from "./pages/ShortTrainning/AssignStudent";
import Departments from "./pages/admin/Departments";
import CourseManagement from "./pages/admin/CourseManagement";
import CreateCourses from "./pages/admin/CreateCourses";
import UserManagment from "./pages/admin/UserManagment";
import UserStatistics from "./pages/admin/UserStatistics";
import GradeReports from "./pages/admin/GradeReports";
import CourseGradeDetails from "./pages/admin/CourseGradeDetails";
import Result from "./pages/Student/Result";
import CreateExam from "./pages/Teacher/CreateExam";
import EvaluateExams from "./pages/Teacher/EvaluateExams";
import UpcomingExam from "./pages/Teacher/UpcomingExam";
import ExamView from "./pages/Teacher/ExamView";
import AssignmentsManage from "./pages/Teacher/AssignmentsManage";
import AssignmentEditor from "./pages/Teacher/AssignmentEditor";
import AssignmentCreator from "./pages/Teacher/AssignmentCreator";
import AssignmentSubmissions from "./pages/Teacher/AssignmentSubmissions";
import ExamSubmissions from "./pages/Teacher/ExamSubmissions";
import ExamSubmissionsOverview from "./pages/Teacher/ExamSubmissionsOverview";
import AssignedCourse from "./pages/Teacher/AssignedCourse";
import CourseModulesManage from "./pages/Teacher/CourseModulesManage";
import TeacherOverview from "./pages/Teacher/Overview";
import ApproveContent from "./pages/department/ApproveContent";
import ApproveExams from "./pages/department/ApproveExams";
import CourseExamApproval from "./pages/department/CourseExamApproval";
import ApproveGrades from "./pages/department/ApproveGrades";


function App() {
  const location = useLocation();
  const hideSidebar = ["/login", "/signup","/"].includes(location.pathname);

  const appRoutes = (
    <Routes>
      <Route path="/" element={<FrontPage />} />
      <Route path="/home" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/dashboard"
        element={
          <AuthGuard>
            <Dashboard />
          </AuthGuard>
        }
      />
    
  <Route path="/courses/:courseId" element={<Learn />} />
    
      <Route path="/courses" element={<CoursesPage />} />
    
     
      <Route 
      path="Grade"
      element={
        <AuthGuard >
          <GradePage />
        </AuthGuard>
      }
      />
      <Route path="/exams" element={<Exams />} />
      <Route path="/exams/:id" element={<ExamsPage />} />
  <Route path="/Result/:id" element={<Result />} />
      <Route
        path="/notifications"
        element={
          <AuthGuard>
            <NotificationsPage />
          </AuthGuard>
        }
      />
  <Route path="/Assignments" element={<Assignments />} />
  <Route path="/assignments/:id" element={<AssignmentDetail />} />
  <Route path="/departmentcourses" element={<DepartmentCourses />} />
      <Route
        path="/department/overview"
        element={
          <AuthGuard>
            <DepartmentOverview />
          </AuthGuard>
        }
      />
      <Route
        path="*"
        element={
          <AuthGuard>
            <div className="flex items-center justify-center h-full">
              <h1 className="text-2xl font-bold">404 - Page Not Found</h1>
            </div>
          </AuthGuard>
        }
      />
      <Route
        path="/DepartmentOverview"
        element={
          <AuthGuard>
            <DepartmentOverview />
          </AuthGuard>
        }
      />
      <Route
        path="/settings"
        element={
          <AuthGuard>
           <SettingsPage />
          </AuthGuard>
        }
      />
      <Route
        path="/short-training/current-courses"
        element={
          <AuthGuard>
            <CurrentCourses />
          </AuthGuard>
        }
      />
      <Route
        path="/short-training/:courseId/enroll-student"
        element={
          <AuthGuard>
            <AssignStudent />
          </AuthGuard>
        }
      />
      <Route
        path="/users"
        element={
          <AuthGuard>
            <AdminDashboard />
          </AuthGuard>
        }
      />
      <Route
        path="/admin/departments"
        element={
          <AuthGuard>
            <Departments />
          </AuthGuard>
        }
      />
      <Route
        path="/admin/courses"
        element={
          <AuthGuard>
            <CourseManagement />
          </AuthGuard>
        }
      />
      <Route
        path="/admin/courses/create"
        element={
          <AuthGuard>
            <CreateCourses />
          </AuthGuard>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <AuthGuard>
            <AdminDashboard />
          </AuthGuard>
        }
      />
      <Route
        path="/admin/users"
        element={
          <AuthGuard>
            <UserManagment />
          </AuthGuard>
        }
      />
      <Route
        path="/admin/users/statistics"
        element={
          <AuthGuard>
            <UserStatistics />
          </AuthGuard>
        }
      />

      <Route
        path="/admin/grades/reports"
        element={
          <AuthGuard>
            <GradeReports />
          </AuthGuard>
        }
      />
      <Route
        path="/admin/grades/course/:courseId"
        element={
          <AuthGuard>
            <CourseGradeDetails />
          </AuthGuard>
        }
      />
      <Route
        path="/teacher/exam/create/:courseId"
        element={
          <AuthGuard>
            <CreateExam />
          </AuthGuard>
        }
      />
      <Route
        path="/teacher/exam/evaluate/:id"
        element={
          <AuthGuard>
            <EvaluateExams />
          </AuthGuard>
        }
      />
      <Route
        path="/teacher/myexam"
        element={
          <AuthGuard>
            <UpcomingExam />
          </AuthGuard>
        }
      />
      <Route
        path="/teacher/exam/view/:id"
        element={
          <AuthGuard>
            <ExamView />
          </AuthGuard>
        }
      />
      <Route
        path="/teacher/exams/submissions"
        element={<AuthGuard><ExamSubmissionsOverview /></AuthGuard>}
      />
      <Route
        path="/overview"
        element={<AuthGuard><TeacherOverview /></AuthGuard>}
      />
      <Route
        path="/teacher/exams/:examId/submissions"
        element={<AuthGuard><ExamSubmissions /></AuthGuard>}
      />
      <Route
        path="/teacher/assignedCourses"
        element={<AuthGuard><AssignedCourse /></AuthGuard>}
      />
      <Route
        path="/teacher/course/:courseId/modules"
        element={<AuthGuard><CourseModulesManage /></AuthGuard>}
      />
      <Route
        path="/teacher/assignments"
        element={
          <AuthGuard>
            <AssignmentsManage />
          </AuthGuard>
        }
      />
      <Route
        path="/teacher/assignments/:id/edit"
        element={
          <AuthGuard>
            <AssignmentEditor />
          </AuthGuard>
        }
      />
      <Route
        path="/teacher/assignments/new"
        element={
          <AuthGuard>
            <AssignmentCreator />
          </AuthGuard>
        }
      />
      <Route
        path="/teacher/assignments/:id/submissions"
        element={
          <AuthGuard>
            <AssignmentSubmissions />
          </AuthGuard>
        }
      />
      <Route
        path="/department/approve"
        element={
          <AuthGuard>
            <ApproveContent />
          </AuthGuard>
        }
      />
      <Route
        path="/department/approve/content/:courseId"
        element={
          <AuthGuard>
            <ApproveContent />
          </AuthGuard>
        }
      />
      <Route
        path="/approvecourses"
        element={
          <AuthGuard>
            <ApproveExams />
          </AuthGuard>
        }
      />
      <Route
        path="/department/approve/exams/:courseId"
        element={
          <AuthGuard>
            <CourseExamApproval />
          </AuthGuard>
        }
      />
      <Route
        path="/department/approve/grades/:courseId"
        element={
          <AuthGuard>
            <ApproveGrades />
          </AuthGuard>
        }
      />

    </Routes>
  );

  return (
    <div className="flex-1 w-screen h-full overflow-hidden ">
      {hideSidebar ? (
        <div className="min-h-screen flex flex-col">{appRoutes}</div>
      ) : (
        <SidebarProvider>
          <AppSidebar />
          <SidebarTrigger />
          <SidebarInset>{appRoutes}</SidebarInset>
        </SidebarProvider>
      )}
    </div>
  );
}
export default App