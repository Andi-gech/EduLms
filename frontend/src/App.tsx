import ModulesPage from "./pages/ModulesPage";
import CategoriesPage from "./pages/CategoriesPage";
    
import EnrollmentsPage from "./pages/EnrollmentsPage";
import ExamsPage from "./pages/ExamsPage";
import NotificationsPage from "./pages/NotificationsPage";
  

import { Route, Routes } from "react-router";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import FrontPage from "./pages/FrontPage";
import Dashboard from "./pages/Dashboard";
import AuthGuard from "./components/AuthGuard";
import UsersPage from "./pages/UsersPage";
import CoursesPage from "./pages/CoursesPage";
import DepartmentsPage from "./pages/DepartmentsPage";
import TermsPage from "./pages/TermsPage";
import Home from "./pages/Home";
import Learn from "./pages/Learn";

function App() {
  return (
    <div className="flex-1 w-screen h-full overflow-hidden ">
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
          <Route
      path="/modules"
      element={
       
          <ModulesPage />
       
      }
    />
    <Route
      path="/categories"
      element={
        
          <CategoriesPage />
      
      }
    />
    <Route 
    path="/courses/:coursename"
    element={
<Learn/>
    }/>
          <Route
            path="/users"
            element={
              <AuthGuard allowedRoles={["Registrar"]}>
                <UsersPage />
              </AuthGuard>
            }
          />
          <Route
            path="/courses"
            element={
                <CoursesPage />
             
            }
          />
          <Route
            path="/departments"
            element={
              <AuthGuard allowedRoles={["Registrar"]}>
                <DepartmentsPage />
              </AuthGuard>
            }
          />
          <Route
            path="/terms"
            element={
              <AuthGuard allowedRoles={["Registrar"]}>
                <TermsPage />
              </AuthGuard>
            }
          />
          <Route
            path="/enrollments"
            element={
              <AuthGuard allowedRoles={["student"]}>
                <EnrollmentsPage />
              </AuthGuard>
            }
          />
          <Route
            path="/exams"
            element={
         
                <ExamsPage />
           
            }
          />
          <Route
            path="/notifications"
            element={
              <AuthGuard>
                <NotificationsPage />
              </AuthGuard>
            }
          />
        
      </Routes>
    </div>
  );
}
export default App