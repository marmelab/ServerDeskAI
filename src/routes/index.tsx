import { createBrowserRouter } from "react-router";
import { AuthLayout } from "@/layouts/AuthLayout";
import { AppLayout } from "@/layouts/AppLayout";

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      {
        path: "/login",
        element: <div>Login Page</div>,
      },
      {
        path: "/signup/:token",
        element: <div>Signup Page</div>,
      },
    ],
  },
  {
    element: <AppLayout />,
    children: [
      {
        path: "/",
        element: <div>Dashboard</div>,
      },
      {
        path: "/tickets",
        element: <div>Tickets</div>,
      },
      {
        path: "/companies",
        element: <div>Companies</div>,
      },
    ],
  },
]);
