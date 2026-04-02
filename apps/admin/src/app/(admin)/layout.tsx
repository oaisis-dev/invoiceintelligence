export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { requirePlatformAdmin } from "@/lib/authz";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin-sidebar";
import { AdminHeader } from "@/components/admin-header";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionFromCookies();
  if (!session) {
    redirect("/login");
  }

  let isAdmin = false;
  try {
    await requirePlatformAdmin();
    isAdmin = true;
  } catch (err) {
    console.error(
      "[AdminLayout] requirePlatformAdmin failed:",
      err instanceof Error ? err.message : err
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-page)]">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--error-10)]">
            <svg
              className="h-8 w-8 text-[var(--error)]"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            Access Denied
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            You are not authorized as a platform administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AdminSidebar />
      <main className="flex min-h-svh flex-1 flex-col overflow-auto">
        <AdminHeader />
        <div
          id="main-content"
          tabIndex={-1}
          className="flex-1 bg-[var(--bg-page)] p-4 focus:outline-none sm:p-6 lg:p-8"
        >
          {children}
        </div>
      </main>
    </SidebarProvider>
  );
}
