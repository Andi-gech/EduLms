
import { useEffect } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";

interface AuthGuardProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const navigate = useNavigate();
  useEffect(() => {
    const token = "token"
    const role = "student"
    if (!token || (allowedRoles && (!role || !allowedRoles.includes(role)))) {
      navigate("/login");
    }
  }, [allowedRoles, navigate]);
  return children;
}
