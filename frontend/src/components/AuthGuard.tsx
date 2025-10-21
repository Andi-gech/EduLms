
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { getAuth, loadAuthFromStorage } from '@/lib/auth';

interface AuthGuardProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    loadAuthFromStorage();
    const { token, role } = getAuth();
    if (!token || (allowedRoles && (!role || !allowedRoles.includes(role)))) {
      navigate('/login');
    } else {
      setChecked(true);
    }
  }, [allowedRoles, navigate]);
  if (!checked) return null; // could render spinner
  return children;
}
