import { Navigate, Outlet } from "react-router";
import { useAuthContext } from "../AuthProvider";
import type { AppRole } from "@/lib/types";

type RoleGuardProps = {
  allowedRoles: AppRole[];
};

export const RoleGuard = ({ allowedRoles }: RoleGuardProps) => {
  const { profile, loading } = useAuthContext();

  if (loading || !profile) {
    return null;
  }

  if (!allowedRoles.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
