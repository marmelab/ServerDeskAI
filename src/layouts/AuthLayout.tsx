import { Outlet } from "react-router";

export const AuthLayout = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="w-full max-w-md p-6">
        <Outlet />
      </div>
    </div>
  );
};
