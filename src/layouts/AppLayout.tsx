import { Outlet } from "react-router";

export const AppLayout = () => {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r bg-muted/40 p-4">
        <h2 className="text-lg font-semibold">ServerDesk</h2>
        {/* Sidebar nav will go here */}
      </aside>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
};
