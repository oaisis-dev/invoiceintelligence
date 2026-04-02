"use client";

import { useRouter } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export function AdminHeader() {
  const router = useRouter();

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border-glass bg-[var(--bg-header)] px-4 backdrop-blur-md">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 !h-4" />
      <div className="flex flex-1 items-center justify-between">
        <span className="text-sm font-medium text-[var(--text-secondary)]">
          OAISIS Platform Administration
        </span>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
}
