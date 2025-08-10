import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";

export default function Dashboard() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Dashboard ({role})</h1>
      <div className="space-x-2">
        <Button onClick={() => navigate("/profile")}>Profile</Button>
        {role === "Registrar" && <Button onClick={() => navigate("/users")}>Manage Users</Button>}
        {role === "Registrar" && <Button onClick={() => navigate("/departments")}>Departments</Button>}
        {role === "Registrar" && <Button onClick={() => navigate("/terms")}>Terms</Button>}
        {(role === "Registrar" || role === "teacher" || role === "department_admin") && (
          <Button onClick={() => navigate("/courses")}>Courses</Button>
        )}
        {role === "student" && <Button onClick={() => navigate("/enrollments")}>My Enrollments</Button>}
        {role === "teacher" && <Button onClick={() => navigate("/exams")}>Exams</Button>}
        <Button onClick={() => navigate("/notifications")}>Notifications</Button>
      </div>
    </div>
  );
}
