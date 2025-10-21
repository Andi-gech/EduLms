import {
  SquareTerminal,
  BookOpen,
  Settings2,
  Bot,
  Layers3,
  Users2,
  Bell,
  Building2,
  CalendarClock,
  ClipboardList,
  FolderKanban,
  Waypoints
} from "lucide-react";


export type Role =
  | "Registrar"
  | "student"
  | "teacher"
  | "short_training_office"
  | "short_training_department"
  | "department_head"
  | "department_admin";

export interface NavSubItem { title: string; url: string }
export interface NavItem {
  title: string;
  url: string; // base / default link
  icon?: any; 
  isActive?: boolean;
  items?: NavSubItem[] | null;
}


const section = (title: string, url: any, icon: any, items: NavSubItem[] | null): NavItem => ({
  title,
  url,
  icon,
  items,
});

// Shared sub groups
const learningSub = [
 
  { title: "Courses", url: "/courses" },
  { title: "Grade", url: "/Grade" },

];



const registrarAdminSub = [
  { title: "Users", url: "/users" },
  { title: "Departments", url: "/admin/departments" },

];



// Removed unused shortTrainingSub constant

// Map role to nav list
export function getNavItems(role: Role | string | null | undefined): NavItem[] {
  switch (role) {
    case "student":
      return [
        section("Dashboard",'/home', SquareTerminal, null),
        section("Learning", null, BookOpen, learningSub),
        section("Assignment", null, Bot, [
          { title: "Manage Assignments", url: "/Assignments" }
        ]),
        section("Exams", '/exams', Bot, null),

        section("Settings",'/settings', Settings2, null),
      ];
    case "teacher":
      return [
        section("Overview", "/overview", SquareTerminal,null),
        section("My Courses", null, BookOpen,[
          { title: "All Courses", url: "/teacher/assignedCourses" },
        ]),
        section("Exams", null, Bot, [
          { title: "All Exams", url: "/teacher/myexam" },
          { title: "Submissions Overview", url: "/teacher/exams/submissions" },
        ]),
        section("Assignments", null, Bot, [
          { title: "All Assignments", url: "/teacher/assignments" },
        ]),
        section("Settings",'/settings', Settings2, null),
      ];
    case "Registrar":
      return [
        section("Administration", null, Users2, registrarAdminSub),
        section("Courses", null, BookOpen, [
          { title: "All Courses", url: "/admin/courses" },
          { title: "Inactive", url: "/admin/courses/inactive" },
          { title: "Create Course", url: "/admin/courses/create" },
        ]),
        section("Users", null, CalendarClock, [
          { title: "User Statistics", url: "/admin/users/statistics" },
          { title: "All Users", url: "/admin/users" },
         
       
        ]),
        section("Grades", null, ClipboardList, [
          { title: "Reports", url: "/admin/grades/reports" },
          
         
        ]),
        section("Settings",'/settings', Settings2, null),
      ];
    case "department_head":
    case "department_admin":
      return [
        section("overview", "/department/overview", Users2, null),
        section("Manage Courses", "/departmentcourses", Building2, null),

      section("Settings",'/settings', Settings2, null),
      ];
    case "short_training_office":
    case "short_training_department":
      return [
        section("Short Training", "/short-training/current-courses", ClipboardList, null),
        
        section("Notifications", "/notifications", Bell, null),
        section("Settings",'/settings', Settings2, null),
      ];
    default:
      // Fallback minimal navigation
      return [
        section("Dashboard", null, SquareTerminal, [ { title: "Overview", url: "/home" } ]),
        section("Courses", null, BookOpen, [ { title: "Browse", url: "/courses" } ]),
        section("Settings",'/settings', Settings2, null),
      ];
  }
}

// Optionally future: derive chat rooms or contextual items per role
export function getChatRooms(role: Role | string | null | undefined) {
  // Placeholder demo data; could be fetched from API
  if (role === "student") {
    return [
      { name: "My Courses", url: "/courses", icon: FolderKanban },
      { name: "Support", url: "/support", icon: Waypoints },
    ];
  }
  if (role === "teacher") {
    return [
     ];
  }
  return [];
}
