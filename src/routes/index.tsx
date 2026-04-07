import { createBrowserRouter } from "react-router";
import { AuthLayout } from "@/layouts/AuthLayout";
import { AppLayout } from "@/layouts/AppLayout";
import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";
import { RoleGuard } from "@/features/auth/components/RoleGuard";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { SignupForm } from "@/features/auth/components/SignupForm";
import { CompanyList } from "@/features/companies/components/CompanyList";
import { CompanyDetail } from "@/features/companies/components/CompanyDetail";
import { AgentList } from "@/features/agents/components/AgentList";
import { CustomerList } from "@/features/customers/components/CustomerList";

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: "/login", element: <LoginForm /> },
      { path: "/signup", element: <SignupForm /> },
      { path: "/signup/:token", element: <SignupForm /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <div>Dashboard — coming soon</div> },
          {
            path: "/tickets",
            element: <div>Tickets — coming soon</div>,
          },
          {
            element: <RoleGuard allowedRoles={["admin"]} />,
            children: [
              {
                path: "/companies",
                element: <CompanyList />,
              },
              {
                path: "/companies/:id",
                element: <CompanyDetail />,
              },
              {
                path: "/agents",
                element: <AgentList />,
              },
            ],
          },
          {
            element: <RoleGuard allowedRoles={["customer_manager"]} />,
            children: [
              {
                path: "/customers",
                element: <CustomerList />,
              },
            ],
          },
        ],
      },
    ],
  },
]);
