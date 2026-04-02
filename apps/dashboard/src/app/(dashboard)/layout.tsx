import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { DashboardHeader } from "@/components/dashboard-header";
import { PageTransition } from "@/components/ui/page-transition";
import { createAdminClient } from "@/lib/supabase/admin";
import { ChatWidget } from "@/components/chat/chat-widget";
import { SubscriptionProvider } from "@/components/subscription/subscription-provider";
import { UnreadCountProvider } from "@/components/unread-count-provider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const supabase = createAdminClient();
  const { data: appUser, error } = await supabase
    .from("users")
    .select("id, org_id, is_active")
    .or(
      `external_id.eq.${userId},clerk_dev_id.eq.${userId},clerk_prod_id.eq.${userId}`
    )
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load dashboard access state: ${error.message}`);
  }

  if (!appUser?.is_active) {
    redirect("/getting-started");
  }

  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(userId);
  const activeOrgId = typeof clerkUser.publicMetadata?.org_id === "string"
    ? clerkUser.publicMetadata.org_id
    : null;

  if (activeOrgId !== appUser.org_id) {
    redirect("/getting-started");
  }

  return (
    <SubscriptionProvider>
      <SidebarProvider>
        <UnreadCountProvider>
          <AppSidebar />
          <main className="flex min-h-svh flex-1 flex-col overflow-auto">
            <DashboardHeader />
            <div
              id="main-content"
              tabIndex={-1}
              className="flex-1 bg-[var(--bg-page)] p-4 focus:outline-none sm:p-6 lg:p-8"
            >
              <PageTransition>{children}</PageTransition>
            </div>
          </main>
          <ChatWidget />
        </UnreadCountProvider>
      </SidebarProvider>
    </SubscriptionProvider>
  );
}
