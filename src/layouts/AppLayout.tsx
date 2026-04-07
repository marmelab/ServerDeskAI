import { NavLink, Outlet } from "react-router";
import { useAuthContext } from "@/features/auth/AuthProvider";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Dashboard", roles: ["admin", "agent", "customer_manager"] },
  { to: "/tickets", label: "Tickets", roles: ["admin", "agent", "customer_manager"] },
  { to: "/companies", label: "Companies", roles: ["admin"] },
  { to: "/agents", label: "Agents", roles: ["admin"] },
  { to: "/customers", label: "Customers", roles: ["customer_manager"] },
] as const;

export const AppLayout = () => {
  const { profile, user } = useAuthContext();
  const { signOut } = useAuth();

  const visibleItems = navItems.filter(
    (item) => profile && (item.roles as readonly string[]).includes(profile.role),
  );

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 flex-col border-r bg-muted/40 p-4">
        <h2 className="mb-6 text-lg font-semibold">ServerDesk</h2>
        <nav className="flex flex-1 flex-col gap-1">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t pt-4">
          <p className="mb-2 truncate text-sm text-muted-foreground">
            {user?.email}
          </p>
          <Button variant="outline" size="sm" className="w-full" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
};
